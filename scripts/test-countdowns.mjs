/* Valida los 24 conceptos de countdown contra el gate del proceso agéntico. */
import { validateGeneratedModule } from '../server/moduleGeneratorService.js';

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { countdown } = require(join(__dirname, "..", "modulos-1", "sets-fotos", "gen", "countdowns.cjs"));
const styles = require(join(__dirname, "..", "modulos-1", "sets-fotos", "gen", "styles.cjs"));

let pass = 0;
const fails = [];
for (const S of Object.values(styles)) {
  const html = countdown(S);
  const res = validateGeneratedModule(html, 'countdown');
  const hasUnits = ['days', 'hours', 'minutes', 'seconds'].every((u) => html.includes(`data-countdown-unit="${u}"`));
  const hasTarget = html.includes('data-countdown-target="YYYY-MM-DDTHH:MM:SS"');
  const hasUpdate = html.includes('window.updateCountdown');
  if (res.valid && hasUnits && hasTarget && hasUpdate) {
    console.log(`✅ set-${String(S.num).padStart(2, '0')} ${S.key.padEnd(13)} ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
    pass++;
  } else {
    console.error(`✗ set-${S.num} ${S.key}: ${res.errors.join(' | ')} units=${hasUnits} target=${hasTarget} update=${hasUpdate}`);
    fails.push(S.key);
  }
}
console.log(`\n${pass}/24 countdowns válidos`);
if (fails.length) { console.log('FALLOS:', fails.join(', ')); process.exit(1); }
