// Experimento en Chromium: qué mecanismo hace que "Grande" signifique
// "más grande que como está en el diseño" SIN romper la adaptación a la
// pantalla del celular. Se compara un tamaño fijo en píxeles contra "zoom".
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const invitacion = `<!DOCTYPE html><html><head><style>
  body { margin:0; font-size:16px; line-height:1.65; }
  .caja { padding: clamp(10px, 4vw, 40px); background:#eee; }
  .titulo { font-size: clamp(20px, 6vw, 60px); line-height: 1.1; margin:0; }
  .texto { line-height: normal; letter-spacing: normal; margin:0; }
</style></head><body><div class="caja">
  <h1 class="titulo" id="t">Título de prueba</h1>
  <p class="texto" id="p">Párrafo con espaciado por defecto</p>
</div></body></html>`;

async function cargar(ancho) {
  await page.setViewport({ width: ancho, height: 700 });
  await page.setContent(`<style>html,body{margin:0}</style><iframe id="f" style="width:100vw;height:90vh;border:0;display:block" sandbox="allow-scripts allow-same-origin"></iframe>`);
  await page.evaluate((html) => new Promise((r) => { const f = document.getElementById('f'); f.onload = r; f.srcdoc = html; }), invitacion);
}
const medir = () => page.evaluate(() => {
  const doc = document.getElementById('f').contentDocument, win = document.getElementById('f').contentWindow;
  const t = doc.getElementById('t'), p = doc.getElementById('p');
  const cs = win.getComputedStyle(t), cp = win.getComputedStyle(p), cj = win.getComputedStyle(doc.querySelector('.caja'));
  return {
    fuentePx: parseFloat(cs.fontSize), alto: +t.getBoundingClientRect().height.toFixed(1),
    ancho: +t.getBoundingClientRect().width.toFixed(1), caja: +doc.querySelector('.caja').getBoundingClientRect().width.toFixed(1),
    normal: { lineHeight: cp.lineHeight, letterSpacing: cp.letterSpacing, pad: [cj.paddingTop, cj.paddingRight, cj.paddingBottom, cj.paddingLeft] },
    styleAttr: t.getAttribute('style'),
  };
});
const poner = (css) => page.evaluate((c) => { const t = document.getElementById('f').contentDocument.getElementById('t'); t.setAttribute('style', c); }, css);

let fallos = 0;
const check = (ok, n) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${n}`); };

console.log('Valores que entrega el navegador con "normal" (para medir el diseño):');
await cargar(800);
console.log('  ', JSON.stringify((await medir()).normal));

for (const ancho of [800, 375]) {
  await cargar(ancho);
  const base = await medir();
  console.log(`\nPantalla de ${ancho}px — el diseño solo:`);
  console.log(`   letra del título: ${base.fuentePx}px, alto ${base.alto}, ancho ${base.ancho} (caja ${base.caja})`);

  await poner('font-size: 32px'); const px = await medir();
  console.log(`   tamaño fijo 32px: ${px.fuentePx}px, alto ${px.alto}, ancho ${px.ancho}`);
  await poner('font-size: 0.85em'); const em = await medir();
  console.log(`   font-size 0.85em: ${em.fuentePx}px, alto ${em.alto}, ancho ${em.ancho}`);
  await poner('zoom: 0.8'); const z = await medir();
  console.log(`   zoom 0.8:        fuente calculada ${z.fuentePx}px, alto ${z.alto}, ancho ${z.ancho}  style="${z.styleAttr}"`);
  await poner('zoom: 1.2'); const z2 = await medir();
  console.log(`   zoom 1.2:        fuente calculada ${z2.fuentePx}px, alto ${z2.alto}, ancho ${z2.ancho}`);

  console.log(`   Resultados en ${ancho}px:`);
  check(Math.abs(px.alto / base.alto - 32 / base.fuentePx) < 0.03, `tamaño fijo 32px → cambia el tamaño SIN respetar el diseño (${(px.alto / base.alto).toFixed(2)}× el original)`);
  check(Math.abs(z.alto / base.alto - 0.8) < 0.02, `zoom 0.8 → el texto se ve un 20% más pequeño que el diseño (${(z.alto / base.alto).toFixed(2)}×)`);
  check(Math.abs(z2.alto / base.alto - 1.2) < 0.02, `zoom 1.2 → un 20% más grande que el diseño (${(z2.alto / base.alto).toFixed(2)}×)`);
  check(Math.abs(z.ancho / base.ancho - 1) < 0.01, `zoom 0.8 → el bloque conserva su ancho (${z.ancho} vs ${base.ancho})`);
  check(z.styleAttr.includes('zoom: 0.8') || z.styleAttr.includes('zoom:0.8'), `zoom se guarda en el HTML ("${z.styleAttr}")`);
  if (ancho === 375) {
    // La adaptación a la pantalla: sin tocar, el título mide distinto en 800 y en 375.
    const sinTocar800 = 48, sinTocar375 = 22.5; // 6vw
    check(Math.abs(base.fuentePx - sinTocar375) < 0.5, `el diseño solo se adapta: ${sinTocar800}px en computadora → ${base.fuentePx}px en celular`);
    check(Math.abs(px.fuentePx - 32) < 0.5, `tamaño fijo 32px en celular → ${px.fuentePx}px (IGUAL que en computadora: no se adapta)`);
    const escala = z.alto / base.alto;
    check(Math.abs(escala - 0.8) < 0.02, `zoom 0.8 en celular → sigue siendo 0.8× del diseño de CELULAR (${escala.toFixed(2)}× de ${base.fuentePx}px)`);
  }
}

// Interlineado y espacio entre letras: sin unidades y en "em" son relativos a
// la propia letra del elemento, en cualquier pantalla.
await cargar(375);
await poner('line-height: 2; letter-spacing: 0.2em');
const rel = await page.evaluate(() => {
  const win = document.getElementById('f').contentWindow, doc = document.getElementById('f').contentDocument;
  const t = doc.getElementById('t'), cs = win.getComputedStyle(t);
  return { fuente: parseFloat(cs.fontSize), entreLineas: parseFloat(cs.lineHeight), entreLetras: parseFloat(cs.letterSpacing) };
});
check(Math.abs(rel.entreLineas / rel.fuente - 2) < 0.02, `espacio entre renglones "2" = 2 veces la letra (${(rel.entreLineas / rel.fuente).toFixed(2)})`);
check(Math.abs(rel.entreLetras / rel.fuente - 0.2) < 0.01, `espacio entre letras "0.2em" = 0.2 veces la letra (${(rel.entreLetras / rel.fuente).toFixed(2)})`);

await browser.close();
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
