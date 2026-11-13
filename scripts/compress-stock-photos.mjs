/**
 * COMPRESIÓN + CLASIFICACIÓN del stock de fotos "Padres, Padrinos, Corte"
 * (OneDrive_2026-11-13) hacia la biblioteca local img/<evento>/.
 *
 * - Recomprime con el encoder JPEG de Chrome vía puppeteer (ya instalado):
 *   máx 1600px de lado mayor, JPEG q85 — calidad visual intacta para las
 *   invitaciones (los módulos muestran como máx ~1200px), peso ~10× menor.
 * - Distribuye por título: "quinceanera-*" → img/xv-años/, sabor boda →
 *   img/boda-color/ + img/boda-americana/ + img/boda-gay-mujeres/ (los
 *   títulos son de novia/damas, encajan; boda-gay-hombres queda fuera).
 * - Los nombres de archivo conservan las keywords de rol (parents,
 *   godparents/padrinos, bridesmaids/chambelanes/court) que usa el sistema
 *   de selección por rol.
 *
 * Uso:  node scripts/compress-stock-photos.mjs
 */
import { readdirSync, mkdirSync, writeFileSync, statSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'OneDrive_2026-11-13', 'Padres, Padrinos, Corte de Honor');
const MAX_SIDE = 1600;
const QUALITY = 0.85;

const bodaFolders = ['boda-color', 'boda-americana', 'boda-gay-mujeres'];
const destinosDe = (nombre) => {
  const n = nombre.toLowerCase();
  if (n.startsWith('quinceanera-')) return ['xv-años'];
  return bodaFolders; // bride/wedding/bridesmaids/newlyweds → sabor boda
};
const nombreLimpio = (f) => f
  .replace(/\.jpe?g\.jpe?g$/i, '.jpg')          // "xxx.jpg.jpg" → "xxx.jpg"
  .replace(/\.png$/i, '.jpg')                    // el PNG foto también sale como JPEG
  .toLowerCase()
  .replace(/[^a-z0-9.,_-]/g, '-');

const files = readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f));
console.log(`Fotos origen: ${files.length} (${SRC})`);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank', { waitUntil: 'domcontentloaded' });

let totalIn = 0;
let totalOut = 0;
const escritos = [];

for (const f of files) {
  const src = join(SRC, f);
  const inBytes = statSync(src).size;
  totalIn += inBytes;

  const mime = /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';
  const srcUri = `data:${mime};base64,${readFileSync(src).toString('base64')}`;

  const dataUri = await page.evaluate(async ({ srcUri, maxSide, quality }) => {
    const img = new Image();
    const bmp = await new Promise((res, rej) => {
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('no carga'));
      img.src = srcUri;
    });
    const scale = Math.min(1, maxSide / Math.max(bmp.naturalWidth, bmp.naturalHeight));
    const w = Math.max(1, Math.round(bmp.naturalWidth * scale));
    const h = Math.max(1, Math.round(bmp.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // PNG con transparencia → fondo blanco
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    return { uri: canvas.toDataURL('image/jpeg', quality), w, h };
  }, { srcUri, maxSide: MAX_SIDE, quality: QUALITY }).catch((e) => {
    console.error(`  ✗ ${f}: ${e.message}`);
    return null;
  });
  if (!dataUri) continue;

  const buf = Buffer.from(dataUri.uri.split(',')[1], 'base64');
  totalOut += buf.length;

  const out = nombreLimpio(f);
  for (const carpeta of destinosDe(f)) {
    const dir = join(ROOT, 'img', carpeta);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, out), buf);
    escritos.push(`img/${carpeta}/${out}`);
  }
  console.log(`✓ ${f} → ${out}  ${(inBytes / 1048576).toFixed(1)}MB → ${(buf.length / 1024).toFixed(0)}KB  ${dataUri.w}×${dataUri.h}`);
}

await browser.close();
console.log(`\nTotal: ${(totalIn / 1048576).toFixed(1)}MB → ${(totalOut / 1024 / escritos.filter((w) => !w.includes('boda-') || true).length).toFixed(0)}KB promedio por foto`);
console.log(`Archivos escritos: ${escritos.length}`);
console.log('Revisa la lista completa arriba; el original en OneDrive_2026-11-13/ queda intacto.');
