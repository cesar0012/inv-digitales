/* Zoom: captura módulos individuales a 390px full-res para verificación visual */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PREVIEW = (S) => `:root{${Object.entries(S.v).map(([k,v])=>`${k}:${v}`).join(';')}}`;

const TARGETS = [
  // [set-key, tipo, archivo-salida]
  ['imperial',      'detalles',   'zoom-01-detalles.png'],
  ['imperial',      'countdown',  'zoom-01-countdown.png'],
  ['mariposas',     'ubicacion',  'zoom-02-ubicacion.png'],
  ['mariposas',     'galeria',    'zoom-02-galeria.png'],
  ['telablanca',    'countdown',  'zoom-08-countdown.png'],
  ['navyfloral',    'countdown',  'zoom-16-countdown.png'],
  ['navylaser',     'ubicacion',  'zoom-10-ubicacion.png'],
  ['navylaser',     'galeria',    'zoom-10-galeria.png'],
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const styles = require('../modulos-1/sets-fotos/gen/styles.cjs');

  for (const [key, tipo, out] of TARGETS) {
    const S = styles[key];
    const NN = { portada:'01', padres:'02', ubicacion:'03', itinerario:'04', confirmacion:'05', detalles:'06', countdown:'07', padrinos:'08', corte:'09', galeria:'10', regalos:'11', vestimenta:'12' }[tipo];
    const file = path.join('modulos-1', 'sets-fotos', `set-${String(S.num).padStart(2, '0')}-${key}`, `${NN}-${tipo}.html`);
    let html = fs.readFileSync(file, 'utf8');
    // stub de imágenes/mapas como en el auditor
    html = html.replace(/https:\/\/loremflickr\.com\/[^"')\s]+/g, 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="%239db"/><text x="300" y="200" text-anchor="middle" font-size="28" fill="%23fff">FOTO</text></svg>');
    html = html.replace(/<iframe[^>]*src="[^"]*"[^>]*><\/iframe>/g, '<div style="width:100%;height:220px;background:%23b8c8d8;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:%23fff">MAPA</div>');
    const wrapped = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${PREVIEW(S)}</style></head><body style="margin:0">${html}</body></html>`;
    await page.setContent(wrapped, { waitUntil: 'networkidle0', timeout: 30000 }).catch(()=>{});
    await new Promise(r => setTimeout(r, 2900));
    const el = await page.$('section');
    if (el) { await el.screenshot({ path: path.join('shots-sets-fotos', out) }); }
    else    { await page.screenshot({ path: path.join('shots-sets-fotos', out), fullPage: true }); }
    console.log('OK', out);
  }
  await browser.close();
})();
