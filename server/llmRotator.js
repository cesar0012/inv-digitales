/**
 * ============================================================================
 * LLM ROTATOR — rotación automática de modelos gratuitos (OpenRouter + NVIDIA)
 * ============================================================================
 * Implementación del blueprint de LLM_ROTATOR_GUIDE.md como servicio singleton
 * independiente (ningún proceso existente lo usa; solo el Generador de Módulos).
 *
 *   - Catálogo VIVO: OpenRouter (endpoint público) + NVIDIA NIM (/models con
 *     la key del admin), TTL 10 min, fallback a lista curada mínima.
 *   - Ranking en 2 capas: heurística (familia + contexto) y benchmarks reales
 *     (dominantes si son recientes).
 *   - Clasificación de fallos: QUOTA (cooldown 30 min) vs DEAD (24 h) vs OTHER
 *     (sin rotación). Quota gana si el texto contiene ambas.
 *   - Misión: set de modelos muertos excluidos en TODOS los pasos de una
 *     generación (nunca re-spawnear un modelo muerto conocido).
 *   - Wrapper executeWithRotation con presupuestos separados (dead-skips vs
 *     quota-retries) y lane-widening cuando toda la lane está en cooldown.
 *
 * Estado persistido en server/data/rotator_state.json (sobrevive reinicios).
 * API keys en admin_config (openrouter_api_key / nvidia_api_key), leídas al
 * momento para que la UI de keys aplique sin reiniciar.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, 'data', 'rotator_state.json');

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    modelsUrl: 'https://openrouter.ai/api/v1/models', // público, sin auth
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    auth: (key) => ({ Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://generador.invitacionesmodernas.com', 'X-Title': 'Invitaciones Modernas' })
  },
  nvidia: {
    name: 'NVIDIA NIM',
    modelsUrl: 'https://integrate.api.nvidia.com/v1/models',
    chatUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    auth: (key) => ({ Authorization: `Bearer ${key}`, Accept: 'application/json' })
  }
};

const CONFIG = {
  catalogTtlMs: 10 * 60 * 1000,
  // QUOTA cooldown CORTO: los rate limits free (429) se reciclan en 1-2 min
  // y en OpenRouter aplican a TODOS los :free con la misma key — 30 min
  // habría dejado el sistema parado media hora por un pico de 429.
  quotaCooldownMs: 3 * 60 * 1000,
  deadCooldownMs: 24 * 60 * 60 * 1000,
  maxCatalog: 30,
  // Timeout por FASE: respuestas cortas (brief/crítica) fallan rápido; la
  // generación de HTML largo en free tier puede tardar varios minutos.
  shortCallTimeoutMs: parseInt(process.env.ROTATOR_SHORT_TIMEOUT_MS || '60000', 10),
  longCallTimeoutMs: parseInt(process.env.ROTATOR_CALL_TIMEOUT_MS || '180000', 10),
  // El premium es EL modelo elegido (pago): los razonadores como GLM tardan
  // varios minutos en generaciones largas — no hay que descartarlos rápido.
  premiumShortTimeoutMs: parseInt(process.env.ROTATOR_PREMIUM_SHORT_TIMEOUT_MS || '180000', 10),
  premiumLongTimeoutMs: parseInt(process.env.ROTATOR_PREMIUM_LONG_TIMEOUT_MS || '480000', 10),
  // Cuando TODO el catálogo está en cooldown: esperar (batch en background)
  // hasta MAX_COOLDOWN_WAIT al modelo de recuperación más próxima; si falta
  // más, error claro para que el lote lo registre y siga con el próximo set.
  maxCooldownWaitMs: 15 * 60 * 1000,
  // La rotación NO se rinde por presupuesto: se agota solo cuando no queda
  // ningún modelo vivo en el catálogo (límite de seguridad anti-bucle).
  maxDeadSkips: 40,
  maxQuotaRetries: 40,
  maxRotationLoop: 60,
  benchFreshMs: 48 * 60 * 60 * 1000
};

// --- Clasificación de errores (§7 de la guía; quota se evalúa PRIMERO) ---
const QUOTA_RE = /\b429\b|\b503\b|rate.?limit|too many requests|quota|insufficient|exceeded your|out of (free )?credits|no more free|\bthrottl|overloaded|temporarily unavailable|service unavailable|try again later|respuesta sin contenido|empty (response|content)|no content|timeout|timed?\s*out|abort|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EPIPE|network|fetch failed|socket hang up/i;
const DEAD_RE = /\b404\b|\b403\b|not found|does not exist|no longer (available|exists)|unavailable|invalid model|unknown model|model .* not (available|supported)|only available to|forbidden|not (authorized|permitted|entitled)/i;

export const isQuotaError = (text) => QUOTA_RE.test(String(text || ''));
export const isModelUnavailableError = (text) => !isQuotaError(text) && DEAD_RE.test(String(text || ''));

// --- Exclusiones de catálogo (no-chat y org-prefix que romperían ids) ---
const NON_CHAT_RE = /embed|rerank|guard|safety|moderation|video|audio|tts|ocr|clip|transcri|whisper|lyria|image|flux|diffusion|speech|voice/i;
const STRIP_PREFIX_RE = /^(nvidia|moonshot|groq|ollama)\//i;

// --- Lanes (§5) ---
const laneOf = (modelId) => {
  const id = String(modelId).toLowerCase();
  const lanes = ['general'];
  if (/cod(e|er|ing)|codestral|devstral|starcoder|codegemma/.test(id)) lanes.push('coding');
  if (/r1|thinking|reason|ultra|-pro|max|opus|omega|plus/.test(id)) lanes.push('reasoning');
  if (/\bvl\b|vision|omni|multimodal|llava/.test(id)) lanes.push('vision');
  return lanes;
};

// --- Ranking heurístico (§5) ---
const FAMILY_BONUS = [
  [/deepseek/, 100], [/qwen|^glm|\/glm/, 82], [/kimi|moonshot/, 78], [/gpt-oss/, 76],
  [/llama/, 72], [/nemotron/, 66], [/gemma/, 62], [/mistral|mixtral|magistral/, 58], [/cohere/, 40]
];
function heuristicScore(entry) {
  const id = entry.model.toLowerCase();
  let family = 0;
  for (const [re, bonus] of FAMILY_BONUS) if (re.test(id)) { family = bonus; break; }
  const ctx = Math.min((entry.context_length || 0) / 20000, 30);
  let score = family + ctx;
  // Catálogo NVIDIA lista muchos modelos NO servibles con la key free (404) o
  // colgados (timeout): dampening — que un NVIDIA demuestre con benchmarks
  // que sirve antes de adelantar a los OpenRouter free verificados.
  if (entry.provider === 'nvidia') score *= 0.85;
  if (id === 'openrouter/free') score = 20; // auto-router: último recurso
  return score;
}

// --- Estado persistido ---
function loadState() {
  try {
    if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch (e) {
    console.warn('[ROTATOR] estado corrupto, empezando limpio:', e.message);
  }
  return { current: null, entries: {} };
}
function saveState() {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn('[ROTATOR] no se pudo persistir estado:', e.message);
  }
}

const state = loadState();
let catalog = null;            // [{provider, model, context_length, lanes, score}]
let catalogFetchedAt = 0;
let catalogPromise = null;     // deduplica refresh concurrentes
let benchRunning = false;
const catalogErrors = {};      // último error de fetch por proveedor (visible en la UI)

// Fallback curado mínimo (§4: si el fetch vivo nunca funcionó)
const FALLBACK_CATALOG = [
  { provider: 'openrouter', model: 'deepseek/deepseek-chat-v3-0324:free', context_length: 64000 },
  { provider: 'openrouter', model: 'qwen/qwen3-coder:free', context_length: 262000 },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', context_length: 64000 },
  { provider: 'openrouter', model: 'google/gemma-3-27b-it:free', context_length: 96000 },
  { provider: 'openrouter', model: 'openai/gpt-oss-120b:free', context_length: 128000 },
  { provider: 'openrouter', model: 'openrouter/free', context_length: 8192 }
];

function getKeys() {
  try {
    const row = db.prepare('SELECT openrouter_api_key, nvidia_api_key FROM admin_config WHERE id = 1').get();
    return {
      openrouter: (row?.openrouter_api_key || '').trim(),
      nvidia: (row?.nvidia_api_key || '').trim()
    };
  } catch {
    return { openrouter: '', nvidia: '' };
  }
}

/**
 * Allowlist manual del admin (admin_config.rotator_allowed_models, JSON array
 * de "provider::model"). Si está definida y NO vacía, el rotator SOLO usa
 * esos modelos — en generación de módulos y todo lo que use el rotator.
 */
