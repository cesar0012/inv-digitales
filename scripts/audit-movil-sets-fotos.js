/* Auditoría móvil de TODOS los módulos de sets-fotos (390px).
 * Detección programática de problemas de layout:
 *  - desborde horizontal del documento (scrollWidth > viewport)
 *  - elementos de texto/imágenes visibles que sobresalen del viewport
 *  - texto con fuente ilegible (<8px) o altura colapsada
 *  - pares de TEXTO que se solapan (intersección de rects)
 * Uso: node scripts/audit-movil-sets-fotos.js [--solo set-key,set-key] */
import puppeteer from 'puppeteer';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'modulos-1', 'sets-fotos');
const TMP = path.resolve(__dirname, '..', 'shots-sets-fotos', 'tmp');
mkdirSync(TMP, { recursive: true });
const styles = require(path.resolve(__dirname, '..', 'modulos-1', 'sets-fotos', 'gen', 'styles.cjs'));

const pal = (set) => {
  const S = styles[set.replace(/^set-\d+-/, '')];
  return S ? '<style>:root{' + Object.entries(S.v).map(([k, v]) => k + ':' + v + ';').join('') + '}</style>' : '';
};
const svgPh = () => '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#efe9f4"/></svg>';
const mapPh = '<body style="margin:0;height:50vh;display:grid;place-items:center;background:#e3dced;font-family:Georgia;color:#7a6a94">Mapa</body>';

const CHECK_JS = () => {
  const vw = 392; // 390 + tolerancia 2
  const problemas = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > vw) problemas.push(`desborde horizontal: scrollWidth=${doc.scrollWidth}`);

  /* Un elemento "fuera del viewport" es un problema solo si NO está dentro de
   * un ancestro que lo recorte (overflow:hidden: marquesinas) o que sea un
   * carril con scroll intencional (overflow-x:auto/scroll: galerías swipe). */
  const dentroDeContenedorHorizontal = (el) => {
    let n = el.parentElement;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      const ox = cs.overflowX;
      if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') {
        const r = n.getBoundingClientRect();
        if (r.right <= vw + 6 && r.left >= -6) return true; // el contenedor sí cabe
      }
      n = n.parentElement;
    }
    return false;
  };

  // elementos visibles de contenido que salen del viewport
  const textos = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,li,a,time,b,button,address,figcaption'));
  for (const el of textos) {
    if (el.closest('[aria-hidden="true"]') || el.hidden) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const tieneTexto = (el.textContent || '').trim().length > 0;
    if (!tieneTexto) continue;
    if ((r.right > vw + 2 || r.left < -2) && !dentroDeContenedorHorizontal(el)) {
      problemas.push(`"${el.textContent.trim().slice(0, 24)}" sale del viewport (left=${Math.round(r.left)}, right=${Math.round(r.right)})`);
      if (problemas.length > 6) break;
    }
    const fs = parseFloat(cs.fontSize);
    if (fs > 0 && fs < 8 && r.height < 4) problemas.push(`"${el.textContent.trim().slice(0, 20)}" colapsado (font ${fs}px)`);
  }
  // imágenes visibles cortadas horizontalmente
  for (const img of Array.from(document.images)) {
    const r = img.getBoundingClientRect();
    if (r.width === 0) continue;
    if ((r.right > vw + 4 || r.left < -4) && !dentroDeContenedorHorizontal(img)) { problemas.push(`img sale del viewport (right=${Math.round(r.right)})`); break; }
  }
  // solape de textos hermanos con rectángulos que se cruzan >30%
  const vis = textos.filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    const t = (el.textContent || '').trim();
    if (!t || t.length < 2) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 10 && r.height > 8;
  }).slice(0, 90);
  for (let i = 0; i < vis.length && problemas.length <= 6; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      if (vis[i].contains(vis[j]) || vis[j].contains(vis[i])) continue;
      const a = vis[i].getBoundingClientRect(), b = vis[j].getBoundingClientRect();
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 12 && iy > 8) {
        const areaMin = Math.min(a.width * a.height, b.width * b.height);
        if ((ix * iy) / areaMin > 0.35) {
          problemas.push(`solape de texto: "${vis[i].textContent.trim().slice(0, 18)}" ↔ "${vis[j].textContent.trim().slice(0, 18)}"`);
          break;
        }
      }
    }
  }
  return problemas.slice(0, 7);
};

(async () => {
  const filtro = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1].split(',') : null;
  const sets = readdirSync(ROOT).filter((d) => /^set-\d+-/.test(d)).sort()
    .filter((s) => !filtro || filtro.some((f) => s.includes(f)));
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('loremflickr.com')) r.respond({ status: 200, contentType: 'image/svg+xml', body: svgPh() });
    else if (/google\./.test(u)) r.respond({ status: 200, contentType: 'text/html', body: mapPh });
    else r.continue();
  });

  const reporte = [];
  let ok = 0;
  for (const set of sets) {
    const files = readdirSync(path.join(ROOT, set)).filter((f) => f.endsWith('.html')).sort();
    for (const f of files) {
      const html = readFileSync(path.join(ROOT, set, f), 'utf-8');
      const doc = path.join(TMP, 'aud-' + set + '-' + f);
      writeFileSync(doc, '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">' + pal(set) + '<style>html,body{margin:0;background:#fff;}</style><script>window.__countdownTarget="2026-12-24T20:00:00";</script></head><body>' + html.replace(/loading="lazy"/g, 'loading="eager"') + '</body></html>', 'utf-8');
      await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
      try {
        await page.goto('file:///' + doc.split(path.sep).join('/'), { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise((r) => setTimeout(r, 2900)); // > timer de reveal (2.6s)
        const problemas = await page.evaluate(CHECK_JS);
        if (problemas.length) reporte.push({ set, file: f, problemas });
        else ok++;
      } catch (e) {
        reporte.push({ set, file: f, problemas: ['ERROR: ' + e.message.slice(0, 60)] });
      }
    }
    console.log(set, 'revisado');
  }
  await browser.close();

  console.log('\n══════════════════════════════');
  console.log(`MÓVIL OK: ${ok}/${ok + reporte.length}`);
  if (reporte.length) {
    console.log('CON PROBLEMAS:');
    for (const r of reporte) {
      console.log(`\n■ ${r.set}/${r.file}`);
      for (const p of r.problemas) console.log('   · ' + p);
    }
  }
  writeFileSync(path.join(__dirname, '..', 'shots-sets-fotos', 'audit-movil.json'), JSON.stringify(reporte, null, 1));
})().catch((e) => { console.error('ERR', e); process.exit(1); });
