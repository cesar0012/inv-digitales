/* Índice de los 24 countdowns: UN concepto único por set, en el orden de
 * styles.cjs (num 1..24). Ningún concepto se repite. */
const C1 = require('./cd/concepts-1.cjs');
const C2 = require('./cd/concepts-2.cjs');
const C3 = require('./cd/concepts-3.cjs');

/* [num] → builder. El orden ES el concepto: cada set tiene el suyo. */
const CONCEPTS = {
  1:  C1.cd_imperial,      // set-01-imperial    → reloj de sol romano
  2:  C1.cd_mariposas,     // set-02-mariposas   → vuelo de mariposas
  3:  C1.cd_glitter,       // set-03-glitter     → split-flap de aeropuerto
  4:  C1.cd_monolavanda,   // set-04-monolavanda → reloj de arena
  5:  C1.cd_arcoacuarela,  // set-05-arcoacuarela→ arcoíris de acuarela
  6:  C1.cd_azulfloral,    // set-06-azulfloral  → reloj analógico de estación
  7:  C1.cd_rosabeige,     // set-07-rosabeige   → calendario tachable
  8:  C1.cd_telablanca,    // set-08-telablanca  → vela que se consume
  9:  C2.cd_hortensia,     // set-09-hortensia   → brújula artesanal
  10: C2.cd_navylaser,     // set-10-navylaser   → ascensor art-déco
  11: C2.cd_orobotanico,   // set-11-orobotanico → corona de brotes orbital
  12: C2.cd_glicina,       // set-12-glicina     → péndulo de casona
  13: C2.cd_apiladas,      // set-13-apiladas    → torre de bloques
  14: C2.cd_peonias,       // set-14-peonias     → peonía que florece
  15: C2.cd_otono,         // set-15-otono       → rama con hojas
  16: C2.cd_navyfloral,    // set-16-navyfloral  → boya náutica
  17: C3.cd_griega,        // set-17-griega      → meandro helénico
  18: C3.cd_encaje,        // set-18-encaje      → bordado en aro
  19: C3.cd_caliz,         // set-19-caliz       → campanas de misión
  20: C3.cd_espejadas,     // set-20-espejadas   → reflejo doble
  21: C3.cd_fabuloso,      // set-21-fabuloso    → líder de cine
  22: C3.cd_rosa18,        // set-22-rosa18      → listón con lazo
  23: C3.cd_negooro60,     // set-23-negooro60   → torre de copas
  24: C3.cd_confeti25      // set-24-confeti25   → globos y confeti
};

function countdown(S) {
  const fn = CONCEPTS[S.num];
  if (!fn) throw new Error('No hay concepto de countdown para set num=' + S.num);
  return fn(S);
}

module.exports = { countdown, CONCEPTS };