function getAllowedModels() {
  try {
    const row = db.prepare('SELECT rotator_allowed_models FROM admin_config WHERE id = 1').get();
    const parsed = row?.rotator_allowed_models ? JSON.parse(row.rotator_allowed_models) : null;
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string' && k.includes('::')) : null;
  } catch {
    return null;
  }
}

async function fetchJson(url, headers = {}, timeoutMs = 20000) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Catálogo vivo (§4). Deduplicado, TTL, mantiene el anterior ante fallo. */
async function refreshCatalog({ force = false } = {}) {
  if (!force && catalog && Date.now() - catalogFetchedAt < CONFIG.catalogTtlMs) return catalog;
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    const merged = [];
    try {
      const json = await fetchJson(PROVIDERS.openrouter.modelsUrl);
      const free = (json.data || []).filter((m) =>
        m.id?.endsWith(':free') &&
        m.pricing?.prompt === '0' && m.pricing?.completion === '0' &&
        !NON_CHAT_RE.test(m.id) && !STRIP_PREFIX_RE.test(m.id)
      );
      for (const m of free) merged.push({ provider: 'openrouter', model: m.id, context_length: m.context_length || 0 });
      delete catalogErrors.openrouter;
      console.log(`[ROTATOR] catálogo OpenRouter: ${free.length} modelos free`);
    } catch (e) {
      catalogErrors.openrouter = e.message;
      console.warn('[ROTATOR] fallo catálogo OpenRouter:', e.message);
    }
    const keys = getKeys();
    if (keys.nvidia) {
      try {
        const json = await fetchJson(PROVIDERS.nvidia.modelsUrl, PROVIDERS.nvidia.auth(keys.nvidia));
        const models = (json.data || []).filter((m) => typeof m.id === 'string' && !NON_CHAT_RE.test(m.id));
        for (const m of models) merged.push({ provider: 'nvidia', model: m.id, context_length: m.context_length || 0 });
        delete catalogErrors.nvidia;
        console.log(`[ROTATOR] catálogo NVIDIA: ${models.length} modelos`);
      } catch (e) {
        catalogErrors.nvidia = e.message;
        console.warn('[ROTATOR] fallo catálogo NVIDIA (revisa la API key):', e.message);
      }
    } else {
      catalogErrors.nvidia = 'sin API key configurada';
      console.log('[ROTATOR] NVIDIA sin API key: guarda la clave (sk/nvapi) para incluir también sus modelos');
    }

    let next = merged;
    if (next.length === 0) {
      console.warn('[ROTATOR] sin catálogo vivo, usando fallback curado');
      next = [...FALLBACK_CATALOG];
    }
    // Rankear y acotar
    next = next
      .map((e) => ({ ...e, lanes: laneOf(e.model), heuristic: heuristicScore(e) }))
      .sort((a, b) => b.heuristic - a.heuristic)
      .slice(0, CONFIG.maxCatalog);

    catalog = next;
    catalogFetchedAt = Date.now();
    return catalog;
  })();

  try {
    return await catalogPromise;
  } finally {
    catalogPromise = null;
  }
}

