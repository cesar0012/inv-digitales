/**
 * ============================================================================
 * MODULE GENERATOR BATCH — generación automática de sets en background
 * ============================================================================
 * Permite dejar al generador trabajando (p. ej. "10 sets en 15 minutos") con
 * los modelos que el admin definió en la allowlist del rotator. Cada set:
 *   - Recibe una DIRECCIÓN CREATIVA automática distinta (sin input del usuario)
 *     y estética/firma exclusivas del lote (variedad forzada entre sets).
 *   - Comparte estética/firma entre sus módulos (coherencia de invitación).
 *   - Se guarda en module_generator_results para revisión posterior.
 * Un solo batch activo a la vez; parada manual disponible.
 */
import { generateSet, saveGeneratedResult } from './moduleGeneratorService.js';
import { llmRotator, createConfiguredMission, isPremiumConfigured } from './llmRotator.js';
import db from './database.js';

const MAX_SETS = 20;
const DELAY_BETWEEN_SETS_MS = 1500;

const jobState = {
  active: false,
  batchId: null,
  totalSets: 0,
  doneSets: 0,
  currentLabel: '',
  generated: 0,
  failed: 0,
  startedAt: null,
  finishedAt: null,
  lastError: null,
  stopRequested: false
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function getBatchStatus() {
  return { ...jobState };
}

export function requestStop() {
  if (jobState.active) jobState.stopRequested = true;
  return getBatchStatus();
}

/**
 * Arranca un batch en background. Resuelve inmediatamente con el batchId.
 * @param {{moduleTypes: string[], sets: number, extraInstructions?: string}} params
 */
export function startBatch({ moduleTypes, sets, extraInstructions = '' }) {
  if (jobState.active) {
    throw Object.assign(new Error('Ya hay un lote en curso'), { status: 409 });
  }
  if (!Array.isArray(moduleTypes) || moduleTypes.length === 0) {
    throw Object.assign(new Error('Sin tipos de módulo'), { status: 400 });
  }
  const total = Math.max(1, Math.min(MAX_SETS, parseInt(sets, 10) || 1));

  const batchId = `batch_${Date.now().toString(36)}`;
  Object.assign(jobState, {
    active: true, batchId, totalSets: total, doneSets: 0, currentLabel: '',
    generated: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null,
    lastError: null, stopRequested: false
  });
  console.log(`[MODULE-BATCH] ▶️ ${batchId}: ${total} set(s) × ${moduleTypes.length} tipo(s)`);
  runBatch(batchId, total, moduleTypes, String(extraInstructions || '').slice(0, 2000));
  return getBatchStatus();
}

async function runBatch(batchId, totalSets, moduleTypes, extraInstructions) {
  const batchSeeds = new Set();
  // Modo LLM del admin: premium (OpenAI-compatible) o rotator; el respaldo
  // degrada al rotator si el premium está caído.
  const usingPremium = isPremiumConfigured();
  const mission = createConfiguredMission();
  const missionFactory = () => createConfiguredMission({ forceRotator: usingPremium });
  try {
    for (let s = 1; s <= totalSets; s++) {
      if (jobState.stopRequested) {
        console.log(`[MODULE-BATCH] ⏹️ detenido por el admin en el set ${s}/${totalSets}`);
        break;
      }
      jobState.currentLabel = `set ${s}/${totalSets}`;
      try {
        const set = await generateSet(moduleTypes, { extraInstructions, batchSeeds, mission, missionFactory, concurrency: usingPremium ? 3 : 2 });
        for (const result of set.modules) {
          const id = saveGeneratedResult(db, { batchId, setIndex: s, result });
          if (result.failed || !result.validation?.valid) {
            jobState.failed += 1;
          } else {
            jobState.generated += 1;
            console.log(`[MODULE-BATCH] ${batchId} set ${s}: ${result.moduleType} ✓ (id ${id}, score ${result.critique?.score ?? '—'})`);
          }
        }
      } catch (setError) {
        jobState.failed += 1;
        jobState.lastError = setError.message;
        console.warn(`[MODULE-BATCH] set ${s} falló: ${setError.message}`);
      }
      jobState.doneSets = s;
      if (s < totalSets && !jobState.stopRequested) await sleep(DELAY_BETWEEN_SETS_MS);
    }
  } finally {
    jobState.active = false;
    jobState.currentLabel = '';
    jobState.finishedAt = new Date().toISOString();
    console.log(`[MODULE-BATCH] ✅ ${batchId} terminado: ${jobState.generated} generados, ${jobState.failed} fallidos`);
  }
}
