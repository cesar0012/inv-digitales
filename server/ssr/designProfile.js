/**
 * ============================================================================
 * PERFIL DE DISEÑO — la base de la unicidad de las páginas de producto
 * ============================================================================
 * Implementa F1/F2 del fix-list: cada diseño del catálogo tiene un PERFIL
 * extraído de su propia invitación (evento real, tema, colores del CSS,
 * títulos de sus secciones, taglines, itinerario). Todo el copy de la
 * "zona de diseño" de la página (hero, about, por qué funciona, ejemplos,
 * alt) se construye DESDE el perfil: dos diseños distintos producen textos
 * distintos medibles (compuerta de unicidad en uniqueness.js).
 * ============================================================================
 */
import { detectarFamiliaTematica } from '../agentOrchestrator.js';

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const sinTags = (h) => String(h || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// ---------------------------------------------------------------------------
// Color hex → nombre en español (para copy y confirmación humana)
// ---------------------------------------------------------------------------
const NOMBRES_COLOR = [
  [/^#(9354b6|8e44ad|7d3c98|6c3483)/i, 'púrpura'], [/^#(b8324f|c0392b|e74c3c|ff4d6d)/i, 'rosa'],
  [/^#(e8735f|e67e22|f39c12)/i, 'coral'], [/^#(b89a63|d4af37|c9a227|daa520)/i, 'dorado'],
  [/^#(1f6193|2c5f8a|2471a3|1a5276)/i, 'azul'], [/^#(6d6d6d|7f8c8d|95a5a6)/i, 'gris'],
  [/^#(27ae60|2e7d32|1e8449)/i, 'verde'], [/^#(f5cba7|f9e79f|fdf2e9)/i, 'beige'],
  [/^#(000)/i, 'negro'], [/^#(fff|faf)/i, 'blanco'],
  [/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i, 'gris']
];
export const nombreDeColor = (hex) => {
  const h = String(hex || '').toLowerCase();
  for (const [re, nombre] of NOMBRES_COLOR) if (re.test(h)) return nombre;
  // aproximación por tono para hex desconocidos
  const m = h.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '';
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 24) return max > 200 ? 'blanco' : max < 70 ? 'negro' : 'gris';
  if (max === r) return g > b ? (g > 150 ? 'amarillo' : 'coral') : 'rosa';
  if (max === g) return 'verde';
  return b > 150 ? 'azul' : 'púrpura';
};

const EVENTO_LABELS = { boda: 'Boda', 'xv-anos': 'XV años', bautizo: 'Bautizo', comunion: 'Primera comunión', confirmacion: 'Confirmación', 'baby-shower': 'Baby shower', cumpleanos: 'Cumpleaños', graduacion: 'Graduación' };
const SLUG_EVENTO = { boda: 'boda', 'xv-anos': 'xv-anos', bautizo: 'bautizo', comunion: 'comunion', confirmacion: 'confirmacion', 'baby-shower': 'baby-shower', cumpleanos: 'cumpleanos', graduacion: 'graduacion' };

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Detecta el evento REAL desde el contenido de la invitación (no desde lo
 * que diga la fila del catálogo): "Mis XV años"/quinceañera → xv; señales
 * de boda → boda. F4: el diseño de París dice "Mis XV años" aunque la fila
 * diga cumpleaños.
 */
export function eventoRealDesdeHtml(html) {
  const texto = sinTags(html).toLowerCase();
  const señalesXV = (texto.match(/mis xv años|quinceañera|chambelanes|mis quince/g) || []).length;
  const señalesBoda = (texto.match(/nuestra boda|our wedding|nuestros padres|los novios|padre del novio|madre de la novia/g) || []).length;
  if (señalesXV > señalesBoda && señalesXV > 0) return 'xv-anos';
  if (señalesBoda > 0) return 'boda';
  return null;
}

/**
 * EXTRAER el perfil de diseño desde el HTML de la invitación.
 * @param {string} html  contenido del .html del histórico
 * @param {object} item  fila del catálogo (filename, title…) para pistas
 */
export function extraerPerfilDiseno(html, item = {}) {
  const perfil = {
    design_id: item.filename || '',
    event: { key: '', label: '', confirmed: false },
    design_name: norm(item.title || '').replace(/ - .*$/, '') || 'Diseño',
    theme: { key: '', label: '', confirmed: false },
    colors: { main: [], confirmed: false },
    style: ['elegante'],
    signature_lines: [],
    sections_actual: [],
    itinerary_sample: [],
    primary_query: ''
  };

  // 1) Evento real desde el contenido
  const evHtml = eventoRealDesdeHtml(html);
  perfil.event.key = evHtml || SLUG_EVENTO[norm(item.slug || '').split('/')[0]] || 'xv-anos';
  perfil.event.label = EVENTO_LABELS[perfil.event.key] || 'Invitación digital';

  // 2) Tema: PRIMERO por los ids de módulo del rack embebidos en el HTML
  // (sf-<familia>-…: determinista), luego por lenguaje del usuario.
  const conteoFamilias = {};
  for (const m of html.matchAll(/sf-([a-z]+(?:-el-mar)?)-/g)) {
    conteoFamilias[m[1]] = (conteoFamilias[m[1]] || 0) + 1;
  }
  const mejorFamilia = Object.entries(conteoFamilias).sort((a, b) => b[1] - a[1])[0];
  if (mejorFamilia && mejorFamilia[1] >= 2) {
    perfil.theme.key = mejorFamilia[0];
  } else {
    const pistaTema = `${norm(item.title)} ${norm(item.slug)} ${sinTags(html).slice(0, 8000)}`;
    perfil.theme.key = detectarFamiliaTematica(pistaTema) || '';
  }
  perfil.theme.label = perfil.theme.key
    ? { metamorfosis: 'Mariposas', paris: 'Luces de París', bosque: 'Bosque encantado', vaquera: 'Vaquera', charra: 'Charra', estrellada: 'Noche estrellada', invierno: 'Invierno', carnaval: 'Carnaval', tropical: 'Tropical', vinedo: 'Viñedo', prisma: 'Prisma', rustico: 'Rústica', acuarela: 'Acuarela', boho: 'Boho', galaxia: 'Galaxia', gatsby: 'Gatsby', gotico: 'Gótica', cenicienta: 'Cuento de hadas', cerezos: 'Cerezos en flor', 'bajo-el-mar': 'Bajo el mar', aurum: 'Aurum', neon: 'Neón', orbita: 'Órbita', elegancia: 'Elegancia clásica', premium: 'Premium' }[perfil.theme.key] || perfil.theme.key
    : '';

  // 3) Colores reales: variables CSS del propio diseño
  const hexes = [...html.matchAll(/--(?:primary|secondary|accent|t-l|t-d)[a-z-]*\s*:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1]);
  const unicos = [...new Set(hexes)];
  perfil.colors.main = unicos.slice(0, 2).map((hex) => ({ name: nombreDeColor(hex), hex: hex.toLowerCase() }));
  if (!perfil.colors.main.length && /^#[0-9a-f]{6}$/i.test(item.primary_color || '')) {
    perfil.colors.main = [item.primary_color.toLowerCase(), item.secondary_color].filter(Boolean).map((hex) => ({ name: nombreDeColor(hex), hex }));
  }

  // 4) Títulos propios de las secciones (los que el cliente verá)
  const TIPOS = ['portada', 'padres', 'countdown', 'itinerario', 'ubicacion', 'padrinos', 'corte', 'detalles', 'confirmacion', 'galeria', 'vestimenta', 'regalos'];
  const TITULOS_FALLBACK = { portada: 'Portada', padres: 'Mis padres', countdown: 'Cuenta regresiva', itinerario: 'Itinerario', ubicacion: 'Ubicación', padrinos: 'Mis padrinos', corte: 'Corte de honor', detalles: 'Detalles', confirmacion: 'Confirmación', galeria: 'Galería', vestimenta: 'Código de vestimenta', regalos: 'Mesa de regalos' };
  const secs = [...html.matchAll(/<section[^>]*data-gemini-id="([a-z]+)-[^"]*"[^>]*>([\s\S]*?)<\/section>/gi)];
  const vistos = new Set();
  for (const [, tipo, cuerpo] of secs) {
    if (!TIPOS.includes(tipo) || vistos.has(tipo)) continue;
    vistos.add(tipo);
    const h = cuerpo.match(/<h[12][^>]*>([^<]{2,60})<\/h[12]>/i);
    let titulo = h ? norm(h[1]) : '';
    if (titulo && !/nombre|falta muy poco|falta poco/i.test(titulo)) perfil.sections_actual.push({ key: tipo, own_title: titulo });
    else perfil.sections_actual.push({ key: tipo, own_title: TITULOS_FALLBACK[tipo] || tipo });
  }
  if (!perfil.sections_actual.length) perfil.sections_actual = TIPOS.slice(0, 7).map((k) => ({ key: k, own_title: TITULOS_FALLBACK[k] || k }));

  // 5) Taglines de la portada (frases propias del diseño)
  const portada = secs.find((s) => s[1] === 'portada');
  if (portada) {
    const frases = [...portada[2].matchAll(/<(?:p|h[1-3]|span|em)[^>]*>([^<]{8,70})</g)].map((m) => norm(m[1])).filter((t) => /[a-záéíóúñ]{3}/i.test(t) && !/^\s*(nombre|title|tu )/i.test(t));
    perfil.signature_lines = [...new Set(frases)].slice(0, 3);
  }

  // 6) Itinerario real (primeros 6 hitos)
  const itin = secs.find((s) => s[1] === 'itinerario');
  if (itin) {
    const hitos = [...itin[2].matchAll(/<h[34][^>]*>([^<]{3,50})</g)].map((m) => norm(m[1])).filter((t) => !/itinerario|programa/i.test(t));
    perfil.itinerary_sample = [...new Set(hitos)].slice(0, 6);
  }

  // 7) Intención de búsqueda primaria (F2): evento + tema — única por página
  const evLow = perfil.event.label.toLowerCase();
  perfil.primary_query = perfil.theme.label
    ? `invitación digital ${evLow} ${perfil.theme.label.toLowerCase()}`
    : `invitación digital de ${evLow}`;

  return perfil;
}

// ---------------------------------------------------------------------------
// COPY desde el perfil: cada texto de la zona de diseño usa los datos reales
// del diseño (tema, colores, taglines, secciones, itinerario). Dos diseños
// distintos → textos distintos.
// ---------------------------------------------------------------------------
const listaColores = (p) => (p.colors.main || []).map((c) => c.name).filter(Boolean).join(' y ');
const fraseColores = (p) => {
  const c = listaColores(p);
  if (!c) return '';
  return ` en ${c}`;
};

export function construirSeoDesdePerfil(p) {
  const ev = p.event.label;
  const evLow = ev.toLowerCase();
  const tema = p.theme.label;
  const colores = listaColores(p);
  const que = tema ? `${evLow} con tema de ${tema.toLowerCase()}` : evLow;
  const title = `${tema ? `Invitación Digital ${ev} ${tema}` : `Invitación Digital ${ev} Elegante`} | Personalízala`.slice(0, 60);
  const h1 = tema
    ? `Invitación de ${evLow} ${colores ? `con toques ${colores} y ` : ''}tema de ${tema.toLowerCase()}`
    : `Invitación digital de ${evLow} para tu celebración`;
  const secciones = (p.sections_actual || []).slice(0, 3).map((s) => s.own_title.toLowerCase()).join(', ');
  const meta = `Invitación digital de ${evLow}${tema ? ` con tema de ${tema.toLowerCase()}` : ''}${colores ? ` y detalles ${colores}` : ''}. Incluye ${secciones || 'cuenta regresiva, itinerario y mapa'}. Personalízala hoy.`.slice(0, 160);
  return { title, h1, meta, primary_query: p.primary_query };
}

// Nota por sección adaptada al evento (F11) CON variantes por diseño: las
// notas no comparten redacción entre páginas de producto (compuerta F3).
export function notaDeSeccion(tipo, eventoKey, perfil) {
  const boda = eventoKey === 'boda';
  const hash = String((perfil && perfil.design_id) || tipo || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const elegir = (v) => v[hash % v.length];
  const NOTAS = {
    portada: elegir([boda ? 'la portada presenta a los novios con sus nombres' : 'la portada presenta al festejado con su nombre',
      boda ? 'los nombres de los novios abren la invitación' : 'el nombre del festejado abre la invitación',
      boda ? 'sus dos nombres dan la bienvenida' : 'su nombre da la bienvenida']),
    padres: elegir([boda ? 'las dos familias acompañan con su bendición' : 'los papás del festejado acompañan con su bendición',
      boda ? 'ambas familias firman la invitación' : 'la bendición de sus papás encabeza el agradecimiento',
      boda ? 'padres de los dos novios, cada uno en su lugar' : 'un espacio para el cariño de sus papás']),
    padrinos: elegir([boda ? 'las parejas de padrinos de la boda' : 'las parejas de padrinos del festejado',
      boda ? 'quienes apadrinan la boda, con su nombre' : 'madrinas y padrinos con su nombre y foto',
      'cada pareja de padrinos con su lugar propio']),
    countdown: elegir(['los días restantes se actualizan solos cada vez que se abre el enlace',
      'cuenta los días, horas y minutos faltantes en tiempo real',
      'el conteo avanza solo hasta el momento de la celebración']),
    itinerario: (perfil && (perfil.itinerary_sample || []).length)
      ? elegir([`el programa real de la celebración: ${(perfil.itinerary_sample || []).slice(0, 3).join(', ')}`,
        `cada momento con su hora: ${(perfil.itinerary_sample || []).slice(0, 3).join(', ')}`,
        `de ${(perfil.itinerary_sample || [])[0] || 'la bienvenida'} a ${(perfil.itinerary_sample || [])[(perfil.itinerary_sample || []).length - 1] || 'el baile'}, con horas`])
      : 'cada momento de la celebración con su hora',
    ubicacion: elegir(['el lugar con un mapa que se abre con un toque',
      'la dirección con mapa incluido, lista para abrir',
      'donde será la celebración, con su mapa un toque lejos']),
    corte: eventoKey === 'xv-anos'
      ? elegir(['damas y chambelanes rodean al festejado', 'su corte de honor la acompaña toda la noche', 'chambelanes y damas con nombre y foto'])
      : elegir(['amigos especiales acompañan a los novios', 'el corte que acompaña a los novios', 'damas y caballeros junto a los novios']),
    detalles: elegir(['información adicional para tus invitados', 'datos útiles y notas de la celebración', 'lo que tus invitados necesitan saber además']),
    confirmacion: elegir(['tus invitados confirman su asistencia (Plan Creativo o Premium)', 'RSVP directo desde la invitación (Creativo o Premium)', 'confirmación con un toque (planes Creativo y Premium)']),
    galeria: elegir(['las fotos que elijas con el mismo estilo del diseño', 'tus fotos favoritas en el mismo estilo', 'una galería con tus mejores momentos']),
    vestimenta: elegir(['la etiqueta y los tonos sugeridos para vestir', 'código de vestimenta con tonos sugeridos', 'qué vestir y qué colores reservar']),
    regalos: elegir(['tu mesa de regalos o mensaje especial', 'regalos y dedicatorias en el mismo estilo', 'un rincón para tus regalos'])
  };
  return NOTAS[tipo] || 'una sección pensada para tu celebración';
}

export function construirZonaDeDiseno(p) {
  const ev = p.event.label;
  const evLow = ev.toLowerCase();
  const tema = p.theme.label;
  const temaLow = tema ? tema.toLowerCase() : '';
  const colores = listaColores(p);
  const taglines = (p.signature_lines || []).filter(Boolean);
  const tagline = taglines[0] || '';
  const seccionesTodas = (p.sections_actual || []).map((s) => s.own_title);
  const incluye = seccionesTodas.slice(0, 4).join(', ').toLowerCase();
  const itin = (p.itinerary_sample || []).slice(0, 3).join(', ');
  const itinFull = (p.itinerary_sample || []).slice(0, 6).join(', ');

  // Variantes de scaffold por diseño (deterministas por design_id): dos
  // diseños no comparten ni el esqueleto de sus frases — la zona de diseño
  // queda dominada por datos reales del diseño, no por conectores comunes.
  const hash = String(p.design_id || tema || ev).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // salt por bloque: cada bloque gira el ciclo de variantes de forma
  // independiente para que dos diseños no compartan esqueleto completo
  let _salto = 0;
  const elegir = (variantes) => variantes[(hash + _salto++) % variantes.length];

  const hero = elegir([
    `Esta invitación digital de ${evLow}${temaLow ? ` con tema de ${temaLow}` : ''}${fraseColores(p)}${tagline ? `, que abre con “${tagline}”` : ''}, reúne ${incluye || 'los momentos de la celebración'} en un solo enlace. Quien la recibe por WhatsApp ${itin ? `recorre el programa — ${itin} —` : 've cada detalle del evento'} sin descargar nada.`,
    `Diseñada para ${evLow === 'xv años' ? 'unos XV años' : `una ${evLow}`}${temaLow ? ` con espíritu de ${temaLow}` : ''}${fraseColores(p)}${tagline ? ` y la frase “${tagline}” en la portada` : ''}: ${incluye || 'cada momento de la celebración'} en un enlace que se abre al instante. ${itin ? `El programa va de ${itin}.` : 'Nada se pierde: cada dato está a un toque.'}`,
    `Una invitación de ${evLow}${temaLow ? ` inspirada en ${temaLow}` : ''}${fraseColores(p)}${taglines[1] ? `, donde “${taglines[1]}” acompaña la bienvenida` : ''}. Incluye ${incluye || 'todas las secciones de la celebración'} y se lee en cualquier celular; ${itin ? `el programa avanza con ${itin}` : 'todos los datos del evento quedan a la vista'}.`,
    `Todo tu ${evLow === 'xv años' ? 'XV' : evLow} cabe aquí: ${incluye || 'la celebración completa'}${temaLow ? ` bajo la atmósfera de ${temaLow}` : ''}${fraseColores(p)}${tagline ? ` y el saludo “${tagline}”` : ''}. Un enlace la entrega en el celular de cada invitado${itin ? `; el programa incluye ${itin}` : ''}.`,
    `De la primera pantalla — ${tagline ? `“${tagline}”` : (temaLow || evLow)} — al mapa del lugar: ${incluye || 'cada sección de la celebración'}${temaLow ? ` con el sello de ${temaLow}` : ''}${fraseColores(p)}. Por WhatsApp, ${itin ? `con el programa a la vista (${itin})` : 'con cada dato listo'}, llega a todos tus invitados.`
  ]);

  const about1 = elegir([
    temaLow
      ? `Cada detalle de esta invitación nace del tema de ${temaLow}${colores ? `: la paleta ${colores}, la tipografía y las ilustraciones` : ': la tipografía y las ilustraciones'} siguen la misma idea de principio a fin. ${tagline ? `“${tagline}” da el primer saludo y marca el tono de toda la celebración.` : 'La portada abre la celebración y el resto de secciones la continúan con el mismo estilo.'}`
      : `Esta invitación de ${evLow} se diseñó para leerse clara y elegante en el celular${fraseColores(p)}: la tipografía, los acentos y el ritmo visual acompañan la celebración de la primera pantalla al mapa final.`,
    temaLow
      ? `El tema de ${temaLow} no es un adorno: define la paleta${colores ? ` (${colores})` : ''}, las letras y cada ilustración de la invitación. ${taglines[1] ? `Frases como “${taglines[1]}” aparecen donde el invitado menos las espera y le meten en la fiesta desde el primer toque.` : 'Cada sección retoma la misma atmósfera, para que la invitación se sienta como un solo diseño y no como piezas sueltas.'}`
      : `Pensada para ${evLow === 'xv años' ? 'una quinceañera' : `una ${evLow}`}${colores ? ` que ama los tonos ${colores}` : ''}: la invitación mantiene un estilo uniforme en cada sección y un cuidado tipográfico que se nota desde la portada.`,
    temaLow
      ? `La idea de ${temaLow} recorre la invitación completa${colores ? ` con su paleta ${colores}` : ''}: portada, cuenta regresiva y mapa comparten ilustraciones y letras del mismo mundo. ${tagline ? `El saludo “${tagline}” resume el ambiente que tus invitados encontrarán.` : 'El resultado es una invitación que se reconoce de un vistazo.'}`
      : `Una invitación de ${evLow} con oficio: jerarquía clara, ${colores ? `paleta ${colores} bien dosificada` : 'paleta bien dosificada'} y secciones que se descubren una tras otra con naturalidad.`
  ]);

  const about2 = elegir([
    `El recorrido de tus invitados pasa por ${seccionesTodas.slice(0, 6).join(', ').toLowerCase() || 'portada, itinerario y ubicación'}${itinFull ? `; el programa de la celebración incluye ${itinFull}` : ''}, y el mapa del lugar se abre con un toque desde el propio teléfono.`,
    `De la portada al mapa: ${(seccionesTodas.slice(0, 3).join(', ') || 'portada, itinerario, mapa').toLowerCase()}${seccionesTodas.length > 3 ? ` y ${seccionesTodas.length - 3} secciones más` : ''}. ${itinFull ? `El itinerario marca el paso — ${itinFull} —` : 'Cada dato del evento está donde se espera'} y la ubicación llega con su mapa listo para abrir.`,
    `Tus invitados entran por la portada y siguen ${seccionesTodas.slice(1, 5).join(', ').toLowerCase() || 'la cuenta regresiva y el itinerario'}${itinFull ? `, con el programa completo: ${itinFull}` : ''}; al final, el mapa del salón se abre en su celular sin buscar direcciones.`,
    `Sección tras sección — ${seccionesTodas.slice(0, 4).join(', ').toLowerCase() || 'portada, cuenta regresiva, itinerario'}${seccionesTodas.length > 4 ? '…' : ''} — la invitación va guiando la celebración${itinFull ? `: ${itinFull}` : ''}, hasta dejar a cada invitado frente al mapa del lugar.`,
    `Nada de PDFs ni fotografías sueltas: aquí la invitación se recorre viva, de ${seccionesTodas[0] ? seccionesTodas[0].toLowerCase() : 'la portada'} a ${seccionesTodas.length ? seccionesTodas[seccionesTodas.length - 1].toLowerCase() : 'el mapa'}${itinFull ? `, con el programa (${itinFull}) dentro` : ''}.`
  ]);

  const porQue = [
    elegir([
      temaLow ? `El tema de ${temaLow} le da a tu ${evLow} una identidad que tus invitados recuerdan.` : `Todo lo importante de tu ${evLow} queda en un solo enlace.`,
      temaLow ? `Ninguna otra invitación de ${evLow} se confunde con la tuya: ${temaLow} la hace inconfundible.` : `Tu ${evLow} tiene su propio sello en cada sección.`,
      temaLow ? `${tema} no es solo el nombre: es lo que tus invitados ven en cada sección.` : `La invitación cuenta tu ${evLow} con un estilo propio.`
    ]),
    elegir([
      colores ? `La paleta ${colores} se mantiene en cada sección y combina con tu decoración.` : `El estilo visual se mantiene idéntico de la portada al mapa.`,
      colores ? `Los tonos ${colores} visten cada sección y puedes ajustarlos a tu fiesta (Plan Creativo o Premium).` : `Cada sección conserva el mismo aire de diseño, sin costuras.`,
      colores ? `Del encabezado al mapa, el ${colores} acompaña sin invadir.` : `La paleta está dosificada: elegante, nunca recargada.`
    ]),
    elegir([
      itin ? `El programa (${itin}) ordena la noche y nadie se pierde un momento.` : `El itinerario ordena la celebración de principio a fin.`,
      itinFull ? `Tus invitados saben a qué hora ${itin} sin preguntar.` : `Cada momento tiene su hora y su lugar en la invitación.`,
      itin ? `Con el programa a la vista — ${itin} — la celebración fluye sola.` : `La agenda queda clara para todos desde el primer toque.`
    ]),
    elegir([
      `Se reenvía con un toque por WhatsApp y abre en cualquier celular.`,
      `Sin apps ni descargas: el enlace funciona en el teléfono de todos.`,
      `Un enlace, todos tus invitados: se abre al instante donde lo compartas.`
    ])
  ];

  const ejemplos = [
    elegir([
      temaLow ? `Agrega una sección de música con el ambiente de ${temaLow}.` : `Agrega una sección de música con el mismo ambiente.`,
      temaLow ? `Que la música entre con el espíritu de ${temaLow}.` : `Agrega música de fondo con este estilo.`
    ]),
    elegir([
      colores ? `Crea una cuenta regresiva con los tonos ${colores} más marcados.` : `Haz la cuenta regresiva más llamativa con el mismo estilo.`,
      colores ? `Una cuenta regresiva donde el ${colores} brille más.` : `Rediseña la cuenta regresiva con más detalle.`
    ]),
    `Haz la confirmación de asistencia más elegante.`,
    elegir([
      temaLow ? `Agrega una galería con el aire de ${temaLow}.` : `Agrega una galería de fotos más grande.`,
      temaLow ? `Una galería que siga el mood de ${temaLow}.` : `Galería de fotos con el mismo diseño.`
    ]),
    elegir([
      colores ? `Cambia el código de vestimenta a otro tono ${colores}.` : `Actualiza el código de vestimenta con otro tono de la paleta.`,
      colores ? `Ajusta la vestimenta a los tonos ${colores}.` : `Renueva el código de vestimenta con este estilo.`
    ]),
    `Agrega la mesa de regalos con el mismo diseño.`
  ];

  const alt = elegir([
    `Invitación digital de ${evLow}${temaLow ? ` con tema de ${temaLow}` : ''}${colores ? ` en tonos ${colores}` : ''} vista en un celular`,
    `Invitación de ${evLow}${colores ? ` con detalles ${colores}` : ''}${temaLow ? ` y tema de ${temaLow}` : ''} abierta en un teléfono`,
    `Diseño de invitación digital para ${evLow}${temaLow ? ` — ${temaLow}` : ''}${colores ? ` (${colores})` : ''} en pantalla de celular`
  ]);

  return { hero, about1, about2, porQue, ejemplos, alt, colores, tema, ev, evLow };
}

/**
 * Slug limpio desde el perfil (F8): /[evento]/invitacion-digital-[tema](-[color])/
 * sin IDs aleatorios ni palabras repetidas.
 */
export function slugDesdePerfil(p) {
  const ev = SLUG_EVENTO[p.event.key] || 'invitacion';
  const partes = ['invitacion-digital'];
  if (p.theme.key && !['elegancia', 'premium'].includes(p.theme.key)) partes.push(slugify(p.theme.label || p.theme.key));
  const colores = (p.colors.main || []).map((c) => slugify(c.name)).filter(Boolean).slice(0, 1);
  if (colores.length && partes.length < 3) partes.push(colores[0]);
  const slug = `${ev}/${partes.join('-')}`;
  return slug;
}