function entryState(modelKey) {
  if (!state.entries[modelKey]) {
    state.entries[modelKey] = { failures: 0, successes: 0, cooldown_until: 0, last_used: null, last_error: null, bench: null };
  }
  return state.entries[modelKey];
}

/** resolve() — síncrono y barato (§3). Excluye sin-key, cooling y exclude[].
 * Con allowlist definida, el pool se restringe a esos modelos (incluidos
 * modelos escritos a mano que no aparezcan en el catálogo: entrada sintética). */
function resolve({ lane = 'general', exclude = [] } = {}) {
  if (!catalog || catalog.length === 0) return null;
  const keys = getKeys();
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);
  let pool = catalog;
  const allowed = getAllowedModels();
  if (allowed && allowed.length > 0) {
    const allowedSet = new Set(allowed.map((k) => k.toLowerCase()));
    const allowedOrder = new Map(allowed.map((k, i) => [k.toLowerCase(), i]));
    pool = catalog.filter((c) => allowedSet.has(`${c.provider}::${c.model}`.toLowerCase()));
    for (const key of allowedSet) {
      const already = pool.some((c) => `${c.provider}::${c.model}`.toLowerCase() === key);
      if (!already) {
        const [prov, ...rest] = key.split('::');
        const model = rest.join('::');
        if (PROVIDERS[prov] && model) {
          // Modelo manual no listado en el catálogo: se intenta igual (si el
          // proveedor no lo sirve, el dead-detection lo enfría solo).
          pool.push({ provider: prov, model, context_length: 0, lanes: laneOf(model), heuristic: 10 });
        }
      }
    }
    if (pool.length === 0) return null;
    // PRIORIDAD POR ORDEN de la lista del admin: el primer modelo de la
    // allowlist es el preferido; si está en cooldown/falló, el siguiente.
    pool = [...pool].sort((a, b) =>
      (allowedOrder.get(`${a.provider}::${a.model}`.toLowerCase()) ?? 999) -
      (allowedOrder.get(`${b.provider}::${b.model}`.toLowerCase()) ?? 999));
  }
  let candidates = pool.filter((c) =>
    keys[c.provider] && c.lanes.includes(lane) && !excludeSet.has(`${c.provider}::${c.model}`)
  );
  // Lane-widening: si la lane pedida (p. ej. 'coding', asignada por heurística
  // de NOMBRE de modelo) no tiene ningún candidato — típico con allowlist de
  // modelos chat — se amplía a 'general' en vez de fallar con "sin candidatos".
  let laneWidened = false;
  if (candidates.length === 0 && lane !== 'general') {
    candidates = pool.filter((c) =>
      keys[c.provider] && c.lanes.includes('general') && !excludeSet.has(`${c.provider}::${c.model}`)
    );
    laneWidened = true;
    if (candidates.length > 0) {
      console.warn(`[ROTATOR] lane "${lane}" sin candidatos — ampliada a "general" (${candidates.length} modelos)`);
    }
  }
  if (candidates.length === 0) return null;

  const now = Date.now();
  const available = candidates.filter((c) => (entryState(`${c.provider}::${c.model}`).cooldown_until || 0) <= now);
  const finalPool = available.length > 0 ? available : candidates; // si TODO está en cooldown → flag fallback
  // Con allowlist, el ORDEN del admin manda (ya viene ordenado en el pool);
  // sin allowlist, benchmarks/heurística rankean.
  const ranked = (allowed && allowed.length > 0)
    ? [...finalPool]
    : [...finalPool].sort((a, b) => benchScore(b) - benchScore(a));
  const chosen = ranked[0];
  const modelKey = `${chosen.provider}::${chosen.model}`;
  return {
    modelKey,
    provider: chosen.provider,
    model: chosen.model,
    api_key: keys[chosen.provider],
    api_base: PROVIDERS[chosen.provider].chatUrl,
    fallback: available.length === 0,
    laneWidened
  };
}

