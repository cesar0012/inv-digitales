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
  quotaCooldownMs: 30 * 60 * 1000,
  deadCooldownMs: 24 * 60 * 60 * 1000,
  maxCatalog: 25,
  callTimeoutMs: parseInt(process.env.ROTATOR_CALL_TIMEOUT_MS || '120000', 10),
  maxDeadSkips: 5,
  maxQuotaRetries: 2,
  benchFreshMs: 48 * 60 * 60 * 1000
};

// --- Clasificación de errores (§7 de la guía; quota se evalúa PRIMERO) ---
const QUOTA_RE = /\b429\b|\b503\b|rate.?limit|too many requests|quota|insufficient|exceeded your|out of (free )?credits|no more free|\bthrottl|overloaded|temporarily unavailable|service unavailable|try again later/i;
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
  if (entry.provider === 'nvidia') score *= 0.75; // catálogo con modelos no servibles
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
      console.log(`[ROTATOR] catálogo OpenRouter: ${free.length} modelos free`);
    } catch (e) {
      console.warn('[ROTATOR] fallo catálogo OpenRouter:', e.message);
    }
    const keys = getKeys();
    if (keys.nvidia) {
      try {
        const json = await fetchJson(PROVIDERS.nvidia.modelsUrl, PROVIDERS.nvidia.auth(keys.nvidia));
        const models = (json.data || []).filter((m) => typeof m.id === 'string' && !NON_CHAT_RE.test(m.id));
        for (const m of models) merged.push({ provider: 'nvidia', model: m.id, context_length: m.context_length || 0 });
        console.log(`[ROTATOR] catálogo NVIDIA: ${models.length} modelos`);
      } catch (e) {
        console.warn('[ROTATOR] fallo catálogo NVIDIA:', e.message);
      }
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

/** resolve() — síncrono y barato (§3). Excluye sin-key, cooling y exclude[]. */
function resolve({ lane = 'general', exclude = [] } = {}) {
  if (!catalog || catalog.length === 0) return null;
  const keys = getKeys();
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);
  const candidates = catalog.filter((c) =>
    keys[c.provider] && c.lanes.includes(lane) && !excludeSet.has(`${c.provider}::${c.model}`)
  );
  if (candidates.length === 0) return null;

  const now = Date.now();
  const available = candidates.filter((c) => (entryState(`${c.provider}::${c.model}`).cooldown_until || 0) <= now);
  const pool = available.length > 0 ? available : candidates; // si TODO está en cooldown → flag fallback
  // Benchmarks frescos dominan (§5 Layer 2)
  const ranked = [...pool].sort((a, b) => benchScore(b) - benchScore(a));
  const chosen = ranked[0];
  const modelKey = `${chosen.provider}::${chosen.model}`;
  return {
    modelKey,
    provider: chosen.provider,
    model: chosen.model,
    api_key: keys[chosen.provider],
    api_base: PROVIDERS[chosen.provider].chatUrl,
    fallback: available.length === 0
  };
}

const benchScore = (c) => {
  const st = state.entries[`${c.provider}::${c.model}`];
  if (st?.bench?.at && Date.now() - new Date(st.bench.at).getTime() < CONFIG.benchFreshMs) {
    return 10000 + (st.bench.score || 0);
  }
  return c.heuristic || 0;
};

function reportFailure(modelKey, rawErrorText) {
  const st = entryState(modelKey);
  st.failures += 1;
  st.last_error = String(rawErrorText || '').slice(0, 300);
  st.last_used = new Date().toISOString();
  const dead = isModelUnavailableError(rawErrorText) && !isQuotaError(rawErrorText);
  st.cooldown_until = Date.now() + (dead ? CONFIG.deadCooldownMs : CONFIG.quotaCooldownMs);
  saveState();
  console.warn(`[ROTATOR] ${modelKey} → cooldown ${dead ? '24h (muerto)' : '30min (quota/transitorio)'}: ${st.last_error.slice(0, 90)}`);
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

/** Llamada cruda a un modelo resuelto (chat completions OpenAI-compatible). */
async function invokeLLM(resolved, { system, prompt, temperature = 0.8, maxTokens = 8000 }) {
  const headers = { 'Content-Type': 'application/json', ...PROVIDERS[resolved.provider].auth(resolved.api_key) };
  const body = {
    model: resolved.model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt }
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false
  };
  const res = await fetch(resolved.api_base, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CONFIG.callTimeoutMs)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(json?.error?.message || `HTTP ${res.status}`), { status: res.status });
  }
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('respuesta sin contenido');
  return content;
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
      for (;;) {
        await refreshCatalog();
        let resolved = resolve({ lane, exclude: [...dead] });
        if (!resolved) throw new Error('Rotator sin candidatos: configura API keys de OpenRouter/NVIDIA');
        if (resolved.fallback) {
          const wider = resolve({ exclude: [...dead] }); // lane-widening
          if (wider && !wider.fallback) resolved = wider;
        }
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
          throw error; // fallo no rotable (bug de prompt, etc.)
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
  return {
    current: state.current,
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
  forceRotate, resetCooldowns, runBenchmarks, getStatus, createMission, getEntry
};
