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
    key: '__padres_pair', scope: 'padres',
    match: R('nombre papá\\s*&\\s*nombre mamá|papá & mamá|mamá & papá|nombre papá y nombre mamá'),
    values: ['padres_novia', 'padres_novio', 'padres']
  },
  {
    key: '__padrinos', scope: 'padrinos',
    match: R('nombre padrino\\s*&\\s*(nombre )?madrina|padrino & madrina'),
    values: ['padrinos']
  },
  { key: 'lugar_ceremonia', scope: 'ubicacion', match: R('nombre del lugar|nombre de la iglesia|nombre de la parroquia') },
  { key: 'direccion_ceremonia', scope: 'ubicacion', match: R('calle principal 123|camino principal|calle, número, colonia') },
  {
    key: '__recepcion', scope: 'ubicacion',
    match: R('nombre del salón|avenida central|salón de la fiesta|nombre del lugar de la recepción'),
    values: ['lugar_recepcion']
  },
  { key: 'codigo_vestimenta', scope: 'detalles', match: R('vestimenta formal|código de vestimenta|black tie|traje de gala|formal nocturno|vestimenta formal nocturna') },
  { key: 'codigo_vestimenta', scope: 'vestimenta', match: R('formal ·|formal:|black tie|vestimenta sugerida|código de vestimenta') },
  { key: 'fecha_limite', scope: 'confirmacion', match: R('^dd de mes|^dd\\.?\\s?de|^dd\\.mm|^dd de$') },
  { key: 'mesa_regalos', scope: 'regalos', match: R('artículos para el hogar|piezas para el hogar|cristalería para el hogar|básicos para el hogar|menaje de barro|equipo para la casa nueva') },
  { key: 'mesa_regalos', scope: 'regalos', match: R('fondo de (viaje|luna de miel)|aporte para la luna de miel|fondo de hogar|aventuras de luna de miel') }
];

// ---------------------------------------------------------------------------
// 3. Utilidades DOM (funcionan con DOMParser del cliente y linkedom del server)
// ---------------------------------------------------------------------------
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const unaccent = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function moduleRoots(doc, scope) {
  if (!scope || scope === 'doc') return [doc.body || doc.documentElement || doc];
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
export function applyDeterministicData(doc, schema, data) {
  const applied = new Set();
  try {
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
          for (const node of textNodesIn(el)) {
            const txt = norm(node.textContent);
            if (!txt || txt.length > 120) continue;
            if (rule.match.test(txt)) matches.push({ node, txt });
          }
        }
      }

      if (rule.values) {
        // COLA: el nodo ES el placeholder completo → valores en orden de documento
        // (ej. dos bloques "Nombre Papá & Nombre Mamá" → padres de ella / de él).
        for (let i = 0; i < matches.length && i < pending.length; i++) {
          const n = matches[i].node;
          if (typeof n.data === 'string') n.data = pending[i].v; else n.textContent = pending[i].v;
          applied.add(pending[i].k);
        }
      } else {
        // FRAGMENTO: sustituye solo el placeholder dentro del nodo (un nodo
        // puede contener varios: "Nombre de la Novia & Nombre del Novio").
        for (const { node, txt } of matches) {
          let next = txt;
          for (const p of pending) {
            next = next.replace(new RegExp(rule.match.source, 'gi'), p.v);
          }
          if (next !== txt) {
            if (typeof node.data === 'string') node.data = next; else node.textContent = next;
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
