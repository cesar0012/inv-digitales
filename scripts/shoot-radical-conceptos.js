/* Captura del set radical-conceptos a PNG (desktop + móvil). Mismo enfoque
 * robusto: módulo por módulo + costura. loremflickr → placeholder local. */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'modulos-1', 'radical-conceptos');
const OUT = path.resolve(__dirname, '..', 'shots-radical-conceptos');
const TMP = path.join(OUT, 'tmp');
mkdirSync(TMP, { recursive: true });

const TYPES = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'];

function placeholderSvg(url) {
  const m = String(url).match(/loremflickr\.com\/(\d+)\/(\d+)\/([^')?]+)/);
  const w = m ? +m[1] : 800, h = m ? +m[2] : 500;
  const kw = m ? decodeURIComponent(m[3]).split(',')[0] : 'foto';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe9f4"/><stop offset="1" stop-color="#d8cfe8"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="52%" font-family="Georgia" font-style="italic" font-size="${Math.max(16, Math.round(Math.min(w, h) / 15))}" fill="#8a7ba8" text-anchor="middle">${kw}</text></svg>`;
}

async function shootModule(browser, url, { width, dpr }, outPath) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('loremflickr.com')) req.respond({ status: 200, contentType: 'image/svg+xml', body: placeholderSvg(u) });
    else if (/google\.(com|apis|gstatic)|maps\.google/.test(u)) req.respond({ status: 200, contentType: 'text/html', body: '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#3a2c1c;font-family:Georgia;font-style:italic;color:#d9b98a">Mapa embebido</body>' });
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
    await new Promise((r) => setTimeout(r, 4800));
  });
  const alto = await page.evaluate(() => Math.ceil(document.body.scrollHeight));
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width, height: Math.min(alto, 20000) }, captureBeyondViewport: true });
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const stitch = await browser.newPage();
  for (const [label, width, dpr] of [['desktop', 1280, 1], ['mobile', 390, 1]]) {
    const parts = [];
    for (let i = 0; i < TYPES.length; i++) {
      const f = path.join(ROOT, String(i + 1).padStart(2, '0') + '-' + TYPES[i] + '.html');
      const docPath = path.join(TMP, `rc-${TYPES[i]}-doc.html`);
      writeFileSync(docPath, '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{background:transparent;}</style></head><body>' + readFileSync(f, 'utf-8').replace(/loading="lazy"/g, 'loading="eager"') + '</body></html>', 'utf-8');
      const png = path.join(TMP, `rc-${TYPES[i]}-${label}.png`);
      await shootModule(browser, 'file:///' + docPath.split(path.sep).join('/'), { width, dpr }, png);
      parts.push(png);
    }
    const imgs = parts.map((p) => `<img src="file:///${p.split(path.sep).join('/')}" style="display:block;width:100%;">`).join('\n');
    const wrapPath = path.join(TMP, `stitch-rc-${label}.html`);
    writeFileSync(wrapPath, `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;background:#241436;}</style></head><body>${imgs}</body></html>`, 'utf-8');
    await stitch.setViewport({ width: width * dpr, height: 900 });
    await stitch.goto('file:///' + wrapPath.split(path.sep).join('/'), { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 700));
    const name = (label === 'desktop') ? 'shot-radical-conceptos.png' : 'shot-mobile-radical-conceptos.png';
    await stitch.screenshot({ path: path.join(OUT, name), fullPage: true, captureBeyondViewport: true });
    console.log('OK', name);
  }
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
