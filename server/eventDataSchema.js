/**
 * ============================================================================
 * EVENT DATA SCHEMA — esquema de datos específicos por tipo de evento
 * ============================================================================
 * Módulo PURE (sin imports): lo usa el SERVIDOR (endpoint de IA) y el CLIENTE
 * (EditorView: formulario durante la generación + pase determinista con
 * DOMParser). El servidor además usa linkedom, que expone la misma API DOM
 * que DOMParser para las funciones de abajo.
 *
 * Contiene:
 *  1. SCHEMAS: campos a pedirle al cliente por tipo de evento
 *  2. resolveSchema(eventType): mapeo difuso del nombre del evento al esquema
 *  3. Motor determinista: coloca los datos en los módulos generados usando
 *     los placeholders canónicos del 00-PROMPT-BASE + atributos memory_*
 *  4. collectTextTargets / applyTextByIndex: índice compacto para el pase IA
 *     (ahorra tokens: nunca viaja el HTML completo ni las imágenes base64)
 */

// ---------------------------------------------------------------------------
// 1. Catálogo de esquemas por tipo de evento
// ---------------------------------------------------------------------------
// field: { key, label, type: text|date|time|textarea, required, placeholder, prefill }

const FIELD_FECHA = { key: 'fecha', label: 'Fecha del evento', type: 'date', required: true, prefill: true, help: 'Ya la tomamos del generador; confírmala.' };
const FIELD_HORA = { key: 'hora', label: 'Hora del evento', type: 'time', required: true, prefill: true, help: 'Ya la tomamos del generador; confírmala.' };