const benchScore = (c) => {
  const st = state.entries[`${c.provider}::${c.model}`];
  if (st?.bench?.at && Date.now() - new Date(st.bench.at).getTime() < CONFIG.benchFreshMs) {
    return 10000 + (st.bench.score || 0);
  }
  return c.heuristic || 0;
};

/** Candidato con el cooldown MÁS CORTO (cuando todo el catálogo está en
 * cooldown: mejor lanzar al que recupera en minutos que al de mejor score
 * con 23 h de espera). */
function soonestRecovery(exclude) {
  const wait = soonestCooldownWait(exclude);
  if (!wait) return null;
  const [provider, ...rest] = wait.modelKey.split('::');
  const keys = getKeys();
  return {
    modelKey: wait.modelKey,
    provider,
    model: rest.join('::'),
    api_key: keys[provider],
    api_base: PROVIDERS[provider].chatUrl,
    fallback: true
  };
}

/** Cuánto falta (ms) para que recupere el modelo con el cooldown más corto. */
function soonestCooldownWait(exclude) {
  if (!catalog) return null;
  const keys = getKeys();
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);
  const pool = catalog.filter((c) => keys[c.provider] && !excludeSet.has(`${c.provider}::${c.model}`));
  if (pool.length === 0) return null;
  let best = null;
  for (const c of pool) {
    const until = entryState(`${c.provider}::${c.model}`).cooldown_until || 0;
    if (!best || until < best.until) {
      best = { modelKey: `${c.provider}::${c.model}`, until };
    }
  }
  return { modelKey: best.modelKey, ms: Math.max(0, best.until - Date.now()) };
}

