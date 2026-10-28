/* Auditoría de patrones repetidos en modulos-1/sets-fotos/.
 * Por tipo de módulo compara los 24 archivos entre sets: normaliza el HTML
 * (quita colores, keywords de loremflickr, nombres de fuente, ids del set,
 * tamaños de imagen) y mide similitud estructural con shingles de 5-gramas.
 * Se descarta PRIMERO el boilerplate obligatorio del contrato (vars CSS del
 * set, ORN_CSS, REVEAL_CSS, script de countdown): es idéntico POR DISEÑO en
 * todos los módulos de la plataforma y no diferencia visualmente nada.
 * Reporta las parejas con similitud > umbral (default 0.70). */
const { readFileSync, readdirSync, existsSync } = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..', 'modulos-1', 'sets-fotos');
const THRESHOLD = parseFloat(process.argv[2] || '0.70');
const TYPES = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles', 'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'];

/* Boilerplate compartido por diseño (contrato de la plataforma). */
const BOILER = [
  /<script>[\s\S]*?window\.updateCountdown[\s\S]*?<\/script>/, // contrato countdown
  /\.sf-orn-wrap \{[^}]*\}/g, /\.sf-orn-wrap svg \{[^}]*\}/g,   // ornamentos comunes
  /\[data-gemini-id\] \.rv-[\s\S]*?transition:none !important; \}/, // reveal común
  /var el = null;[\s\S]*?IntersectionObserver[\s\S]*?<\/script>/,  // script reveal
  /position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box;/ // base común
];

function normalize(html) {
  let h = html;
  for (const re of BOILER) h = h.replace(re, '');
  return h
    .replace(/https?:\/\/loremflickr\.com\/[^"')\s]+/gi, 'LOREM')      // fotos placeholder
    .replace(/#[0-9a-fA-F]{3,8}\b/g, 'COLOR')                           // colores
    .replace(/font-family:[^;"}]+;/g, 'FONT;')                          // fuentes
    .replace(/data-gemini-id="[^"]*"/g, 'GID')                          // ids (llevan num del set)
    .replace(/-sf\d+/g, '-sfN')                                         // sufijos por set
    .replace(/\bcd\d+__/g, 'cd__')                                      // prefijos countdown
    .replace(/'[^']*'\s*,\s*'[^']*'/g, 'WORDS')                         // keywords sueltas
    .replace(/\d+(\.\d+)?/g, 'N')                                       // números (tamaños, delays)
    .replace(/\s+/g, ' ')
    .trim();
}

function shingles(s, k = 5) {
  const out = new Set();
  const t = s.replace(/\s/g, '');
  for (let i = 0; i + k <= t.length; i++) out.add(t.slice(i, i + k));
  return out;
}

function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

if (!existsSync(ROOT)) { console.error('No existe ' + ROOT); process.exit(1); }
const sets = readdirSync(ROOT).filter((d) => /^set-\d+-/.test(d)).sort();

let totalDup = 0;
const summary = [];
for (const type of TYPES) {
  const files = sets.map((s) => {
    const f = readdirSync(join(ROOT, s)).find((x) => x.endsWith('-' + type + '.html'));
    return f ? { set: s, html: readFileSync(join(ROOT, s, f), 'utf-8') } : null;
  }).filter(Boolean);
  const norm = new Map(files.map((f) => [f.set, shingles(normalize(f.html))]));
  const pairs = [];
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const sim = jaccard(norm.get(files[i].set), norm.get(files[j].set));
      if (sim > THRESHOLD) pairs.push({ a: files[i].set, b: files[j].set, sim });
    }
  }
  totalDup += pairs.length;
  summary.push({ type, count: files.length, dupPairs: pairs.length });
  if (pairs.length) {
    console.log(`\n■ ${type} — ${pairs.length} pareja(s) > ${THRESHOLD}:`);
    for (const p of pairs.slice(0, 10)) console.log(`   ${(p.sim * 100).toFixed(0)}%  ${p.a}  ↔  ${p.b}`);
    if (pairs.length > 10) console.log(`   … y ${pairs.length - 10} más`);
  } else {
    console.log(`✓ ${type} — sin duplicados > ${THRESHOLD}`);
  }
}
console.log('\n════════════════════════════════════');
console.log(`TOTAL parejas duplicadas: ${totalDup}`);
console.log(`RESUMEN: ${summary.map((s) => `${s.type}:${s.dupPairs}`).join('  ')}`);
process.exit(0);
