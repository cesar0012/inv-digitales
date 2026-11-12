/**
 * MIGRACIÓN DE DATOS A /app/data — se ejecuta automáticamente al arrancar
 * si DATA_DIR está configurado y la base de datos aún no existe ahí.
 * Mueve database.sqlite y storage/ del código fuente al volumen persistente.
 *
 * Uso manual (dev):  node server/migrate-data.cjs
 * En producción:     el servidor lo llama solo al boot si detecta datos viejos.
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : null;

if (!DATA_DIR) {
  console.log('[MIGRATE] DATA_DIR no configurado — nada que migrar (modo dev).');
  process.exit(0);
}

const nuevoDb = join(DATA_DIR, 'database.sqlite');
const viejoDb = join(__dirname, 'database.sqlite');
const viejoStorage = join(__dirname, 'storage');
const nuevoStorage = join(DATA_DIR, 'storage');

let cambios = 0;

// 1. Base de datos
if (!existsSync(nuevoDb) && existsSync(viejoDb)) {
  mkdirSync(DATA_DIR, { recursive: true });
  copyFileSync(viejoDb, nuevoDb);
  cambios++;
  console.log(`[MIGRATE] Base de datos copiada → ${nuevoDb}`);
}

// 2. Storage (recursivo)
const copiarDir = (origen, destino) => {
  if (!existsSync(origen)) return;
  mkdirSync(destino, { recursive: true });
  for (const item of readdirSync(origen)) {
    const src = join(origen, item);
    const dst = join(destino, item);
    if (statSync(src).isDirectory()) {
      copiarDir(src, dst);
    } else if (!existsSync(dst)) {
      copyFileSync(src, dst);
      cambios++;
    }
  }
};

if (existsSync(viejoStorage)) {
  copiarDir(viejoStorage, nuevoStorage);
  if (cambios > 0) console.log(`[MIGRATE] Storage copiado → ${nuevoStorage}`);
}

if (cambios === 0) {
  console.log('[MIGRATE] Todo ya estaba en su lugar — sin cambios.');
} else {
  console.log(`[MIGRATE] ${cambios} archivos migrados a ${DATA_DIR}`);
}