function reportFailure(modelKey, rawErrorText) {
  const st = entryState(modelKey);
  st.failures += 1;
  st.last_error = String(rawErrorText || '').slice(0, 300);
  st.last_used = new Date().toISOString();
  const dead = isModelUnavailableError(rawErrorText) && !isQuotaError(rawErrorText);
  st.cooldown_until = Date.now() + (dead ? CONFIG.deadCooldownMs : CONFIG.quotaCooldownMs);
  saveState();
  console.warn(`[ROTATOR] ${modelKey} → cooldown ${dead ? '24h (muerto)' : `${Math.round(CONFIG.quotaCooldownMs / 60000)}min (quota/transitorio)`}: ${st.last_error.slice(0, 90)}`);
  return { dead };
}

function reportSuccess(modelKey) {
  const st = entryState(modelKey);
  st.successes += 1;
  st.cooldown_until = 0;
  st.last_used = new Date().toISOString();
  state.current = { modelKey, provider: modelKey.split('::')[0], model: modelKey.split('::').slice(1).join('::') };
  saveState();
}

function forceRotate() {
  if (state.current?.modelKey) {
    entryState(state.current.modelKey).cooldown_until = Date.now() + CONFIG.quotaCooldownMs;
    saveState();
  }
  return resolve({});
}

function resetCooldowns() {
  for (const st of Object.values(state.entries)) st.cooldown_until = 0;
  saveState();
}

/** Llamada cruda a un modelo resuelto (chat completions OpenAI-compatible).
 * - Timeout por fase: corto para brief/crítica, largo para generación.
 * - Retry adaptativo de max_tokens (arriba si el razonador se quedó corto,
 *   abajo si el modelo limita el output). */
