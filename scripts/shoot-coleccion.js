/* Captura de colecciones (modulos-1/colecciones/*) a PNG desktop + móvil.
 * Cada módulo se captura por separado (file:// con documento completo) y se
 * cose en una sola imagen por colección. loremflickr → placeholder SVG local. */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'modulos-1', 'colecciones');
const OUT = path.resolve(__dirname, '..', 'shots-colecciones');
const TMP = path.join(OUT, 'tmp');
mkdirSync(TMP, { recursive: true });

const TYPES = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'];

function placeholderSvg(url) {
  const m = String(url).match(/loremflickr\.com\/(\d+)\/(\d+)\/([^')?]+)/);
  const w = m ? +m[1] : 800, h = m ? +m[2] : 500;
  const kw = m ? decodeURIComponent(m[3]).split(',')[0] : 'foto';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e3c6d1"/><stop offset=".55" stop-color="#c9a5b4"/><stop offset="1" stop-color="#9d7f8e"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.74}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.16}" fill="#fdf1f5" opacity=".5"/>
  <path d="M0 ${h} L${w * 0.34} ${h * 0.44} L${w * 0.6} ${h * 0.78} L${w * 0.8} ${h * 0.54} L${w} ${h * 0.74} L${w} ${h} Z" fill="#6e4d5c" opacity=".55"/>
  <text x="50%" y="54%" font-family="Georgia" font-style="italic" font-size="${Math.max(18, Math.round(Math.min(w, h) / 14))}" fill="#fff8fa" text-anchor="middle" opacity=".95">${kw}</text>
</svg>`;
}

async function shootModule(browser, url, { width, dpr }, outPath) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('loremflickr.com')) req.respond({ status: 200, contentType: 'image/svg+xml', body: placeholderSvg(u) });
    else if (/google\.(com|apis|gstatic)|maps\.google/.test(u)) req.respond({ status: 200, contentType: 'text/html', body: '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#e8d5dd;font-family:Georgia;font-style:italic;color:#9d4e6c">Mapa embebido</body>' });
    else req.continue();
  });
  await page.setViewport({ width, height: 900, isMobile: false, deviceScaleFactor: dpr });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      const imgs = Array.from(document.images);
      if (imgs.length && imgs.every((i) => i.complete)) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    // Espera generosa: revelados IO con red de seguridad a 2.5s + transiciones (~1.5s).
    await new Promise((r) => setTimeout(r, 4800));
  });
  await page.screenshot({ path: outPath, fullPage: true, captureBeyondViewport: true });
  await page.close();
}

(async () => {
  const target = process.argv[2];
  const colecciones = target ? [target] : readdirSync(ROOT).filter((d) => !d.endsWith('.html')).sort();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const stitch = await browser.newPage();

  for (const col of colecciones) {
    for (const [label, width, dpr] of [['desktop', 1280, 1], ['mobile', 390, 1]]) {
      const parts = [];
      for (let i = 0; i < TYPES.length; i++) {
        const f = path.join(ROOT, col, String(i + 1).padStart(2, '0') + '-' + TYPES[i] + '.html');
        const docPath = path.join(TMP, `${col}-${TYPES[i]}-doc.html`);
        writeFileSync(docPath, '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;}</style></head><body>' + readFileSync(f, 'utf-8').replace(/loading="lazy"/g, 'loading="eager"') + '</body></html>', 'utf-8');
        const png = path.join(TMP, `${col}-${TYPES[i]}-${label}.png`);
        await shootModule(browser, 'file:///' + docPath.split(path.sep).join('/'), { width, dpr }, png);
        parts.push(png);
      }
      const imgs = parts.map((p) => `<img src="file:///${p.split(path.sep).join('/')}" style="display:block;width:100%;">`).join('\n');
      const wrapPath = path.join(TMP, `stitch-${col}-${label}.html`);
      writeFileSync(wrapPath, `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;background:#111;}</style></head><body>${imgs}</body></html>`, 'utf-8');
      await stitch.setViewport({ width: width * dpr, height: 900 });
      await stitch.goto('file:///' + wrapPath.split(path.sep).join('/'), { waitUntil: 'networkidle0', timeout: 120000 });
      await new Promise((r) => setTimeout(r, 700));
      const name = (label === 'desktop') ? `shot-${col}.png` : `shot-mobile-${col}.png`;
      await stitch.screenshot({ path: path.join(OUT, name), fullPage: true, captureBeyondViewport: true });
      console.log(`OK ${name}`);
    }
  }
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