const SCHEMAS = {
  boda: {
    label: 'Boda',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombres_novia', label: 'Nombre de la novia', type: 'text', required: true, placeholder: 'Nombre y apellido' },
      { key: 'nombres_novio', label: 'Nombre del novio', type: 'text', required: true, placeholder: 'Nombre y apellido' },
      { key: 'padres_novia', label: 'Padres de la novia', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padres_novio', label: 'Padres del novio', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padrinos', label: 'Padrinos / Madrinas', type: 'text', placeholder: 'Nombre Padrino & Nombre Madrina' },
      { key: 'lugar_ceremonia', label: 'Lugar de la ceremonia', type: 'text', required: true, placeholder: 'Iglesia / jardín / salón' },
      { key: 'direccion_ceremonia', label: 'Dirección de la ceremonia', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'lugar_recepcion', label: 'Lugar de la recepción', type: 'text', placeholder: 'Nombre del salón' },
      { key: 'codigo_vestimenta', label: 'Código de vestimenta', type: 'text', placeholder: 'Formal, black tie, etc.' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date', placeholder: '' },
      { key: 'mesa_regalos', label: 'Mesa de regalos / sugerencia', type: 'text', placeholder: 'Tienda, sobre, experiencia' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea', placeholder: '16:00 Ceremonia\n18:00 Recepción\n20:00 Cena\n22:00 Fiesta' }
    ]
  },
  boda_gay_h: {
    label: 'Boda',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombres_novia', label: 'Nombre del novio 1', type: 'text', required: true, placeholder: 'Nombre y apellido' },
      { key: 'nombres_novio', label: 'Nombre del novio 2', type: 'text', required: true, placeholder: 'Nombre y apellido' },
      { key: 'padres_novia', label: 'Padres del novio 1', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padres_novio', label: 'Padres del novio 2', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padrinos', label: 'Padrinos / Madrinas', type: 'text', placeholder: 'Nombre Padrino & Nombre Madrina' },
      { key: 'lugar_ceremonia', label: 'Lugar de la ceremonia', type: 'text', required: true, placeholder: 'Iglesia / jardín / salón' },
      { key: 'direccion_ceremonia', label: 'Dirección de la ceremonia', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'lugar_recepcion', label: 'Lugar de la recepción', type: 'text', placeholder: 'Nombre del salón' },
      { key: 'codigo_vestimenta', label: 'Código de vestimenta', type: 'text', placeholder: 'Formal, black tie, etc.' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'mesa_regalos', label: 'Mesa de regalos / sugerencia', type: 'text' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  boda_gay_m: {
    label: 'Boda',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombres_novia', label: 'Nombre de la novia 1', type: 'text', required: true, placeholder: 'Nombre y apellido' },
      { key: 'nombres_novio', label: 'Nombre de la novia 2', type: 'text', required: true, placeholder: 'Nombre y apellido' },
      { key: 'padres_novia', label: 'Padres de la novia 1', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padres_novio', label: 'Padres de la novia 2', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padrinos', label: 'Padrinos / Madrinas', type: 'text', placeholder: 'Nombre Padrino & Nombre Madrina' },
      { key: 'lugar_ceremonia', label: 'Lugar de la ceremonia', type: 'text', required: true, placeholder: 'Iglesia / jardín / salón' },
      { key: 'direccion_ceremonia', label: 'Dirección de la ceremonia', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'lugar_recepcion', label: 'Lugar de la recepción', type: 'text', placeholder: 'Nombre del salón' },
      { key: 'codigo_vestimenta', label: 'Código de vestimenta', type: 'text', placeholder: 'Formal, black tie, etc.' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'mesa_regalos', label: 'Mesa de regalos / sugerencia', type: 'text' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  xv: {
    label: 'XV Años',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombre_homenajeada', label: 'Nombre de la quinceañera', type: 'text', required: true, placeholder: 'Nombre y apellido' },
      { key: 'padres', label: 'Papás de la quinceañera', type: 'text', required: true, placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padrinos', label: 'Padrinos / Madrinas', type: 'text', placeholder: 'Nombre Padrino & Nombre Madrina' },
      { key: 'lugar_ceremonia', label: 'Iglesia / lugar de la misa', type: 'text', required: true, placeholder: 'Nombre de la parroquia' },
      { key: 'direccion_ceremonia', label: 'Dirección de la misa', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'lugar_recepcion', label: 'Salón de la fiesta', type: 'text', placeholder: 'Nombre del salón' },
      { key: 'chambelanes', label: 'Chambelanes / corte de honor', type: 'textarea', placeholder: 'Un nombre por línea' },
      { key: 'codigo_vestimenta', label: 'Código de vestimenta', type: 'text', placeholder: 'Formal' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'mesa_regalos', label: 'Mesa de regalos / sugerencia', type: 'text' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  bautizo: {
    label: 'Bautizo',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombre_homenajeada', label: 'Nombre del bebé', type: 'text', required: true, placeholder: 'Nombre completo' },
      { key: 'padres', label: 'Papás', type: 'text', required: true, placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padrinos', label: 'Padrinos', type: 'text', required: true, placeholder: 'Nombre Padrino & Nombre Madrina' },
      { key: 'lugar_ceremonia', label: 'Iglesia', type: 'text', required: true, placeholder: 'Nombre de la parroquia' },
      { key: 'direccion_ceremonia', label: 'Dirección de la iglesia', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'lugar_recepcion', label: 'Lugar de la recepción', type: 'text', placeholder: 'Nombre del lugar' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  comunion: {
    label: 'Primera Comunión',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombre_homenajeada', label: 'Nombre del pequeño(a)', type: 'text', required: true, placeholder: 'Nombre completo' },
      { key: 'padres', label: 'Papás', type: 'text', required: true, placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'lugar_ceremonia', label: 'Parroquia', type: 'text', required: true, placeholder: 'Nombre de la parroquia' },
      { key: 'direccion_ceremonia', label: 'Dirección de la parroquia', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'lugar_recepcion', label: 'Lugar de la celebración', type: 'text', placeholder: 'Nombre del lugar' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  confirmacion: {
    label: 'Confirmación',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombre_homenajeada', label: 'Nombre del confirmado(a)', type: 'text', required: true, placeholder: 'Nombre completo' },
      { key: 'padres', label: 'Papás', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'padrinos', label: 'Padrinos', type: 'text', placeholder: 'Nombre Padrino & Nombre Madrina' },
      { key: 'lugar_ceremonia', label: 'Parroquia', type: 'text', required: true, placeholder: 'Nombre de la parroquia' },
      { key: 'direccion_ceremonia', label: 'Dirección de la parroquia', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  cumpleanos: {
    label: 'Cumpleaños',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombre_homenajeada', label: 'Nombre del festejado(a)', type: 'text', required: true, placeholder: 'Nombre' },
      { key: 'edad', label: '¿Cuántos años cumple?', type: 'text', placeholder: '5', help: 'Aparece en portada y detalles.' },
      { key: 'padres', label: 'Papás (anfitriones)', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'lugar_recepcion', label: 'Lugar de la fiesta', type: 'text', required: true, placeholder: 'Nombre del lugar / domicilio' },
      { key: 'direccion_ceremonia', label: 'Dirección', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'tema', label: 'Temática', type: 'text', placeholder: 'Superhéroes, princesas, dinosaurios...' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  baby_shower: {
    label: 'Baby Shower',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombre_homenajeada', label: 'Nombre de la mamá', type: 'text', required: true, placeholder: 'Nombre' },
      { key: 'padres', label: 'Papás', type: 'text', placeholder: 'Nombre Papá & Nombre Mamá' },
      { key: 'lugar_recepcion', label: 'Lugar del evento', type: 'text', required: true, placeholder: 'Nombre del lugar / domicilio' },
      { key: 'direccion_ceremonia', label: 'Dirección', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'tema', label: 'Temática', type: 'text', placeholder: 'Nube, sello, ositos...' },
      { key: 'mesa_regalos', label: 'Mesa de regalos / sugerencia', type: 'text' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  },
  otro: {
    label: 'Evento',
    fields: [
      FIELD_FECHA,
      FIELD_HORA,
      { key: 'nombre_homenajeada', label: 'Nombre del anfitrión(a)', type: 'text', required: true, placeholder: 'Nombre' },
      { key: 'tema', label: 'Motivo del evento', type: 'text', placeholder: 'Graduación, aniversario, reunión...' },
      { key: 'lugar_recepcion', label: 'Lugar del evento', type: 'text', required: true, placeholder: 'Nombre del lugar / domicilio' },
      { key: 'direccion_ceremonia', label: 'Dirección', type: 'text', placeholder: 'Calle, número, colonia, ciudad' },
      { key: 'fecha_limite', label: 'Fecha límite para confirmar', type: 'date' },
      { key: 'itinerario', label: 'Itinerario (hora + actividad, una por línea)', type: 'textarea' }
    ]
  }
};

/** Mapeo difuso del nombre del evento (InicialView) al esquema canónico. */
export function resolveSchema(eventType) {
  const t = String(eventType || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.includes('gay') && t.includes('mujer')) return SCHEMAS.boda_gay_m;
  if (t.includes('gay')) return SCHEMAS.boda_gay_h;
  if (t.includes('boda') || t.includes('casamiento') || t.includes('matrimonio')) return SCHEMAS.boda;
  if (t.includes('xv') || t.includes('quince')) return SCHEMAS.xv;
  if (t.includes('bautizo') || t.includes('bautismo')) return SCHEMAS.bautizo;
  if (t.includes('comunion')) return SCHEMAS.comunion;
  if (t.includes('confirmacion')) return SCHEMAS.confirmacion;
  if (t.includes('baby')) return SCHEMAS.baby_shower;
  if (t.includes('cumple')) return SCHEMAS.cumpleanos;
  return SCHEMAS.otro;
}

// ---------------------------------------------------------------------------
// 2. Patrones deterministas: placeholder canónico -> campo de datos
// ---------------------------------------------------------------------------
// Los módulos se generan con los placeholders del 00-PROMPT-BASE ("Nombre de
// la Novia", "Nombre Papá & Nombre Mamá", "Calle Principal 123", "DD de
// mes"...). Estas reglas los localizan SIN IA. Lo que no casa aquí lo coloca
// el pase IA.

// match: regex sobre el texto normalizado del nodo de texto.
// scope: prefijo de data-gemini-id del módulo donde buscar (o 'doc' = todo).
// queue: los nodos que casen se reparten EN ORDEN entre los valores listados.
const R = (p, f) => new RegExp(p, 'i');

export const DETERMINISTIC_RULES = [
  { key: 'nombres_novia', scope: 'portada', match: R('nombre de la novia|novia 1\\b') },
  { key: 'nombres_novio', scope: 'portada', match: R('nombre del novio|novio 1\\b|novia 2\\b') },
  { key: 'nombre_homenajeada', scope: 'portada', match: R('nombre de la quinceañera|nombre del festejad|nombre del bebe|nombre de la mamá|nombre del pequeno|nombre del anfitrión|nombre de la quinceañera') },
  { key: 'nombre_homenajeada', scope: 'corte', match: R('nombre de la quinceañera|nombre del festejad|nombre del bebe|nombre del aniversariado') },
  {
    // Portada del catálogo sets-fotos: un único nodo "Nombre & Nombre".
    // Con dos valores (novia+novio) se rellena "Ana & Luis"; con uno (XV,
    // cumpleaños, bautizo…) solo el nombre del festejado.
    key: '__portada_nombres', scope: 'portada',
    match: R('^nombre\\s*&\\s*nombre$|^nombres de los festejados$'),
    values: ['nombres_novia', 'nombres_novio', 'nombre_homenajeada'],
    joinPair: true
  },
  {
    key: '__padres_pair', scope: 'padres',
    match: R('nombre papá\\s*&\\s*nombre mamá|nombre papa\\s*&\\s*nombre mama|papá & mamá|mamá & papá|papá y mamá'),
    values: ['padres_novia', 'padres_novio', 'padres']
  },
  {
    key: '__padrinos', scope: 'padrinos',
    match: R('nombre padrino\\s*&\\s*(nombre )?madrina|nombre padrino\\s*&\\s*nombre madrina|padrino & madrina'),
    values: ['padrinos']
  },
  { key: 'lugar_ceremonia', scope: 'ubicacion', match: R('nombre del lugar|nombre de la iglesia|nombre de la parroquia') },
  { key: 'direccion_ceremonia', scope: 'ubicacion', match: R('calle principal \\d+|calle principal 123|camino principal|calle, número, colonia') },
  {
    key: '__recepcion', scope: 'ubicacion',
    match: R('nombre del salón|avenida central|salón de la fiesta|nombre del lugar de la recepción'),
    values: ['lugar_recepcion']
  },
  // Hora textual de la ubicación ("5:00 de la tarde" en el catálogo).
  { key: 'hora', scope: 'ubicacion', match: R('\\d{1,2}:\\d{2}\\s*(de la (mañana|tarde|noche)|hrs?\\.?|horas)?\\b') },
  { key: 'codigo_vestimenta', scope: 'detalles', match: R('vestimenta formal|código de vestimenta|black tie|traje de gala|formal nocturno|vestimenta formal nocturna') },
  { key: 'codigo_vestimenta', scope: 'vestimenta', match: R('formal ·|formal:|black tie|vestimenta sugerida|código de vestimenta') },
  { key: 'fecha_limite', scope: 'confirmacion', match: R('^dd de mes|^dd\\.?\\s?de|^dd\\.mm|^dd de$|antes del \\d+ de [a-zá-ú]+|antes del dd de mes') },
  { key: 'mesa_regalos', scope: 'regalos', match: R('artículos para el hogar|piezas para el hogar|cristalería para el hogar|básicos para el hogar|menaje de barro|equipo para la casa nueva') },
  { key: 'mesa_regalos', scope: 'regalos', match: R('fondo de (viaje|luna de miel)|aporte para la luna de miel|fondo de hogar|aventuras de luna de miel') }
];

// ---------------------------------------------------------------------------
// 2b. Colocación por data-gemini-id (el "selector" del sistema).
// Las invitaciones del flujo clásico (templates antiguos) NO traen los
// placeholders canónicos ni memory_key: sus nodos editables se identifican
// por data-gemini-id (padres-papa, ubicacion-ceremonia-lugar, contador-*, …).
// Este pase coloca los datos por id SIN tocar módulos y SOBRE texto
// placeholder-ish (nunca encima de datos reales ya escritos).
// ---------------------------------------------------------------------------
const PLACEHOLDER_ISH = /^(nombre|nombres|pap[áa]s?|mam[áa]|madrina|padrino|padres|lugar|direcci[oó]n|calle|avenida|camino|hora|fecha|dd\b|c[oó]digo|formal|vestimenta|pendiente|por confirmar|tu presencia|escribe aqu[ií]|mis padres|mis padrinos)/i;
const parecePlaceholder = (t) => {
  const s = norm(t);
  if (!s) return true;
  if (s.length > 64) return false;
  if (/^\d{1,2}:\d{2}\b/.test(s)) return true;      // horas (17:00 hrs)
  if (/&/.test(s) && /nombre/i.test(s)) return true; // "Nombre & Nombre"
  return PLACEHOLDER_ISH.test(s);
};

/** Divide "A & B" en dos partes (para nodos separados papa/mama). */
const splitPair = (v) => {
  const parts = String(v || '').split(/\s+[&y]\s+|\s*&\s*/).map((x) => x.trim()).filter(Boolean);
  return parts.length >= 2 ? parts : null;
};
const primerPar = (data, keys) => {
  for (const k of keys) { const p = splitPair(data[k]); if (p) return p; }
  return null;
};
const primero = (data, keys) => {
  for (const k of keys) if (norm(data[k])) return norm(data[k]);
  return '';
};

export function applyDeterministicByIds(doc, schema, data, opts = {}) {
  const force = !!opts.force; // true al terminar la generación: los datos del
  // formulario SON la verdad del usuario y ganan sobre el texto (placeholder
  // o inventado por el adaptador IA). false en el editor: solo placeholders.
  const aplicadas = new Set();
  const campos = {};
  for (const f of schema.fields) campos[f.key] = f;
  const val = (k) => {
    const f = campos[k];
    const raw = norm(data[k]);
    if (!raw) return '';
    return f && f.type === 'date' ? formatFechaEs(raw) : raw;
  };

  /* ---------- Pase 1: data-event-field (ancla semántica oficial) ---------- */
  const porCampo = {};
  doc.querySelectorAll('[data-event-field]').forEach((el) => {
    const c = el.getAttribute('data-event-field');
    (porCampo[c] = porCampo[c] || []).push(el);
  });
  const nombres2 = [val('nombres_novia'), val('nombres_novio')].filter(Boolean);
  const nombre1 = val('nombre_homenajeada') || val('nombre_homenajeado');
  const parPadres = primerPar(data, ['padres_novia', 'padres', 'padres_novio']);
  const parPadrinos = splitPair(primero(data, ['padrinos']));
  const lineas = String(data.itinerario || '').split('\n').map((l) => l.trim()).filter(Boolean);

  const campoValor = (c) => {
    if (c === 'nombres') return nombres2.length === 2 ? nombres2.join(' & ') : (nombre1 || nombres2[0] || '');
    if (c === 'nombres-1') return val('nombres_novia') || nombre1 || nombres2[0] || '';
    if (c === 'nombres-2') return val('nombres_novio') || nombres2[1] || '';
    if (c === 'padres-1' || c === 'padres-2') {
      const fuente = c === 'padres-1' ? ['padres_novia', 'padres'] : ['padres_novio', 'padres'];
      return primero(data, fuente);
    }
    if (c === 'padres-1a' || c === 'padres-2a') return parPadres ? parPadres[0] : primero(data, ['padres_novia', 'padres', 'padres_novio']);
    if (c === 'padres-1b' || c === 'padres-2b') return parPadres ? parPadres[1] : primero(data, ['padres_novia', 'padres', 'padres_novio']);
    if (c === 'padrinos-1') return parPadrinos ? parPadrinos[0] : primero(data, ['padrinos']);
    if (c === 'padrinos-2') return parPadrinos ? parPadrinos[1] : primero(data, ['padrinos']);
    if (c === 'lugar') return val('lugar_ceremonia');
    if (c === 'direccion') return val('direccion_ceremonia');
    if (c === 'hora') return val('hora') ? (val('hora') + (/:/.test(val('hora')) && !/hrs/.test(val('hora')) ? ' hrs' : '')) : '';
    if (c === 'fecha') return val('fecha') ? (val('hora') ? val('fecha') + ' · ' + val('hora') : val('fecha')) : '';
    if (c === 'fecha-limite') return val('fecha_limite') ? 'Confirma antes del ' + val('fecha_limite') : '';
    if (c === 'fecha-evento') return val('fecha') ? val('fecha') + (val('hora') ? ' · ' + val('hora') : '') : '';
    if (c === 'vestimenta') return val('codigo_vestimenta');
    if (/^itin-hora-(\d)$/.test(c)) { const m = c.match(/^itin-hora-(\d)$/); const l = lineas[+m[1] - 1]; const mm = l && l.match(/^(\d{1,2}:\d{2})/); return mm ? mm[1] : ''; }
    if (/^itin-evento-(\d)$/.test(c)) { const m = c.match(/^itin-evento-(\d)$/); const l = lineas[+m[1] - 1]; const mm = l && l.match(/^\d{1,2}:\d{2}\s*[–—-]?\s*(.+)$/); return mm ? mm[1].split(/[,.;:]/)[0].trim() : ''; }
    if (/^corte-nombre-(\d)$/.test(c)) { const m = c.match(/^corte-nombre-(\d)$/); const corte = String(data.chambelanes || '').split('\n').map((x) => x.trim()).filter(Boolean); return corte[+m[1] - 1] || ''; }
    return '';
  };
  for (const c of Object.keys(porCampo)) {
    const v = campoValor(c);
    if (!v) continue;
    for (const el of porCampo[c]) {
      if (norm(el.textContent) === norm(v)) { aplicadas.add(campoClaveDe(c)); continue; }
      if (!force && !parecePlaceholder(el.textContent)) continue;
      el.textContent = v;
      aplicadas.add(campoClaveDe(c));
    }
  }
  function campoClaveDe(c) {
    if (/nombres/.test(c)) return 'nombres_novia';
    if (/padres/.test(c)) return 'padres';
    if (/padrinos/.test(c)) return 'padrinos';
    if (c === 'lugar') return 'lugar_ceremonia';
    if (c === 'direccion') return 'direccion_ceremonia';
    if (c === 'hora') return 'hora';
    if (c === 'fecha' || c === 'fecha-evento') return 'fecha';
    if (c === 'fecha-limite') return 'fecha_limite';
    if (c === 'vestimenta') return 'codigo_vestimenta';
    if (/^itin-/.test(c)) return 'itinerario';
    if (/^corte-/.test(c)) return 'chambelanes';
    return c;
  }

  /* ---------- Pase 2: memory_key (sets 25/26 y adaptados que lo conservan) -- */
  const MKMAP = [
    [/^portada-nombres?$/, 'nombres'],
    [/^portada-nombre-(1|2|uno|dos|novia|novio)$/, (m) => 'nombres-' + ({ uno: 1, dos: 2, novia: 1, novio: 2 }[m[1]] || m[1])],
    [/^portada-fecha$/, 'fecha'],
    [/^padres-nombre-(1a|1b|2a|2b|padre|madre|1|2)$/, (m) => 'padres-' + ({ padre: '1a', madre: '1b' }[m[1]] || m[1])],
    [/^padrinos-nombres?-(1|2)$/, (m) => 'padrinos-' + m[1]],
    [/^ubicacion-(lugar|nombre)$/, 'lugar'],
    [/^ubicacion-direccion$/, 'direccion'],
    [/^ubicacion-hora$/, 'hora'],
    [/^vestimenta-codigo$|^detalles-vestimenta-tipo$/, 'vestimenta'],
    [/^confirmacion-fecha-limite$/, 'fecha-limite'],
    [/^countdown-fecha$/, 'fecha-evento'],
    [/^itinerario-hora-(\d)$/, (m) => 'itin-hora-' + m[1]],
    [/^itinerario-(evento|momento)-(\d)$/, (m) => 'itin-evento-' + m[2]],
    [/^corte-(?:dama|chambelan|nombre)-(\d)$/, (m) => 'corte-nombre-' + m[1]]
  ];
  doc.querySelectorAll('[memory_key]').forEach((el) => {
    if (el.closest('[data-event-field]') === el || el.hasAttribute('data-event-field')) return; // ya cubierto
    const mk = el.getAttribute('memory_key') || '';
    for (const [re, out] of MKMAP) {
      const m = mk.match(re);
      if (!m) continue;
      const c = typeof out === 'function' ? out(m) : out;
      const v = campoValor(c);
      if (!v) break;
      if (norm(el.textContent) === norm(v)) { aplicadas.add(campoClaveDe(c)); break; }
      if (!force && !parecePlaceholder(el.textContent)) break;
      el.textContent = v;
      aplicadas.add(campoClaveDe(c));
      break;
    }
  });

  const set = (id, texto) => {
    let el = doc.querySelector('[data-gemini-id="' + id + '"]');
    if (!el || !texto) return;
    // El gemini-id puede vivir en la SECTION completa (portada-nombre en todo
    // el catálogo): nunca escribir sobre un contenedor — bajar al heading hoja.
    if (el.children && el.children.length) {
      const h = el.querySelector('h1,h2,h3');
      if (!h || h.children.length) return;
      el = h;
    }
    if (norm(el.textContent) === norm(texto)) return;
    if (!force && !parecePlaceholder(el.textContent)) return;
    el.textContent = texto;
  };
  /* ---------- Pase 3: data-gemini-id (flujo clásico) ---------- */
  const juntos = nombres2.length === 2 ? nombres2.join(' & ') : (nombre1 || nombres2[0] || '');
  if (juntos) {
    set('portada-nombres', juntos);
    set('portada-nombre', juntos);
    set('portada-titulo', juntos);
  }
  if (val('fecha')) {
    const conHora = val('hora') ? val('fecha') + ' · ' + val('hora') : val('fecha');
    set('portada-fecha', conHora);
    set('portada-hora', val('hora'));
  }

  // --- Padres (flujo clásico: papa/mama separados; catálogo: nombre-1/2) ---
  if (parPadres) {
    set('padres-papa', parPadres[0]);
    set('padres-mama', parPadres[1]);
  }
  const padresTxt = primero(data, ['padres_novia', 'padres', 'padres_novio']);
  if (padresTxt) { set('padres-nombre-1', padresTxt); set('padres-nombre-2', padresTxt); set('padres-texto', padresTxt); }

  // --- Padrinos (clásico separado / catálogo 1-2) ---
  if (parPadrinos) {
    set('padrinos-padrino', parPadrinos[0]);
    set('padrinos-madrina', parPadrinos[1]);
    set('padrinos-nombre-1', parPadrinos[0]);
    set('padrinos-nombre-2', parPadrinos[1]);
  } else if (primero(data, ['padrinos'])) {
    const p = primero(data, ['padrinos']);
    set('padrinos-nombre-1', p);
    set('padrinos-nombre-2', p);
  }

  // --- Ubicaciones (clásico: ceremonia/recepcion con subcampos) ---
  if (val('lugar_ceremonia')) set('ubicacion-ceremonia-lugar', val('lugar_ceremonia'));
  if (val('direccion_ceremonia')) set('ubicacion-ceremonia-direccion', val('direccion_ceremonia'));
  if (val('hora')) { set('ubicacion-ceremonia-hora', val('hora') + ' hrs'); set('ubicacion-hora', val('hora')); }
  if (val('lugar_ceremonia')) set('ubicacion-nombre', val('lugar_ceremonia'));
  if (val('direccion_ceremonia')) set('ubicacion-direccion', val('direccion_ceremonia'));
  if (val('lugar_recepcion')) {
    set('ubicacion-recepcion-lugar', val('lugar_recepcion'));
    set('ubicacion-lugar', val('lugar_recepcion'));
  }
  if (val('direccion_ceremonia')) set('ubicacion-recepcion-direccion', val('direccion_ceremonia'));

  // --- Itinerario: líneas "HH:MM actividad" a los hitos ---
  lineas.slice(0, 6).forEach((linea, idx) => {
    const m = linea.match(/^(\d{1,2}:\d{2})\s*[–—-]?\s*(.+)$/);
    if (!m) return;
    const [, hora, acto] = m;
    const corte = acto.split(/[,.;:]/)[0].trim();
    set('itinerario-hora-' + (idx + 1), hora);
    set('itinerario-evento-' + (idx + 1), corte);
    set('itinerario-momento-' + (idx + 1), corte);
  });

  // --- Vestimenta / mesa de regalos / límite ---
  if (val('codigo_vestimenta')) { set('detalles-vestimenta-tipo', val('codigo_vestimenta')); set('vestimenta-codigo', val('codigo_vestimenta')); }
  if (val('fecha_limite')) {
    set('confirmacion-fecha-limite', 'Confirma antes del ' + val('fecha_limite'));
  }
  if (val('mesa_regalos')) set('detalles-regalos-desc', val('mesa_regalos'));

  // claves contabilizadas (para el log del pipeline)
  for (const k of Object.keys(data)) {
    if (!norm(data[k])) continue;
    if (['nombres_novia', 'nombres_novio', 'nombre_homenajeada', 'padres_novia', 'padres', 'padres_novio', 'padrinos', 'lugar_ceremonia', 'direccion_ceremonia', 'hora', 'lugar_recepcion', 'codigo_vestimenta', 'fecha_limite', 'mesa_regalos', 'fecha'].includes(k)) aplicadas.add(k);
  }
  return aplicadas;
}

// ---------------------------------------------------------------------------
// 3. Utilidades DOM (funcionan con DOMParser del cliente y linkedom del server)
// ---------------------------------------------------------------------------
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const unaccent = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function moduleRoots(doc, scope) {
  if (!scope || scope === 'doc') return [doc.body || doc.documentElement || doc];
  if (scope === 'countdown') {
    // flujo catálogo (countdown-*) y clásico (contador-*)
    const els = Array.from(doc.querySelectorAll('[data-gemini-id^="countdown"], [data-gemini-id^="contador"]'));
    if (els.length) return els;
  }
  return Array.from(doc.querySelectorAll('[data-gemini-id^="' + scope + '"]'));
}

function textNodesIn(el) {
  const out = [];
  (el.childNodes || []).forEach((n) => {
    if (n.nodeType === 3) out.push(n);
  });
  return out;
}

/** Índice compacto de nodos editables para el pase IA. Nunca incluye
 *  <style>/<script>/base64. text truncado a 160 chars y tope de 400 targets. */
export function collectTextTargets(doc) {
  const els = Array.from(doc.querySelectorAll('[data-gemini-id], [memory_type="text"], [memory_key]'));
  const granular = els.filter((el) => !els.some((other) => other !== el && el.contains(other)));
  const targets = [];
  for (const el of granular) {
    const text = norm(el.textContent);
    if (!text || text.length > 400) continue;
    const id = el.getAttribute('data-gemini-id') || '';
    targets.push({
      i: targets.length,
      m: id ? id.split('-')[0] : '',
      id,
      k: el.getAttribute('memory_key') || '',
      t: text.slice(0, 160)
    });
    el.__targetIdx = targets.length - 1;
  }
  return targets.slice(0, 400);
}

/** Aplica un item devuelto por la IA: { i: <idx del target>, t: <nuevo texto> } */
export function applyTextByIndex(doc, op) {
  const idx = Number(op && op.i);
  const text = String(op && op.t || '').trim();
  if (Number.isNaN(idx) || !text) return false;
  const els = Array.from(doc.querySelectorAll('[data-gemini-id], [memory_type="text"], [memory_key]'));
  const granular = els.filter((el) => !els.some((other) => other !== el && el.contains(other)));
  const el = granular[idx];
  if (!el) return false;
  el.textContent = text.slice(0, 300);
  return true;
}

/**
 * Pase determinista: coloca los datos donde casan los placeholders canónicos.
 * Devuelve la lista de llaves aplicadas. NUNCA lanza.
 */
export function applyDeterministicData(doc, schema, data, opts = {}) {
  const applied = new Set();
  try {
    // Pase 0: colocación por anclas semánticas (data-event-field → memory_key
    // → data-gemini-id). En modo force (al terminar la generación) los datos
    // del formulario ganan sobre el texto placeholder o inventado por IA.
    try {
      for (const k of applyDeterministicByIds(doc, schema, data, opts)) applied.add(k);
    } catch (e) { /* el resto de pases continúa */ }

    const clean = {};
    for (const f of schema.fields) {
      const v = norm(data[f.key]);
      if (v) clean[f.key] = v;
    }
    const dateKeys = new Set(schema.fields.filter((f) => f.type === 'date').map((f) => f.key));
    const val = (k) => (dateKeys.has(k) ? formatFechaEs(clean[k]) : clean[k]);

    for (const rule of DETERMINISTIC_RULES) {
      const values = rule.values || [rule.key];
      const pending = values.map((k) => ({ k, v: clean[k] ? val(k) : '' })).filter((x) => x.v);
      if (pending.length === 0) continue;

      const roots = moduleRoots(doc, rule.scope);
      const matches = [];
      for (const root of roots) {
        for (const el of root.querySelectorAll('*')) {
          // El texto directo de un elemento puede llegar partido en varios
          // nodos (p.ej. "Nombre ", "&", " Nombre" al decodificar &amp; en
          // linkedom): se combina para poder casar el placeholder completo.
          const nodes = textNodesIn(el);
          if (nodes.length === 0) continue;
          const txt = norm(nodes.map((n) => n.textContent).join(''));
          if (!txt || txt.length > 120) continue;
          if (rule.match.test(txt)) matches.push({ nodes, txt });
        }
      }
      // Escribe un valor sobre el grupo de nodos de texto del match: el
      // primero recibe el texto final y el resto queda vacío.
      const writeMatch = (m, value) => {
        m.nodes.forEach((n, i) => {
          const v = i === 0 ? value : '';
          if (typeof n.data === 'string') n.data = v; else n.textContent = v;
        });
      };

      if (rule.values) {
        // COLA: el nodo ES el placeholder completo → valores en orden de documento
        // (ej. dos bloques "Nombre Papá & Nombre Mamá" → padres de ella / de él).
        if (rule.joinPair && matches.length === 1 && pending.length === 2) {
          // Portada con un solo "Nombre & Nombre" y dos nombres (boda):
          // se unen en "Nombre 1 & Nombre 2".
          writeMatch(matches[0], pending[0].v + ' & ' + pending[1].v);
          applied.add(pending[0].k);
          applied.add(pending[1].k);
        } else {
          for (let i = 0; i < matches.length && i < pending.length; i++) {
            writeMatch(matches[i], pending[i].v);
            applied.add(pending[i].k);
          }
        }
      } else {
        // FRAGMENTO: sustituye solo el placeholder dentro del nodo (un nodo
        // puede contener varios: "Nombre de la Novia & Nombre del Novio").
        for (const m of matches) {
          let next = m.txt;
          for (const p of pending) {
            next = next.replace(new RegExp(rule.match.source, 'gi'), p.v);
          }
          if (next !== m.txt) {
            writeMatch(m, next);
            for (const p of pending) applied.add(p.k);
          }
        }
      }
    }

    // --- fecha: placeholders + attr de countdown + <time datetime> ---
    const fechaIso = clean.fecha || '';
    const horaVal = clean.hora || '';
    if (fechaIso) {
      const iso = fechaIso + 'T' + (horaVal ? (horaVal.length === 5 ? horaVal + ':00' : horaVal) : '00:00:00');
      const formatted = formatFechaEs(fechaIso);
      for (const root of moduleRoots(doc, 'countdown')) {
        if (root.setAttribute) root.setAttribute('data-countdown-target', iso);
        const t = root.querySelector && root.querySelector('time');
        if (t) {
          const dt = t.getAttribute && t.getAttribute('datetime');
          if (dt && /^YYYY-MM-DD/.test(dt)) t.setAttribute('datetime', iso);
          if (/fecha del evento/i.test(norm(t.textContent))) t.textContent = formatted;
        }
        const p = root.querySelector && root.querySelector('p');
        if (p && /fecha del evento/i.test(norm(p.textContent))) p.textContent = formatted;
      }
      if (doc.querySelectorAll) {
        doc.querySelectorAll('time').forEach((t) => {
          const dt = t.getAttribute && t.getAttribute('datetime');
          if (dt && /^YYYY-MM-DD/.test(dt)) t.setAttribute('datetime', iso);
        });
        const walker = doc.body ? doc.body.querySelectorAll('*') : [];
        for (const el of walker) {
          for (const node of textNodesIn(el)) {
            if (/^fecha del evento$/i.test(norm(node.textContent))) {
              node.textContent = formatted;
            }
          }
        }
      }
      applied.add('fecha');
      if (horaVal) applied.add('hora');
    }
  } catch (e) {
    // Nunca lanzar: lo que no casó lo intenta el pase IA.
  }
  return Array.from(applied);
}

export function formatFechaEs(iso) {
  try {
    const [y, m, d] = String(iso).split('-').map(Number);
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    if (!y || !m || !d) return String(iso);
    return d + ' de ' + MESES[m - 1] + ' de ' + y;
  } catch {
    return String(iso || '');
  }
}

/** Campos requeridos que siguen vacíos (para el gate del cliente). */
export function missingRequired(schema, data) {
  return schema.fields
    .filter((f) => f.required)
    .filter((f) => !(f.prefill && (data[f.key] || '').trim()) && !(String(data[f.key] || '').trim()))
    .map((f) => f.key);
}