async function invokeLLM(resolved, { system, prompt, temperature = 0.8, maxTokens = 8000, _tokenRetry = 0 }) {
  // Premium = modelo pago del admin (uno solo, confiable): merece esperar
  // bastante más que a un free colgado antes de descartar la llamada.
  const timeoutMs = resolved.provider === 'premium'
    ? (maxTokens >= 4000 ? CONFIG.premiumLongTimeoutMs : CONFIG.premiumShortTimeoutMs)
    : (maxTokens >= 4000 ? CONFIG.longCallTimeoutMs : CONFIG.shortCallTimeoutMs);
    const call = async (mt) => {
    // 'premium' = LLM propio OpenAI-compatible (base_url + key): auth Bearer directo.
    const authHeaders = resolved.provider === 'premium'
      ? { Authorization: `Bearer ${resolved.api_key}` }
      : PROVIDERS[resolved.provider].auth(resolved.api_key);
    const headers = { 'Content-Type': 'application/json', ...authHeaders };
    const body = {
      model: resolved.model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: mt,
      stream: false,
      // GLM (Z.ai) en modo razonador quema el budget en "razonamiento" y
      // devuelve content vacío con finish_reason=length: para generación de
      // HTML el razonamiento no aporta — desactivarlo. (Campo oficial de Z.ai;
      // otros endpoints OpenAI-compat ignoran campos extra.)
      ...(resolved.provider === 'premium' && /glm/i.test(resolved.model)
        ? { thinking: { type: 'disabled' } }
        : {})
    };
    const res = await fetch(resolved.api_base, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const json = await res.json().catch(() => ({}));
    // OpenRouter a veces responde 200 con el error DENTRO del body (típico de
    // free tier saturado): tratarlo como error para que la rotación actúe.
    if (json.error) {
      const msg = json.error.message || JSON.stringify(json.error);
      throw Object.assign(new Error(`${msg} (code ${json.error.code ?? '?'})`), { status: json.error.code || res.status });
    }
    if (!res.ok) {
      throw Object.assign(new Error(json?.error?.message || `HTTP ${res.status}`), { status: res.status });
    }
    const content = json.choices?.[0]?.message?.content;
    const finish = json.choices?.[0]?.finish_reason;
    if ((!content || !String(content).trim()) && finish === 'length' && _tokenRetry < 2 && mt < 16384) {
      // Razonador que quemó TODO el budget en razonamiento: MÁS tokens, no menos.
      const next = Math.min(16384, Math.ceil(mt * 1.5));
      console.warn(`[ROTATOR] ${resolved.modelKey}: finish_reason=length sin contenido — reintentando con ${next} tokens`);
      return invokeLLM(resolved, { system, prompt, temperature, maxTokens: next, _tokenRetry: _tokenRetry + 1 });
    }
    if (!content || !String(content).trim()) {
      throw new Error(`respuesta sin contenido${finish ? ` (finish_reason: ${finish})` : ''}`);
    }
    return content;
  };
  try {
    return await call(maxTokens);
  } catch (error) {
    if (_tokenRetry === 0 && /max_tokens|too large|larger than|exceeds the model/i.test(String(error.message))) {
      console.warn(`[ROTATOR] ${resolved.modelKey}: max_tokens ${maxTokens} rechazado, reintentando con ${Math.floor(maxTokens / 2)}`);
      return call(Math.max(1024, Math.floor(maxTokens / 2)));
    }
    throw error;
  }
}

/**
 * Misión (§8): encapsula un trabajo multi-paso. Los modelos que fallan quedan
 * excluidos del resto de la misión; presupuestos separados para dead/quota;
 * lane-widening si toda la lane está en cooldown.
 */
export function createMission(lane = 'general') {
  const dead = new Set();
  let quotaRetries = 0;

  return {
    /** Ejecuta una tarea con rotación. Devuelve {content, modelKey} o lanza. */
    async call(task) {
      let deadSkips = 0;
      let loops = 0;
      for (;;) {
        loops += 1;
        if (loops > CONFIG.maxRotationLoop) {
          throw new Error(`Rotator: límite de seguridad de ${CONFIG.maxRotationLoop} rotaciones alcanzado (catálogo agotado para esta tarea)`);
        }
        await refreshCatalog();
        let resolved = resolve({ lane, exclude: [...dead] });
        if (!resolved) throw new Error('Rotator sin candidatos: configura API keys de OpenRouter/NVIDIA');
        if (resolved.fallback) {
          const wider = resolve({ exclude: [...dead] }); // lane-widening
          if (wider && !wider.fallback) {
            resolved = wider;
          } else {
            // Todo el catálogo en cooldown (típico: 429 de OpenRouter aplica a
            // todos los :free con la misma key). Para un lote en background lo
            // correcto es ESPERAR al modelo de recuperación más próxima.
            const wait = soonestCooldownWait([...dead]);
            if (wait && wait.ms > 0) {
              if (wait.ms <= CONFIG.maxCooldownWaitMs) {
                const mins = (wait.ms / 60000).toFixed(1);
                console.warn(`[ROTATOR] ⏳ todos los modelos en cooldown — esperando ${mins} min a que recupere ${wait.modelKey}`);
                await new Promise((r) => setTimeout(r, wait.ms + 1000));
              } else {
                throw new Error(`todos los modelos en cooldown (el primero recupera en ${(wait.ms / 60000).toFixed(0)} min: ${wait.modelKey}). Espera o amplía la allowlist.`);
              }
            }
            resolved = resolve({ lane, exclude: [...dead] }) || resolve({ exclude: [...dead] });
            if (!resolved) continue;
          }
        }
        console.log(`[ROTATOR] → ${resolved.modelKey} (${task.maxTokens <= 900 ? 'crítica' : task.maxTokens <= 1400 ? 'brief' : 'generación'})`);
        try {
          const content = await invokeLLM(resolved, task);
          reportSuccess(resolved.modelKey);
          return { content, modelKey: resolved.modelKey };
        } catch (error) {
          const text = `${error.message}`;
          const quota = isQuotaError(text);
          const isDead = isModelUnavailableError(text);
          if (isDead && !quota && deadSkips < CONFIG.maxDeadSkips) {
            reportFailure(resolved.modelKey, text);
            dead.add(resolved.modelKey);
            deadSkips += 1;
            continue;
          }
          if ((quota || isDead) && quotaRetries < CONFIG.maxQuotaRetries) {
            reportFailure(resolved.modelKey, text);
            dead.add(resolved.modelKey);
            quotaRetries += 1;
            continue;
          }
          // Presupuesto agotado pero ¿queda algún modelo vivo sin probar?
          if (quota || isDead) {
            const next = resolve({ lane, exclude: [...dead] });
            if (next) {
              console.warn(`[ROTATOR] presupuesto de rotación excedido pero quedan modelos — continuando`);
              reportFailure(resolved.modelKey, text);
              dead.add(resolved.modelKey);
              continue;
            }
          }
          throw error; // fallo no rotable (bug de prompt, etc.) o catálogo agotado
        }
      }
    },
    /** Fuerza exclusión manual (p. ej. diversidad entre reintentos de calidad). */
    excludeModel(modelKey) { dead.add(modelKey); },
    deadModels: () => [...dead]
  };
}

/** Benchmarks (§6): probes reales secuenciales sobre el top N. */
async function runBenchmarks({ limit = 5 } = {}) {
  if (benchRunning) return { started: false, reason: 'ya está corriendo' };
  benchRunning = true;
  (async () => {
    try {
      const cat = await refreshCatalog({ force: true });
      const keys = getKeys();
      const top = cat.filter((c) => keys[c.provider]).slice(0, limit);
      for (const c of top) {
        const modelKey = `${c.provider}::${c.model}`;
        const t0 = Date.now();
        let coding = 0, reasoning = 0;
        try {
          const code = await invokeLLM(
            { provider: c.provider, model: c.model, api_key: keys[c.provider], api_base: PROVIDERS[c.provider].chatUrl },
            { prompt: 'Write a JavaScript function isPalindrome(s) that ignores case and non-alphanumeric characters. Reply with ONLY the code.', temperature: 0, maxTokens: 400 }
          );
          if (/function\s+ispalindrome/i.test(code) && /(tolowercase|replace|reverse|join)/i.test(code)) coding = 60;
          const math = await invokeLLM(
            { provider: c.provider, model: c.model, api_key: keys[c.provider], api_base: PROVIDERS[c.provider].chatUrl },
            { prompt: 'How much is 17*23? Answer with the number only.', temperature: 0, maxTokens: 20 }
          );
          if (/391/.test(math)) reasoning = 30;
        } catch { /* modelo no servible: bench 0 */ }
        const latencyMs = Date.now() - t0;
        const score = coding + reasoning + Math.max(0, 10 - latencyMs / 6000);
        entryState(modelKey).bench = { coding: coding > 0, reasoning: reasoning > 0, latencyMs, score: Math.round(score), at: new Date().toISOString() };
        saveState();
        console.log(`[ROTATOR] bench ${modelKey}: ${Math.round(score)} pts (${latencyMs}ms)`);
      }
    } finally {
      benchRunning = false;
    }
  })();
  return { started: true };
}

function getStatus() {
  const keys = getKeys();
  const now = Date.now();
  const premium = getPremiumConfig();
  return {
    current: state.current,
    catalogErrors: { ...catalogErrors },
    allowedModels: getAllowedModels() || [],
    premium: {
      enabled: premium.enabled,
      configured: !!(premium.baseUrl && premium.apiKey && premium.model),
      baseUrl: premium.baseUrl,
      model: premium.model,
      active: !!(premium.enabled && premium.baseUrl && premium.apiKey && premium.model && Date.now() >= premiumFatal.until),
      suspendedUntil: premiumFatal.until || null,
      lastFatalError: premiumFatal.error || null
    },
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([id, p]) => [id, { name: p.name, hasKey: !!keys[id] }])),
    catalog: (catalog || []).map((c) => {
      const st = state.entries[`${c.provider}::${c.model}`] || {};
      return {
        modelKey: `${c.provider}::${c.model}`,
        provider: c.provider,
        model: c.model,
        lanes: c.lanes,
        score: Math.round(benchScore(c)),
        available: (st.cooldown_until || 0) <= now,
        cooldown_until: st.cooldown_until || 0,
        successes: st.successes || 0,
        failures: st.failures || 0,
        bench: st.bench || null
      };
    }),
    catalogAgeMs: catalog ? now - catalogFetchedAt : null,
    benchmarkRunning: benchRunning
  };
}

