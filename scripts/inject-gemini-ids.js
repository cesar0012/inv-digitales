import fs from 'fs';
import path from 'path';
import { parseHTML } from 'linkedom';

const INPUT_DIR = 'invitaciones_generadas';
const OUTPUT_DIR = 'invitaciones_generadas/adapted';

const SECTION_TO_MODULE = {
  inicio: 'portada',
  hero: 'portada',
  historia: 'padres',
  familia: 'padres',
  detalles: 'detalles',
  fecha: 'detalles',
  ceremonia: 'ubicacion',
  lugar: 'ubicacion',
  ubicacion: 'ubicacion',
  banquete: 'itinerario',
  itinerario: 'itinerario',
  ritual: 'itinerario',
  vestimenta: 'vestimenta',
  codigo: 'vestimenta',
  attire: 'vestimenta',
  galeria: 'galeria',
  rsvp: 'confirmacion',
  confirmacion: 'confirmacion',
  confirmar: 'confirmacion',
};

const EDITABLE_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'img', 'button', 'li', 'label', 'textarea', 'input'];

const TAG_TYPE_MAP = {
  h1: 'titulo',
  h2: 'titulo',
  h3: 'titulo',
  h4: 'titulo',
  h5: 'titulo',
  h6: 'titulo',
  p: 'texto',
  span: 'texto',
  a: 'enlace',
  img: 'imagen',
  button: 'boton',
  li: 'item',
  label: 'etiqueta',
  textarea: 'campo',
  input: 'campo',
};

function getModuleForElement(el, document) {
  let current = el;
  while (current && current !== document.body) {
    const id = current.getAttribute && current.getAttribute('id');
    if (id && SECTION_TO_MODULE[id]) {
      return SECTION_TO_MODULE[id];
    }
    if (id && id.startsWith('countdown')) {
      return 'countdown';
    }
    if (id && id.startsWith('inferred-')) {
      const parts = id.split('-');
      if (parts.length >= 2) return parts[1];
    }
    current = current.parentElement;
  }
  return null;
}

const CONTENT_KEYWORDS = [
  { module: 'portada', keywords: ['invitarle', 'honor', 'gran velada', 'bienvenido'] },
  { module: 'detalles', keywords: ['sabado', 'domingo', 'viernes', 'octubre', 'noviembre', 'diciembre', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'fecha', 'hora'] },
  { module: 'itinerario', keywords: ['programa', 'itinerario', 'agenda', 'velada', 'banquete'] },
  { module: 'ubicacion', keywords: ['lugar', 'ubicacion', 'recinto', 'sede', 'direccion', 'mapa'] },
  { module: 'vestimenta', keywords: ['vestimenta', 'dress code', 'codigo', 'etiqueta', 'attire'] },
  { module: 'confirmacion', keywords: ['confirmar', 'confirmacion', 'rsvp', 'respuesta', 'requerida', 'sello'] },
  { module: 'padres', keywords: ['padres', 'familia', 'historia', 'linaje'] },
  { module: 'galeria', keywords: ['galeria', 'fotos', 'recuerdos', 'texturas'] },
];

function inferModuleFromContent(text) {
  const lower = text.toLowerCase();
  for (const { module, keywords } of CONTENT_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return module;
  }
  return null;
}

function tagSectionsWithoutId(document) {
  const sections = document.querySelectorAll('section, article, header.hero, footer');
  let tagged = 0;
  sections.forEach((section, index) => {
    if (section.getAttribute('id')) return;
    const text = (section.textContent || '').trim().substring(0, 200);
    const module = inferModuleFromContent(text);
    if (module) {
      section.setAttribute('id', `inferred-${module}-${index}`);
      tagged++;
    }
  });
  return tagged;
}

function processFile(filename) {
  const filePath = path.join(INPUT_DIR, filename);
  const html = fs.readFileSync(filePath, 'utf8');
  const { document } = parseHTML(html);

  const taggedCount = tagSectionsWithoutId(document);
  if (taggedCount > 0) {
    console.log(`  (pre-tagged ${taggedCount} sections without ID by content inference)`);
  }

  const counters = {};
  let injected = 0;

  for (const tag of EDITABLE_TAGS) {
    const elements = document.querySelectorAll(tag);
    for (const el of elements) {
      if (el.hasAttribute('data-gemini-id')) continue;

      const module = getModuleForElement(el, document);
      if (!module) continue;

      const type = TAG_TYPE_MAP[tag] || 'elemento';
      const key = `${module}-${type}`;
      counters[key] = (counters[key] || 0) + 1;
      const geminiId = `${key}-${counters[key]}`;

      el.setAttribute('data-gemini-id', geminiId);
      injected++;
    }
  }

  const result = document.toString();
  const outPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outPath, result, 'utf8');

  console.log(`✓ ${filename}: ${injected} data-gemini-id injected`);
  console.log(`  Modules: ${Object.entries(counters).map(([k, v]) => `${k}(${v})`).join(', ')}`);
  return { filename, injected, counters };
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.html'));
console.log(`Processing ${files.length} templates...\n`);

let total = 0;
for (const file of files) {
  const r = processFile(file);
  total += r.injected;
}
console.log(`\nDone. Total: ${total} data-gemini-id attributes injected across ${files.length} templates.`);
console.log(`Output: ${OUTPUT_DIR}/`);