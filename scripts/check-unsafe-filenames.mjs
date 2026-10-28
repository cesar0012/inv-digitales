// Run before deploying the security update: lists stored files whose names the
// server now rejects (spaces, accents, other symbols). Those files return 400
// until they are renamed (and their row in the database updated).
//
//   node scripts/check-unsafe-filenames.mjs [storageDir]
//
// Default storageDir: server/storage
import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { isSafeFilename, isSafeId } from '../server/security.js';

const root = resolve(process.argv[2] || 'server/storage');
if (!existsSync(root)) {
  console.error(`No existe la carpeta ${root}`);
  process.exit(1);
}

const problems = [];
for (const entry of readdirSync(root)) {
  const dir = join(root, entry);
  if (!statSync(dir).isDirectory()) continue;
  // historico/ holds catalog copies; numeric folders are user ids.
  if (entry !== 'historico' && !isSafeId(entry)) problems.push({ path: dir, reason: 'carpeta de usuario con nombre no válido' });
  for (const file of readdirSync(dir)) {
    const full = join(dir, file);
    if (statSync(full).isFile() && !isSafeFilename(file)) problems.push({ path: full, reason: 'nombre de archivo no válido' });
  }
}

if (!problems.length) {
  console.log(`OK: todos los archivos en ${root} tienen nombres válidos.`);
} else {
  console.log(`${problems.length} archivo(s) necesitan otro nombre:`);
  for (const p of problems) console.log(`- ${p.path} (${p.reason})`);
  process.exitCode = 1;
}