/** Estado interno de un modelKey arbitrario (depuración/tests). */
function getEntry(modelKey) {
  const st = state.entries[modelKey];
  if (!st) return { failures: 0, successes: 0, cooldown_until: 0, last_used: null, last_error: null, bench: null };
  return { ...st };
}

export const llmRotator = {
  resolve, refreshCatalog, reportFailure, reportSuccess,
  forceRotate, resetCooldowns, runBenchmarks, getStatus, createMission, getEntry,
  isPremiumConfigured, createPremiumMission, createConfiguredMission, clearPremiumFatal
};

// ----------------------------------------------------------------------------
// LLM PREMIUM directo (OpenAI-compatible): base_url + api_key + modelo.
// Ej.: Z.ai GLM — base_url https://api.z.ai/api/paas/v4, modelo glm-5.3.
// Es una "misión" con la misma interfaz del rotator: el generador no cambia.
// Si el premium falla, el servicio degrada al rotator (nunca se rinde).
// ----------------------------------------------------------------------------
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

export function getPremiumConfig() {
  try {
    const row = db.prepare('SELECT premium_llm_enabled, premium_llm_base_url, premium_llm_api_key, premium_llm_model FROM admin_config WHERE id = 1').get();
    return {
      enabled: row?.premium_llm_enabled === 1,
      baseUrl: (row?.premium_llm_base_url || '').trim(),
      apiKey: (row?.premium_llm_api_key || '').trim(),
      model: (row?.premium_llm_model || '').trim()
    };
  } catch {
    return { enabled: false, baseUrl: '', apiKey: '', model: '' };
  }
}

