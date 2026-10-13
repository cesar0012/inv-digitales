/* Captura los 24 countdowns de sets-fotos en una cuadrícula (desktop) para
 * verificación visual de unicidad. Inyecta __countdownTarget de ejemplo. */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'modulos-1', 'sets-fotos');
const OUT = path.resolve(__dirname, '..', 'shots-sets-fotos');
const TMP = path.join(OUT, 'tmp');
mkdirSync(TMP, { recursive: true });

function placeholderSvg(url) {
  const m = String(url).match(/loremflickr\.com\/(\d+)\/(\d+)\/([^')?]+)/);
  const w = m ? +m[1] : 800, h = m ? +m[2] : 500;
  const kw = m ? decodeURIComponent(m[3]).split(',')[0] : 'foto';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe9f4"/><stop offset="1" stop-color="#d8cfe8"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="52%" font-family="Georgia" font-style="italic" font-size="${Math.max(16, Math.round(Math.min(w, h) / 15))}" fill="#8a7ba8" text-anchor="middle">${kw}</text></svg>`;
}

(async () => {
  const sets = readdirSync(ROOT).filter((d) => /^set-\d+-/.test(d)).sort();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('loremflickr.com')) req.respond({ status: 200, contentType: 'image/svg+xml', body: placeholderSvg(u) });
    else req.continue();
  });

  const celdas = [];
  for (const set of sets) {
    const f = path.join(ROOT, set, '07-countdown.html');
    const docPath = path.join(TMP, `${set}-cd-doc.html`);
    writeFileSync(docPath, '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><style>html,body{background:transparent;margin:0;}</style><script>window.__countdownTarget = "2026-12-24T20:00:00";</script></head><body>' + readFileSync(f, 'utf-8').replace(/loading="lazy"/g, 'loading="eager"') + '</body></html>', 'utf-8');
    const png = path.join(TMP, `${set}-cd.png`);
    await page.setViewport({ width: 640, height: 700, deviceScaleFactor: 1 });
    await page.goto('file:///' + docPath.split(path.sep).join('/'), { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2400));
    const alto = await page.evaluate(() => Math.min(Math.ceil(document.body.scrollHeight), 760));
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 640, height: alto }, captureBeyondViewport: true });
    celdas.push({ set, png });
    console.log('✓', set);
  }
  await page.close();

  // Cuadrícula 4 columnas × 6 filas con etiquetas
  const stitch = await browser.newPage();
  const celdasHtml = celdas.map((c) => `<figure style="margin:0;border:1px solid #999;"><figcaption style="font:11px monospace;padding:2px 6px;background:#222;color:#ffd97a;">${c.set}</figcaption><img src="file:///${c.png.split(path.sep).join('/')}" style="display:block;width:100%;"></figure>`).join('\n');
  const gridPath = path.join(TMP, 'grid-countdowns.html');
  writeFileSync(gridPath, `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;background:#444;}main{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;}</style></head><body><main>${celdasHtml}</main></body></html>`, 'utf-8');
  await stitch.setViewport({ width: 2640, height: 1000 });
  await stitch.goto('file:///' + gridPath.split(path.sep).join('/'), { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 900));
  const total = await stitch.evaluate(() => Math.ceil(document.body.scrollHeight));
  let y = 0, part = 0;
  while (y < total) {
    const h = Math.min(7000, total - y);
    const suffix = part === 0 ? '' : `.p${part + 1}`;
    await stitch.screenshot({ path: path.join(OUT, `grid-countdowns${suffix}.png`), clip: { x: 0, y, width: 2640, height: h }, captureBeyondViewport: true });
    y += h; part++;
  }
  await browser.close();
  console.log(`✅ Cuadrícula de ${celdas.length} countdowns en shots-sets-fotos/grid-countdowns.png (${part} parte/s)`);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
