/* Render de los 20 sets de coleccion-arte a PNG (desktop + móvil).
 * Estrategia robusta: cada módulo se captura POR SEPARADO (file:// directo,
 * que renderiza fiable) y luego se COSen los 12 PNG en una sola imagen por set.
 * loremflickr responde 401 desde este entorno → placeholder SVG local. */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'modulos-1', 'coleccion-arte');
const OUT = path.resolve(__dirname, '..', 'shots-coleccion-arte');
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
    <stop offset="0" stop-color="#9aa8bd"/><stop offset=".55" stop-color="#6c7a92"/><stop offset="1" stop-color="#44506b"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.76}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.17}" fill="#eef2f7" opacity=".4"/>
  <path d="M0 ${h} L${w * 0.34} ${h * 0.42} L${w * 0.6} ${h * 0.78} L${w * 0.8} ${h * 0.52} L${w} ${h * 0.74} L${w} ${h} Z" fill="#2b3547" opacity=".6"/>
  <text x="50%" y="54%" font-family="Arial" font-size="${Math.max(18, Math.round(Math.min(w, h) / 15))}" fill="#ffffff" text-anchor="middle" opacity=".92">${kw}</text>
</svg>`;
}

async function shootModule(browser, url, { width, dpr }, outPath) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('loremflickr.com')) req.respond({ status: 200, contentType: 'image/svg+xml', body: placeholderSvg(u) });
    else if (/google\.(com|apis|gstatic)|maps\.google/.test(u)) req.respond({ status: 200, contentType: 'text/html', body: '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#dde5ec;font-family:Arial;color:#5a6b7b">MAPA EMBEBIDO</body>' });
    else req.continue();
  });
  await page.setViewport({ width, height: 900, isMobile: false, deviceScaleFactor: dpr });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.addStyleTag({ content: 'body{margin:0 !important;}' });
  await page.evaluate(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      const imgs = Array.from(document.images);
      if (imgs.length && imgs.every((i) => i.complete)) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 350));
  });
  await page.screenshot({ path: outPath, fullPage: true, captureBeyondViewport: true });
  await page.close();
  return outPath;
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const stitch = await browser.newPage();

  const sets = process.argv[2]
    ? process.argv[2].split(',')
    : readdirSync(ROOT).filter((d) => /^set-/.test(d)).sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));

  for (const set of sets) {
    for (const [label, width, dpr] of [['desktop', 1280, 1], ['mobile', 390, 1]]) {
      const parts = [];
      for (let i = 0; i < TYPES.length; i++) {
        const f = path.join(ROOT, set, String(i + 1).padStart(2, '0') + '-' + TYPES[i] + '.html');
        // Envolver el fragmento en documento completo (charset + margin 0) para captura fiel.
        const docPath = path.join(TMP, `${set}-${TYPES[i]}-doc.html`);
        writeFileSync(docPath, '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>body{margin:0;}</style></head><body>' + readFileSync(f, 'utf-8') + '</body></html>', 'utf-8');
        const png = path.join(TMP, `${set}-${TYPES[i]}-${label}.png`);
        await shootModule(browser, 'file:///' + docPath.split(path.sep).join('/'), { width, dpr }, png);
        parts.push(png);
      }
      // Cose: página de <img> apiladas (los <img> pintan siempre de forma fiable).
      const imgs = parts.map((p) => `<img src="file:///${p.split(path.sep).join('/')}" style="display:block;width:100%;">`).join('\n');
      const wrapPath = path.join(TMP, `stitch-${set}-${label}.html`);
      writeFileSync(wrapPath, `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;background:#111;}</style></head><body>${imgs}</body></html>`, 'utf-8');
      await stitch.setViewport({ width: width * dpr, height: 900 });
      await stitch.goto('file:///' + wrapPath.split(path.sep).join('/'), { waitUntil: 'networkidle0', timeout: 120000 });
      await new Promise((r) => setTimeout(r, 700));
      const name = (label === 'desktop') ? `shot-${set}.png` : `shot-mobile-${set}.png`;
      await stitch.screenshot({ path: path.join(OUT, name), fullPage: true, captureBeyondViewport: true });
      console.log(`OK ${name}`);
    }
  }
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