/**
 * Errores FATALES de cuenta premium (saldo/agotamiento/key sin permiso): no
 * tienen sentido reintentar cada 2 s ni por cada módulo del lote. Al
 * detectarse, el premium queda suspendido PREMIUM_FATAL_MS para TODO el
 * proceso y la generación cae al rotator de inmediato. El status expone el
 * error para que la UI se lo muestre al admin (p. ej. recargar la cuenta).
 */
const PREMIUM_FATAL_MS = 10 * 60 * 1000;
const PREMIUM_FATAL_RE = /insufficient balance|no resource package|please recharge|quota.*exceed|invalid api key|unauthorized|\b401\b|\b403\b/i;
const premiumFatal = { until: 0, error: '' };

export function clearPremiumFatal() {
  premiumFatal.until = 0;
  premiumFatal.error = '';
}

export function isPremiumConfigured() {
  const c = getPremiumConfig();
  return !!(c.enabled && c.baseUrl && c.apiKey && c.model && Date.now() >= premiumFatal.until);
}

export function createPremiumMission(cfg = null) {
  const c = cfg || getPremiumConfig();
  const base = c.baseUrl.replace(/\/+$/, '');
  // Aceptar base con o sin /chat/completions (convención OpenAI: /v1)
  const chatUrl = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
  const resolved = {
    provider: 'premium',
    modelKey: `premium::${c.model}`,
    model: c.model,
    api_key: c.apiKey,
    api_base: chatUrl
  };
  return {
    async call(task) {
      // Sin rotación (es EL modelo elegido): 3 intentos con pausa ante fallo
      // transitorio; los FATALES de cuenta suspenden el premium de inmediato.
      const phase = task.maxTokens <= 900 ? 'crítica' : task.maxTokens <= 1400 ? 'brief' : 'generación';
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (Date.now() < premiumFatal.until) {
          throw new Error(`premium suspendido (${premiumFatal.error})`);
        }
        console.log(`[PREMIUM] → ${c.model} (${phase})${attempt > 1 ? ` · intento ${attempt}` : ''}`);
        try {
          const content = await invokeLLM(resolved, task);
          return { content, modelKey: resolved.modelKey };
        } catch (error) {
          if (PREMIUM_FATAL_RE.test(error.message)) {
            premiumFatal.until = Date.now() + PREMIUM_FATAL_MS;
            premiumFatal.error = error.message;
            console.warn(`[PREMIUM] ⛔ error FATAL de cuenta (${error.message}) — premium suspendido ${PREMIUM_FATAL_MS / 60000} min, la generación sigue con el rotator`);
            throw error;
          }
          if (attempt === 3) throw error;
          console.warn(`[PREMIUM] ${c.model} falló (${error.message}) — reintentando en 2s`);
          await sleepMs(2000);
        }
      }
    },
    excludeModel: () => {},
    deadModels: () => []
  };
}

/**
 * Misión según configuración del admin: LLM premium si está habilitado y
 * configurado; si no, el rotator de free models. forceRotator permite al
 * generador degradar al rotator cuando el premium está caído.
 */
export function createConfiguredMission({ forceRotator = false } = {}) {
  if (!forceRotator && isPremiumConfigured()) {
    return createPremiumMission();
  }
  return createMission('general');
}
