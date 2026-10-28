/**
 * ============================================================================
 * MODULE FILLER — puts the customer's structured data into certified modules
 * ============================================================================
 * Deterministic, no AI. Works on one module <section> at a time (linkedom DOM).
 *
 * The key piece is the repeater: modules ship with a fixed number of slots
 * (e.g. 4 chambelanes, 2 parents). The filler finds the repeated unit around
 * each slot, clones it when the customer added more people, removes the ones
 * that are not needed, and renumbers memory_key so every editable element
 * stays unique. The module's structure, CSS and scripts are never rewritten.
 * ============================================================================
 */

import { parseHTML } from 'linkedom';

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function formatDateLong(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${cap(DIAS[dow])} ${d} de ${MESES[mo - 1]} de ${y}`;
}

export function formatDateShort(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

/** "18:30" → "6:30 p.m." */
export function formatTime(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

export const joinNames = (names) => {
  const list = names.map(norm).filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`;
};

const template = (tpl, vars) =>
  String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
export function parseSection(sectionHtml) {
  const { document } = parseHTML(`<!DOCTYPE html><html><head></head><body>${sectionHtml}</body></html>`);
  const root = document.querySelector('section');
  return { document, root };
}

const keyOf = (el) => el.getAttribute('memory_key') || '';
const isLeaf = (el) => !el.querySelector('[memory_key]');

/** Elements whose memory_key matches `re`, in document order. */
const byKey = (root, re, { leaf = false } = {}) =>
  Array.from(root.querySelectorAll('[memory_key]')).filter((el) => re.test(keyOf(el)) && (!leaf || isLeaf(el)));

const firstByKey = (root, re, opts) => byKey(root, re, opts)[0] || null;

const remove = (el) => {
  if (el && el.parentNode) el.parentNode.removeChild(el);
};

const insertAfter = (ref, node) => ref.parentNode.insertBefore(node, ref.nextSibling);

/**
 * Write text into an editable element without destroying a single wrapped
 * child (e.g. <p memory_key="portada-fecha"><time>…</time></p>).
 */
function setText(el, value) {
  if (!el) return;
  const kids = Array.from(el.children || []);
  const ownText = Array.from(el.childNodes || []).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  if (kids.length === 1 && !ownText && !/^(BR|IMG|SVG|IFRAME)$/i.test(kids[0].tagName)) {
    setText(kids[0], value);
    return;
  }
  el.textContent = value;
}

function setTime(el, hhmm, dateIso) {
  if (!el) return;
  const time = el.tagName === 'TIME' ? el : el.querySelector('time');
  if (time && hhmm) {
    const had = time.getAttribute('datetime') || '';
    time.setAttribute('datetime', /T/.test(had) && dateIso ? `${dateIso}T${hhmm}:00` : hhmm);
  }
  setText(el, formatTime(hhmm));
}

// ---------------------------------------------------------------------------
// The repeater
// ---------------------------------------------------------------------------

/** The repeated unit around each slot (li, article, card…), one per slot. */
function itemContainers(root, slots) {
  if (slots.length === 1) {
    const s = slots[0];
    const unit = s.closest('[data-ch-item], [data-ch-step], li, article, figcaption, figure');
    return [unit && root.contains(unit) && unit !== root ? unit : s];
  }
  const containers = [];
  for (const slot of slots) {
    let c = slot;
    while (c.parentElement && c.parentElement !== root) {
      const parent = c.parentElement;
      if (slots.filter((s) => parent.contains(s)).length > 1) break;
      c = parent;
    }
    if (!containers.includes(c)) containers.push(c);
  }
  return containers;
}

/** Give a cloned key a new item number (the last number in it, wherever it sits). */
const renumberKey = (key, n) => {
  const matches = [...key.matchAll(/-(\d+)([a-z]?)(?=-|$)/g)];
  if (!matches.length) return `${key}-${n}`;
  const m = matches[matches.length - 1];
  return key.slice(0, m.index) + `-${n}${m[2]}` + key.slice(m.index + m[0].length);
};

// Attributes that point at an element id (SVG <use>, gradients, labels…).
const ID_LIST_ATTRS = new Set(['for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant']);
const swapUrlRefs = (value, map) =>
  value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (m, q, id) => (map.has(id) ? `url(${q}#${map.get(id)}${q})` : m));

/** After ids were renamed (old → new in `map`), point references inside `scope` at the new ids. */
function rewriteIdRefs(scope, map) {
  if (!map.size) return;
  for (const el of [scope, ...Array.from(scope.querySelectorAll('*'))]) {
    for (const attr of Array.from(el.attributes || [])) {
      const v = attr.value || '';
      let nv = v;
      if ((attr.name === 'href' || attr.name === 'xlink:href') && v.startsWith('#') && map.has(v.slice(1))) nv = `#${map.get(v.slice(1))}`;
      else if (ID_LIST_ATTRS.has(attr.name)) nv = v.split(/\s+/).map((t) => map.get(t) || t).join(' ');
      else if (v.includes('url(')) nv = swapUrlRefs(v, map);
      if (nv !== v) el.setAttribute(attr.name, nv);
    }
    if (el.tagName === 'STYLE' && (el.textContent || '').includes('url(')) {
      const t = el.textContent;
      const nt = swapUrlRefs(t, map);
      if (nt !== t) el.textContent = nt;
    }
  }
}

/** Deep-clone a unit and give its editable keys and ids a new number. */
function cloneUnit(unit, n) {
  const copy = unit.cloneNode(true);
  const all = [copy, ...Array.from(copy.querySelectorAll('*'))];
  const ids = new Map();
  for (const el of all) {
    if (el.hasAttribute && el.hasAttribute('memory_key')) el.setAttribute('memory_key', renumberKey(el.getAttribute('memory_key'), n));
    if (el.hasAttribute && el.hasAttribute('data-event-field')) el.removeAttribute('data-event-field');
    if (el.hasAttribute && el.hasAttribute('id')) {
      const nid = `${el.getAttribute('id')}-${n}`;
      ids.set(el.getAttribute('id'), nid);
      el.setAttribute('id', nid);
    }
  }
  rewriteIdRefs(copy, ids);
  return copy;
}

/** Every memory_key in the module must be unique: later repeats get a suffix. */
function dedupeKeys(root) {
  const els = [root, ...Array.from(root.querySelectorAll('[memory_key]'))].filter((el) => el.hasAttribute && el.hasAttribute('memory_key'));
  const used = new Set();
  const all = new Set(els.map(keyOf));
  for (const el of els) {
    const k = keyOf(el);
    if (!used.has(k)) { used.add(k); continue; }
    let j = 2;
    while (used.has(`${k}-${j}`) || all.has(`${k}-${j}`)) j += 1;
    el.setAttribute('memory_key', `${k}-${j}`);
    used.add(`${k}-${j}`);
  }
}

/**
 * Units removed by the repeater can take a shared SVG definition with them
 * (e.g. a <g id> drawn once and reused by <use href> in every card). Copy any
 * definition that is now missing from the original module into hidden defs.
 */
function repairIdRefs(root, originalRoot) {
  const present = new Set(Array.from(root.querySelectorAll('[id]')).map((el) => el.getAttribute('id')));
  const wanted = new Set();
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attr of Array.from(el.attributes || [])) {
      const v = attr.value || '';
      if ((attr.name === 'href' || attr.name === 'xlink:href') && /^#[^\s]+$/.test(v)) wanted.add(v.slice(1));
      for (const m of v.matchAll(/url\(\s*['"]?#([^)'"\s]+)/g)) wanted.add(m[1]);
    }
  }
  const missing = [...wanted].filter((id) => !present.has(id));
  if (!missing.length || !originalRoot) return;
  let defs = null;
  for (const id of missing) {
    const src = Array.from(originalRoot.querySelectorAll('[id]')).find((el) => el.getAttribute('id') === id);
    if (!src || !src.closest('svg')) continue;
    if (!defs) {
      const doc = root.ownerDocument;
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);
      root.insertBefore(svg, root.firstChild);
    }
    defs.appendChild(src.cloneNode(true));
  }
}

/**
 * Make the module show exactly `items.length` units around the slots that
 * match `slotRe`, then call write(unit, item, index). Returns false when the
 * module has no such slots (the caller can choose another strategy).
 * pickTemplate(item, units) may choose which existing unit to clone.
 */
function fillRepeat(root, slotRe, items, write, { pickTemplate } = {}) {
  const slots = byKey(root, slotRe, { leaf: true });
  if (!slots.length) return false;
  let units = itemContainers(root, slots);
  const originals = units.slice();
  if (!items.length) {
    units.forEach(remove);
    return true;
  }
  const result = [];
  items.forEach((item, i) => {
    if (i < originals.length && !pickTemplate) {
      result.push(originals[i]);
      return;
    }
    const tmpl = pickTemplate ? pickTemplate(item, originals, i) : originals[originals.length - 1];
    const fresh = cloneUnit(tmpl, i + 1);
    fresh.__tmpl = tmpl;
    result.push(fresh);
  });
  // Place new units after the last original, in order; drop unused originals.
  if (pickTemplate) {
    const anchor = originals[originals.length - 1];
    let ref = anchor;
    for (const unit of result) {
      insertAfter(ref, unit);
      ref = unit;
    }
    originals.forEach(remove);
  } else {
    let ref = originals[originals.length - 1];
    for (const unit of result.slice(originals.length)) {
      insertAfter(ref, unit);
      ref = unit;
    }
    originals.slice(items.length).forEach(remove);
  }
  result.forEach((unit, i) => {
    const slot = Array.from([unit, ...unit.querySelectorAll('[memory_key]')]).find((el) => el.hasAttribute('memory_key') && slotRe.test(keyOf(el)) && isLeaf(el))
      || unit.querySelector('[memory_key]');
    write(unit, items[i], i, slot);
  });
  return true;
}

/** Role/label element inside a unit (not the name slot itself). */
function findRoleEl(unit, slot) {
  const cands = Array.from(unit.querySelectorAll('[memory_key*="-rol"], [memory_key*="etiqueta"], [class*="rol"], [class*="role"]'))
    .filter((el) => el !== slot && !el.contains(slot) && !(slot && slot.contains(el)) && !/rotulo/.test(keyOf(el)) && !el.querySelector('img'));
  return cands.find((el) => !el.children.length) || cands[0] || null;
}

function findNoteEl(unit, slot, roleEl) {
  return Array.from(unit.querySelectorAll('[memory_key*="nota"], [memory_key*="desc"], [memory_key*="-det"], [memory_key*="texto"], [class*="note"], [class*="nota"]'))
    .find((el) => el !== slot && el !== roleEl && !el.contains(slot)) || null;
}

const genderOf = (text) => {
  const t = String(text || '').toLowerCase();
  if (/mam[aá]|madre|madrastra|tutora|abuela|t[ií]a\b|hermana|madrina|mother|mom/.test(t)) return 'F';
  if (/pap[aá]|padre|padrastro|tutor\b|abuelo|t[ií]o\b|hermano|padrino|father|dad/.test(t)) return 'M';
  return '';
};

// ---------------------------------------------------------------------------
// Module writers
// ---------------------------------------------------------------------------
// Module families name their editable keys differently ("padrinos-nombre-2",
// "padrinos-2-nombre", "padres-novia-madre"…). The matchers below accept the
// variants found across the certified library.

/** key with an item number before or after the field name */
const indexed = (prefix, fields) =>
  new RegExp(`^${prefix}-(?:\\d+-(?:${fields})|(?:${fields})-\\d+)(?:-[a-z0-9]+)*$`);

function honoreeNames(ctx) {
  const d = ctx.data;
  if (ctx.pack.honorees === 2) return [d.persona1, d.persona2].map(norm).filter(Boolean);
  return [norm(d.nombre)].filter(Boolean);
}

function ladoName(ctx, lado) {
  if (lado === 'p1') return norm(ctx.data.persona1).split(' ')[0] || 'la primera persona';
  if (lado === 'p2') return norm(ctx.data.persona2).split(' ')[0] || 'la segunda persona';
  return '';
}

function parentRoleText(ctx, p) {
  const labels = ctx.pack.labels || {};
  const rol = norm(p.rol);
  if (!rol) return '';
  const vars = { rol: rol.toLowerCase(), Rol: cap(rol), lado: ladoName(ctx, p.lado) };
  const tpl = p.en_memoria ? labels.parentRoleMemoriam : labels.parentRole;
  let out = norm(template(tpl || '{Rol}', vars));
  if (!vars.lado) out = out.replace(/\s+de\s*$/i, '').replace(/\s+·\s*$/, '');
  return out;
}

const personName = (p) => (p.en_memoria ? `${norm(p.nombre)} †` : norm(p.nombre));

function writePortada(root, ctx) {
  const names = honoreeNames(ctx);
  const labels = ctx.pack.labels || {};
  const novia = firstByKey(root, /^portada-(?:nombre-)?(novia|1|uno)$/, { leaf: true });
  const novio = firstByKey(root, /^portada-(?:nombre-)?(novio|2|dos)$/, { leaf: true });
  if (novia && novio) {
    setText(novia, names[0] || '');
    if (names[1]) setText(novio, names[1]);
    else {
      // one honoree: drop the second name and its "&"/"y" connector
      const conector = firstByKey(root, /^portada-conector$/);
      if (conector) remove(conector);
      let sib = novio.previousSibling;
      while (sib && sib.nodeType === 3 && !sib.textContent.trim()) sib = sib.previousSibling;
      if (sib && /^[&y]$/.test(norm(sib.textContent))) remove(sib);
      remove(novio);
    }
  } else {
    const cands = byKey(root, /^portada-(nombres?|titulo)$/, { leaf: true });
    const target = cands.find((el) => /nombre/i.test(el.textContent)) || cands[0];
    if (target) setText(target, joinNames(names));
  }
  const fechaEl = firstByKey(root, /^portada-fecha$/);
  if (fechaEl) {
    const long = formatDateLong(ctx.data.fecha);
    const time = fechaEl.tagName === 'TIME' ? fechaEl : fechaEl.querySelector('time');
    if (time && ctx.isoDateTime) time.setAttribute('datetime', ctx.isoDateTime);
    setText(fechaEl, long + (ctx.data.hora ? ` · ${formatTime(ctx.data.hora)}` : ''));
  }
  const frase = norm(ctx.data.frase_portada) || (ctx.adapting ? labels.portadaFrase : '');
  const fraseEl = firstByKey(root, /^portada-(lema|frase|kicker|subtitulo)$/, { leaf: true });
  if (fraseEl && frase) setText(fraseEl, frase);
  const lugarEl = firstByKey(root, /^portada-lugar$/, { leaf: true });
  if (lugarEl) {
    const first = (ctx.data.ubicaciones || [])[0];
    if (first) setText(lugarEl, first.lugar);
    else remove(lugarEl);
  }
}

function writeCountdown(root, ctx) {
  if (ctx.isoDateTime) {
    root.setAttribute('data-countdown-target', ctx.isoDateTime);
    root.querySelectorAll('[data-countdown-target]').forEach((el) => el.setAttribute('data-countdown-target', ctx.isoDateTime));
    root.querySelectorAll('time[datetime]').forEach((t) => {
      if (/^YYYY|^\d{4}-\d{2}-\d{2}/.test(t.getAttribute('datetime'))) t.setAttribute('datetime', ctx.isoDateTime);
    });
  }
  const fechaEl = firstByKey(root, /^countdown-(fecha|event-date)$/, { leaf: true });
  if (fechaEl) setText(fechaEl, formatDateLong(ctx.data.fecha) + (ctx.data.hora ? ` · ${formatTime(ctx.data.hora)}` : ''));
}

const PADRES_SLOT = /^padres-(?:(?:[a-z0-9]+-)*(?:nombre|nombres|padre|madre|papa|mama)(?:-[a-z0-9]+)*|[a-z]-\d+)$/;
const PADRES_NOT_SLOT = /-(rol|titulo|texto|intro|etiqueta|rotulo|nota|bloque|mensaje|lema)(-|$)/;

function unitOf(root, el) {
  const u = el.closest('[data-ch-item], [data-em-card], [data-ne-card], [data-au-item], li, article, figcaption');
  return u && u !== root && root.contains(u) ? u : null;
}

function groupLabel(ctx, group) {
  const labels = ctx.pack.labels || {};
  if (ctx.pack.honorees === 2 && group[0] && group[0].lado && group.every((p) => p.lado === group[0].lado) && labels.parentGroup) {
    return template(labels.parentGroup, { lado: ladoName(ctx, group[0].lado) });
  }
  const roles = group.map((p) => norm(p.rol).toLowerCase());
  const both = roles.length === 2 && roles.includes('mamá') && roles.includes('papá') && !group.some((p) => p.en_memoria);
  return both && labels.parentGroupBoth ? labels.parentGroupBoth : group.map((p) => parentRoleText(ctx, p)).filter(Boolean).join(' y ');
}

function familyGroups(ctx, people, size) {
  if (ctx.pack.honorees === 2) {
    const p1 = people.filter((p) => p.lado === 'p1');
    const p2 = people.filter((p) => p.lado === 'p2');
    const rest = people.filter((p) => p.lado !== 'p1' && p.lado !== 'p2');
    if (p1.length || p2.length) return [p1, p2, rest].filter((g) => g.length);
  }
  return chunk(people, size);
}

function writePadres(root, ctx) {
  const people = (ctx.data.padres || []).filter((p) => norm(p.nombre));
  const isSlot = (el) => PADRES_SLOT.test(keyOf(el)) && !PADRES_NOT_SLOT.test(keyOf(el)) && isLeaf(el);
  const slots = Array.from(root.querySelectorAll('[memory_key]')).filter(isSlot);
  if (!slots.length) return false;

  // Mode A: family cards holding several name slots each (padre + madre…).
  const cards = [];
  for (const s of slots) {
    const u = unitOf(root, s);
    if (u && slots.filter((x) => u.contains(x)).length > 1 && !cards.includes(u)) cards.push(u);
  }
  if (cards.length) {
    const perCard = Math.max(...cards.map((c) => slots.filter((x) => c.contains(x)).length));
    const groups = familyGroups(ctx, people, perCard);
    const originals = cards.slice();
    const units = groups.map((g, i) => (i < originals.length ? originals[i] : cloneUnit(originals[originals.length - 1], i + 1)));
    let ref = originals[originals.length - 1];
    units.slice(originals.length).forEach((u) => { insertAfter(ref, u); ref = u; });
    originals.slice(groups.length).forEach(remove);
    units.forEach((card, gi) => {
      const group = groups[gi];
      const cardSlots = Array.from(card.querySelectorAll('[memory_key]')).filter(isSlot);
      group.forEach((p, pi) => {
        let slot = cardSlots[pi];
        if (!slot) {
          const last = cardSlots[cardSlots.length - 1];
          slot = cloneUnit(last, pi + 1);
          insertAfter(cardSlots[cardSlots.length - 1], slot);
          cardSlots.push(slot);
        }
        setText(slot, personName(p));
      });
      cardSlots.slice(group.length).forEach(remove);
      const roleEl = Array.from(card.querySelectorAll('[memory_key]')).find((el) => /-rol$/.test(keyOf(el))) || findRoleEl(card, cardSlots[0]);
      const label = groupLabel(ctx, group);
      if (roleEl) label ? setText(roleEl, label) : remove(roleEl);
    });
    return true;
  }

  const slotRe = { test: (k) => PADRES_SLOT.test(k) && !PADRES_NOT_SLOT.test(k) };
  const groupMode = slots.some((s) => /&|\sy\s/.test(s.textContent) && /nombre/i.test(s.textContent));

  if (!groupMode) {
    // Mode B: one person per unit; clone a unit whose original role has the same gender.
    const unitGender = new Map();
    for (const unit of itemContainers(root, slots)) {
      const slot = [unit, ...unit.querySelectorAll('[memory_key]')].find((el) => el.hasAttribute('memory_key') && slotRe.test(keyOf(el)));
      const roleEl = findRoleEl(unit, slot);
      const img = unit.querySelector('img');
      unitGender.set(unit, genderOf(`${roleEl ? roleEl.textContent : ''} ${slot ? keyOf(slot) : ''} ${img ? img.getAttribute('alt') : ''}`));
    }
    return fillRepeat(root, slotRe, people, (unit, p, i, slot) => {
      setText(slot, personName(p));
      const roleEl = findRoleEl(unit, slot);
      const role = parentRoleText(ctx, p);
      if (roleEl) role ? setText(roleEl, role) : remove(roleEl);
      const noteEl = findNoteEl(unit, slot, roleEl);
      if (noteEl) {
        const same = genderOf(p.rol) && genderOf(p.rol) === unitGender.get(unit.__tmpl || unit);
        if (p.en_memoria) setText(noteEl, 'Siempre en nuestro corazón');
        else if (!same) remove(noteEl);
      }
      const img = unit.querySelector('img');
      if (img) img.setAttribute('alt', role ? `${role}: ${norm(p.nombre)}` : norm(p.nombre));
    }, {
      pickTemplate: (p, originals, i) => originals.find((u) => unitGender.get(u) === genderOf(p.rol)) || originals[i % originals.length]
    });
  }

  // Mode C: each unit holds one family as "Name & Name".
  return fillRepeat(root, slotRe, familyGroups(ctx, people, 2), (unit, group, i, slot) => {
    setText(slot, joinNames(group.map(personName)));
    const roleEl = findRoleEl(unit, slot);
    const label = groupLabel(ctx, group);
    if (roleEl) label ? setText(roleEl, label) : remove(roleEl);
    const img = unit.querySelector('img');
    if (img) img.setAttribute('alt', label || joinNames(group.map((p) => norm(p.nombre))));
  });
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += Math.max(1, n)) out.push(arr.slice(i, i + Math.max(1, n)));
  return out;
};

function padrinoRoleText(ctx, item) {
  const rol = norm(item.rol);
  if (!rol) return '';
  if (/^(padrin|madrin|testig)/i.test(rol)) return rol;
  return template(ctx.pack.labels?.padrinoRole || 'Padrinos de {rol}', { rol: rol.toLowerCase(), Rol: cap(rol) });
}

const PADRINOS_SLOT = /^padrinos-(?:\d+-)?(?:nombre|nombres)(?:-[a-z0-9]+)*$/;

function writePadrinos(root, ctx) {
  const items = (ctx.data.padrinos || []).filter((p) => norm(p.nombres));
  return fillRepeat(root, PADRINOS_SLOT, items, (unit, item, i, slot) => {
    const role = padrinoRoleText(ctx, item);
    const roleEl = findRoleEl(unit, slot);
    if (roleEl) {
      role ? setText(roleEl, role) : remove(roleEl);
      setText(slot, norm(item.nombres));
    } else if (role) {
      // Module without a role slot: the role goes on its own line inside the name.
      slot.innerHTML = `<span class="im-rol" style="display:block;font-size:.72em;letter-spacing:.06em;opacity:.85;text-transform:uppercase">${escapeHtml(role)}</span>${escapeHtml(norm(item.nombres))}`;
    } else {
      setText(slot, norm(item.nombres));
    }
    const noteEl = findNoteEl(unit, slot, roleEl);
    if (noteEl && i >= 0) remove(noteEl); // template notes describe sample people
    const img = unit.querySelector('img');
    if (img) img.setAttribute('alt', role || 'Padrinos');
  });
}

function courtNames(list, suffix) {
  const items = (list || []).filter((p) => norm(p.nombre));
  const honor = items.filter((p) => p.de_honor).map((p) => `${norm(p.nombre)}${suffix || ''}`);
  const rest = items.filter((p) => !p.de_honor).map((p) => norm(p.nombre));
  return [...honor, ...rest];
}

function writeCorte(root, ctx) {
  const labels = ctx.pack.labels || {};
  let damasList = (ctx.data.damas || []).filter((p) => norm(p.nombre));
  let chamList = (ctx.data.chambelanes || []).filter((p) => norm(p.nombre));

  // Dedicated "de honor" slot (one person shown apart from the lists).
  const honorName = firstByKey(root, /^corte-honor-nombre$/, { leaf: true });
  if (honorName) {
    const honorRol = firstByKey(root, /^corte-honor-rol$/, { leaf: true });
    const ch = chamList.find((p) => p.de_honor);
    const da = damasList.find((p) => p.de_honor);
    const person = ch || da;
    if (person) {
      setText(honorName, norm(person.nombre));
      if (honorRol) setText(honorRol, ch ? 'Chambelán de honor' : 'Dama de honor');
      if (ch) chamList = chamList.filter((p) => p !== ch);
      else damasList = damasList.filter((p) => p !== da);
    } else {
      const wrap = honorName.parentElement && honorName.parentElement !== root && honorRol && honorName.parentElement.contains(honorRol) ? honorName.parentElement : null;
      if (wrap) remove(wrap);
      else { remove(honorName); if (honorRol) remove(honorRol); }
    }
  }
  const damas = courtNames(damasList, labels.honorSuffix);
  const chambelanes = courtNames(chamList, labels.honorSuffix);
  const damaRe = /^corte-damas?-\d+$/;
  const chamRe = /^corte-(?:chambelan|chambelanes|caballero|caballeros)-\d+$/;

  if (byKey(root, damaRe).length || byKey(root, chamRe).length) {
    const fillList = (re, names, titleRe, title) => {
      const slots = byKey(root, re, { leaf: true });
      if (!slots.length) return;
      if (!names.length) {
        const list = slots[0].parentElement;
        const group = list && list.parentElement && list.parentElement !== root ? list.parentElement : list;
        remove(group);
        return;
      }
      fillRepeat(root, re, names, (unit, name, i, slot) => setText(slot, name));
      const titleEl = firstByKey(root, titleRe, { leaf: true });
      if (titleEl && title) setText(titleEl, title);
    };
    fillList(damaRe, damas, /^corte-damas-titulo$/, labels.damasTitle);
    fillList(chamRe, chambelanes, /^corte-(chambelanes|caballeros)-titulo$/, labels.chambelanesTitle);
    return true;
  }

  const combinedRe = /^corte-nombre-\d+$/;
  if (byKey(root, combinedRe).length) {
    return fillRepeat(root, combinedRe, [...damas, ...chambelanes], (unit, name, i, slot) => setText(slot, name));
  }

  // "Moments" cards (vals, pastel…): one card per group with the names joined.
  const cardRe = indexed('corte', 'titulo');
  if (byKey(root, cardRe).length) {
    const groups = [];
    if (damas.length) groups.push({ title: labels.damasTitle || 'Damas', names: damas });
    if (chambelanes.length) groups.push({ title: labels.chambelanesTitle || 'Chambelanes', names: chambelanes });
    return fillRepeat(root, cardRe, groups, (unit, g, i, slot) => {
      setText(slot, g.title);
      const det = firstByKey(unit, indexed('corte', 'det|detalle|texto'), { leaf: true });
      if (det) setText(det, g.names.join(' · '));
      byKey(unit, indexed('corte', 'hora')).forEach((el) => {
        const wrap = el.parentElement && el.parentElement !== unit && el.parentElement.children.length === 1 ? el.parentElement : el;
        remove(wrap);
      });
    });
  }

  const texto = firstByKey(root, /^corte-texto$/, { leaf: true });
  if (texto) {
    setText(texto, [damas.length ? `${labels.damasTitle || 'Damas'}: ${damas.join(', ')}` : '', chambelanes.length ? `${labels.chambelanesTitle || 'Chambelanes'}: ${chambelanes.join(', ')}` : ''].filter(Boolean).join(' · '));
    return true;
  }
  return false;
}

const ITIN_ACT = indexed('itinerario', 'evento|momento|titulo|nombre|hito');
const ITIN_HORA = indexed('itinerario', 'hora');
const ITIN_DESC = indexed('itinerario', 'desc|det|detalle|texto');

function writeItinerario(root, ctx) {
  const items = (ctx.data.itinerario || []).filter((x) => norm(x.actividad));
  const slotRe = byKey(root, ITIN_ACT, { leaf: true }).length ? ITIN_ACT : ITIN_HORA;
  return fillRepeat(root, slotRe, items, (unit, item) => {
    const horaEl = [unit, ...unit.querySelectorAll('[memory_key]')].find((el) => el.hasAttribute('memory_key') && ITIN_HORA.test(keyOf(el)) && isLeaf(el));
    const actEl = [unit, ...unit.querySelectorAll('[memory_key]')].find((el) => el.hasAttribute('memory_key') && ITIN_ACT.test(keyOf(el)) && isLeaf(el));
    const descEl = firstByKey(unit, ITIN_DESC, { leaf: true });
    if (horaEl) item.hora ? setTime(horaEl, item.hora, ctx.data.fecha) : remove(horaEl);
    if (actEl) setText(actEl, norm(item.actividad));
    if (descEl) item.descripcion ? setText(descEl, norm(item.descripcion)) : remove(descEl);
  });
}

function mapsSearch(item) {
  const q = [item.lugar, item.direccion].map(norm).filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function writeUbicacion(root, ctx, item) {
  if (!item) return false;
  let nameEl = firstByKey(root, /^ubicacion-nombre$/, { leaf: true })
    || firstByKey(root, /^ubicacion-salon$/, { leaf: true })
    || firstByKey(root, /^ubicacion-lugar$/, { leaf: true });
  const tituloEl = firstByKey(root, /^ubicacion-titulo$/, { leaf: true });
  if (!nameEl && tituloEl && /nombre|lugar|sal[oó]n/i.test(tituloEl.textContent)) nameEl = tituloEl;
  if (nameEl) setText(nameEl, norm(item.lugar));
  const dirEl = firstByKey(root, /^ubicacion-(direccion|calle)$/, { leaf: true });
  if (dirEl) item.direccion ? setText(dirEl, norm(item.direccion)) : remove(dirEl);
  // Sample city line, coordinates and notes describe the sample venue.
  byKey(root, /^ubicacion-(ciudad|nota|coordenadas)$/, { leaf: true }).forEach(remove);
  if (dirEl && /calle/.test(keyOf(dirEl))) byKey(root, /^ubicacion-direccion$/, { leaf: true }).forEach(remove);

  // Modules that list sub-events (ceremonia/recepción, evento-1/evento-2):
  // each place is its own module instance, so the first block gets this place.
  const subRe = /^ubicacion-(?:evento|momento)-\d+$/;
  if (byKey(root, subRe, { leaf: true }).length) {
    fillRepeat(root, subRe, [item], (unit, it, i, slot) => {
      setText(slot, [norm(it.tipo), norm(it.lugar)].filter(Boolean).join(' · '));
      const h = firstByKey(unit, /^ubicacion-hora-\d+$/, { leaf: true });
      if (h) it.hora ? setTime(h, it.hora, ctx.data.fecha) : remove(h);
    });
  }
  const ceremonia = firstByKey(root, /^ubicacion-ceremonia-titulo$/, { leaf: true });
  if (ceremonia) {
    setText(ceremonia, norm(item.tipo) || 'Celebración');
    const h = firstByKey(root, /^ubicacion-ceremonia-hora$/, { leaf: true });
    if (h) item.hora ? setTime(h, item.hora, ctx.data.fecha) : remove(h);
    const t = firstByKey(root, /^ubicacion-ceremonia-texto$/, { leaf: true });
    if (t) setText(t, norm(item.lugar));
    const rec = byKey(root, /^ubicacion-recepcion-/);
    if (rec.length) {
      let block = rec[0];
      while (block.parentElement && block.parentElement !== root && rec.every((el) => block.parentElement.contains(el)) && !block.parentElement.contains(ceremonia)) block = block.parentElement;
      rec.every((el) => block.contains(el)) ? remove(block) : rec.forEach(remove);
    }
  }

  const horaEl = firstByKey(root, /^ubicacion-hora$/, { leaf: true });
  const etiquetaHora = firstByKey(root, /^ubicacion-etiqueta-hora$/, { leaf: true });
  if (horaEl) item.hora ? setTime(horaEl, item.hora, ctx.data.fecha) : remove(horaEl);
  if (item.tipo) {
    const label = etiquetaHora
      || firstByKey(root, /^ubicacion-(tipo|evento|etiqueta|antetitulo)$/, { leaf: true })
      || firstByKey(root, /^ubicacion-rotulo$/, { leaf: true })
      || firstByKey(root, /^ubicacion-subtitulo$/, { leaf: true })
      || (tituloEl && tituloEl !== nameEl ? tituloEl : null);
    if (label) setText(label, norm(item.tipo));
  } else if (etiquetaHora && !item.hora) {
    remove(etiquetaHora);
  }
  const q = [item.lugar, item.direccion].map(norm).filter(Boolean).join(', ');
  root.querySelectorAll('iframe').forEach((f) => {
    if (/google\.[^/]+\/maps|maps\.google/.test(f.getAttribute('src') || '')) {
      f.setAttribute('src', `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`);
      f.setAttribute('title', `Mapa: ${norm(item.lugar)}`);
    }
  });
  // "Cómo llegar" buttons: links to a maps site, or placeholders (href="#")
  // that the module's script leaves inert until a real link is set.
  root.querySelectorAll('a').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim();
    if (!href || href === '#' || /google\.[^/]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|waze\.com|Lugar(\+|%20)del(\+|%20)evento/i.test(href)) {
      a.setAttribute('href', item.mapa || mapsSearch(item));
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  });
  return true;
}

function writeVestimenta(root, ctx) {
  const code = norm(ctx.data.codigo_vestimenta);
  const nota = norm(ctx.data.vestimenta_nota);
  if (!code) return false;
  const codeEl = firstByKey(root, /^vestimenta-codigo$/, { leaf: true });
  const textEl = firstByKey(root, /^vestimenta-texto$/, { leaf: true });
  const notaEl = firstByKey(root, /^vestimenta-nota$/, { leaf: true });
  const templateCode = codeEl ? norm(codeEl.textContent) : '';
  if (codeEl) {
    setText(codeEl, code);
    if (textEl) {
      setText(textEl, nota || `Te sugerimos vestimenta ${code.toLowerCase()}.`);
      if (notaEl) remove(notaEl);
    } else if (notaEl) {
      nota ? setText(notaEl, nota) : remove(notaEl);
    }
  } else if (textEl) {
    setText(textEl, code);
    if (notaEl) nota ? setText(notaEl, nota) : remove(notaEl);
  } else if (notaEl) {
    setText(notaEl, nota ? `${code}. ${nota}` : code);
  }
  // Template-specific outfit tips only stay when the dress code did not change.
  if (normLower(templateCode) !== normLower(code)) {
    byKey(root, /^vestimenta-(tips|grupo-\d+|indicacion-\d+|reservado)$/).forEach(remove);
  }
  return true;
}
const normLower = (s) => norm(s).toLowerCase();

const REGALO_NAME = /^regalos-(?:(?:nombre|opcion|op|item)-?\d+(?:-titulo)?|\d+-(?:nombre|titulo))$/;
// Status words shown after a guest schedules a gift ("Agendado"): design UI, not data.
const REGALO_KEEP = /-(sello|estado|check|ok|hecho)$/;

/** Turn an element into a link (or put a link inside it) to the customer's URL. */
function setLink(el, url, text) {
  if (el.tagName === 'A') {
    el.setAttribute('href', url);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
    setText(el, text);
    return;
  }
  const a = el.ownerDocument.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener');
  a.setAttribute('style', 'color:inherit;text-decoration:underline;text-underline-offset:3px');
  a.textContent = text;
  el.textContent = '';
  el.appendChild(a);
}

const linkLabel = (x) => {
  let host = '';
  try { host = new URL(x.enlace).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
  return host ? `Ver lista en ${host}` : 'Ver lista de regalos';
};
const REGALO_TYPED = { mesa: /mesa|tienda|regalo/i, sobres: /sobre/i, transferencia: /transfer|banc|dep[oó]sito/i };

/**
 * "Agendar regalo" buttons only toggle a local message; there is no backend
 * behind them, so the whole button is hidden (not just its label). Hidden, not
 * removed: some module scripts expect the element and would stop with an error.
 */
function removeGiftButtons(root) {
  byKey(root, /^regalos-(boton|boton-ok|confirmacion)$/).forEach((el) => {
    const btn = el.closest('button, a, [role="button"]');
    const target = btn && btn !== root && root.contains(btn) ? btn : el;
    target.setAttribute('hidden', '');
    target.setAttribute('aria-hidden', 'true');
    target.setAttribute('style', `${target.getAttribute('style') ? `${target.getAttribute('style')};` : ''}display:none !important`);
    if (target.tagName === 'A') target.removeAttribute('href');
  });
}

function writeRegalos(root, ctx) {
  const items = (ctx.data.regalos || []).filter((x) => norm(x.tipo) || norm(x.detalle) || norm(x.enlace));
  if (!items.length) return false;
  const lineText = (x) => [norm(x.tipo), norm(x.detalle)].filter(Boolean).join(': ');

  // Typed groups: one block per kind of gift (mesa, sobres, transferencia).
  if (byKey(root, /^regalos-titulo-(mesa|sobres|transferencia)$/).length) {
    for (const [kind, re] of Object.entries(REGALO_TYPED)) {
      const title = firstByKey(root, new RegExp(`^regalos-titulo-${kind}$`), { leaf: true });
      if (!title) continue;
      const lines = byKey(root, new RegExp(`^regalos-${kind}-\\d+$`), { leaf: true });
      const mine = items.filter((x) => re.test(`${x.tipo} ${x.detalle}`));
      if (!mine.length) {
        const block = title.parentElement && title.parentElement !== root ? title.parentElement : title;
        lines.forEach(remove);
        remove(block);
        continue;
      }
      const entries = mine.flatMap((x) => [norm(x.detalle) ? { text: norm(x.detalle) } : null, x.enlace ? { url: x.enlace, text: linkLabel(x) } : null].filter(Boolean));
      if (!entries.length) continue; // keep the design's generic wording
      lines.forEach((el, i) => {
        const e = entries[i];
        if (!e) return remove(el);
        e.url ? setLink(el, e.url, e.text) : setText(el, e.text);
      });
    }
    removeGiftButtons(root);
    return true;
  }

  if (byKey(root, REGALO_NAME, { leaf: true }).length) {
    return fillRepeat(root, REGALO_NAME, items, (unit, x, i, slot) => {
      setText(slot, norm(x.tipo) || norm(x.detalle));
      // Every other text in the card is sample copy for a sample gift: the
      // customer's detail and link replace it, whatever is left is removed.
      const extras = [unit, ...Array.from(unit.querySelectorAll('[memory_key]'))]
        .filter((el) => el !== slot && el.hasAttribute && el.hasAttribute('memory_key') && isLeaf(el) && !REGALO_KEEP.test(keyOf(el)) && !el.contains(slot));
      const anchors = Array.from(unit.querySelectorAll('a[href]')).filter((a) => a !== slot && !a.contains(slot));
      const lines = [];
      if (norm(x.tipo) && norm(x.detalle)) lines.push({ text: norm(x.detalle) });
      if (x.enlace && !anchors.length) lines.push({ url: x.enlace, text: linkLabel(x) });
      extras.forEach((el, j) => {
        const line = lines[j];
        if (!line) return remove(el);
        line.url ? setLink(el, line.url, line.text) : setText(el, line.text);
      });
      if (lines.length > extras.length) {
        // Not enough text slots: add the rest after the last one (or the gift's name).
        const left = lines.slice(extras.length);
        let ref = extras[extras.length - 1] || slot;
        for (const line of left) {
          const p = unit.ownerDocument.createElement('span');
          p.setAttribute('style', 'display:block;margin-top:.35em');
          line.url ? setLink(p, line.url, line.text) : (p.textContent = line.text);
          insertAfter(ref, p);
          ref = p;
        }
      }
      anchors.forEach((a) => (x.enlace ? (a.setAttribute('href', x.enlace), a.setAttribute('target', '_blank'), a.setAttribute('rel', 'noopener')) : remove(a)));
    }) && (removeGiftButtons(root), true);
  }

  const rotulo = firstByKey(root, /^regalos-rotulo$/, { leaf: true });
  if (rotulo && norm(items[0].tipo)) setText(rotulo, norm(items[0].tipo));
  const withLink = items.filter((x) => x.enlace);
  const withoutLink = items.filter((x) => !x.enlace);
  const links = byKey(root, /^regalos-link$/, { leaf: true });
  const lines = byKey(root, /^regalos-(?:clabe|dato|datos-texto)$/, { leaf: true });
  const place = (els, list, write) => {
    if (!els.length) return list;
    const last = els[els.length - 1];
    list.forEach((x, i) => {
      let el = els[i];
      if (!el) {
        el = cloneUnit(last, i + 1);
        insertAfter(els[i - 1] || last, el);
        els.push(el);
      }
      write(el, x);
    });
    els.slice(list.length).forEach(remove);
    return [];
  };
  let leftover = place(links, withLink, (a, x) => setLink(a, x.enlace, lineText(x) || linkLabel(x)));
  leftover = [...leftover, ...withoutLink];
  const rest = place(lines, leftover, (el, x) => (x.enlace ? setLink(el, x.enlace, lineText(x) || linkLabel(x)) : setText(el, lineText(x))));
  if (rest.length) {
    const texto = firstByKey(root, /^regalos-texto$/, { leaf: true });
    if (texto) setText(texto, rest.map(lineText).join(' · '));
  }
  removeGiftButtons(root);
  return true;
}

function writeConfirmacion(root, ctx) {
  const labels = ctx.pack.labels || {};
  const texto = firstByKey(root, /^confirmacion-texto$/, { leaf: true });
  const extra = ctx.data.solo_adultos && labels.adultsOnly ? ` ${labels.adultsOnly}.` : '';
  if (texto) setText(texto, (labels.rsvpInfo || '') + extra);
  const limite = firstByKey(root, /^confirmacion-fecha-limite$/, { leaf: true });
  if (limite) {
    ctx.data.fecha_limite ? setText(limite, template(labels.rsvpDeadline || 'Confirma antes del {fecha}', { fecha: formatDateShort(ctx.data.fecha_limite) })) : remove(limite);
  }
  // Guests confirm through their personal link, so template buttons pointing
  // to a sample WhatsApp number are removed.
  root.querySelectorAll('a[href]').forEach((a) => {
    if (/wa\.me|whatsapp|mailto:|tel:|#/.test(a.getAttribute('href') || '')) remove(a);
  });
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const WRITERS = {
  portada: (root, ctx) => (writePortada(root, ctx), true),
  countdown: (root, ctx) => (writeCountdown(root, ctx), true),
  padres: writePadres,
  padrinos: writePadrinos,
  corte: writeCorte,
  itinerario: writeItinerario,
  ubicacion: (root, ctx, extra) => writeUbicacion(root, ctx, extra?.item),
  vestimenta: writeVestimenta,
  regalos: writeRegalos,
  confirmacion: writeConfirmacion,
  galeria: () => true
};

/** Apply the pack's copy (titles, small labels) to a module built for another event. */
function applyCopy(root, copy) {
  for (const [key, text] of Object.entries(copy || {})) {
    byKey(root, new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), { leaf: true }).forEach((el) => setText(el, text));
  }
}

/** Suffix every editable key in a repeated module instance (second location…). */
function suffixInstance(root, n) {
  const oldId = root.getAttribute('data-gemini-id') || '';
  const newId = `${oldId}-${n}`;
  root.setAttribute('data-gemini-id', newId);
  root.querySelectorAll('[memory_key]').forEach((el) => el.setAttribute('memory_key', `${keyOf(el)}-i${n}`));
  const ids = new Map();
  root.querySelectorAll('[id]').forEach((el) => {
    const nid = `${el.getAttribute('id')}-i${n}`;
    ids.set(el.getAttribute('id'), nid);
    el.setAttribute('id', nid);
  });
  rewriteIdRefs(root, ids);
  // Module scripts find their own section by its data-gemini-id
  // ('[data-gemini-id="ubicacion-mapa"]'); point this copy's scripts at the new name.
  if (oldId) {
    const esc = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(data-gemini-id\\s*=\\s*\\\\?["'])${esc}(\\\\?["'])`, 'g');
    root.querySelectorAll('script').forEach((sc) => {
      const t = sc.textContent || '';
      const nt = t.replace(re, `$1${newId}$2`);
      if (nt !== t) sc.textContent = nt;
    });
  }
}

const PLACEHOLDER_PATTERNS = [
  [/\bNombre(\s+y\s+Nombre)?\s+Apellido\b/i, 'nombre de ejemplo'],
  [/\bNombre\s+(Pap[aá]|Mam[aá]|Madrina|Padrino|Novia|Novio)\b/i, 'nombre de ejemplo'],
  [/\bNombre\s*(&|y)\s*Nombre\b/i, 'nombre de ejemplo'],
  [/\bNombre del (lugar|sal[oó]n|templo)\b/i, 'lugar de ejemplo'],
  [/Fecha del evento/i, 'fecha de ejemplo'],
  [/Calle Principal/i, 'dirección de ejemplo'],
  [/CLABE\s*:?\s*0000/i, 'cuenta de ejemplo'],
  [/\bDD de mes\b/i, 'fecha de ejemplo'],
  [/Lugar del evento/i, 'lugar de ejemplo'],
  [/\b(Calle|Av\.?|Avenida)\s+Ejemplo\b|\bEjemplo\s+\d+/i, 'dirección de ejemplo'],
  [/Ciudad,\s*Estado|C\.\s?P\.\s*0{5}\b/i, 'dirección de ejemplo'],
  [/Tienda\s+Nombre/i, 'mesa de regalos de ejemplo'],
  [/\b0{6,}\b/, 'número de ejemplo'],
  [/Lorem ipsum/i, 'texto de ejemplo']
];
const PLACEHOLDER_URLS = /wa\.me\/52?10{6,}|mesaderegalos\.com\/ejemplo|example\.(com|org)/i;

/** Sample text or links that would be published as-is. */
export function scanPlaceholders(root) {
  const found = [];
  // Visible text only: CSS colours (#000000) and script code are not content.
  const parts = [];
  const walk = (node) => {
    for (const child of Array.from(node.childNodes || [])) {
      if (child.nodeType === 3) parts.push(child.textContent);
      else if (child.nodeType === 1 && !/^(STYLE|SCRIPT|TEMPLATE|NOSCRIPT)$/i.test(child.tagName)) walk(child);
    }
  };
  walk(root);
  const text = norm(parts.join(' '));
  for (const [re, label] of PLACEHOLDER_PATTERNS) {
    const m = text.match(re);
    if (m) found.push({ kind: label, sample: m[0] });
  }
  root.querySelectorAll('a[href], iframe[src]').forEach((el) => {
    const v = el.getAttribute('href') || el.getAttribute('src') || '';
    if (PLACEHOLDER_URLS.test(v)) found.push({ kind: 'enlace de ejemplo', sample: v.slice(0, 60) });
  });
  return found;
}

/**
 * Fill one module. Returns { html, ok, warnings }.
 * ctx = { pack, data, isoDateTime, adapting, instance }
 */
export function fillModule(module, ctx, extra = {}) {
  const { root } = parseSection(module.section);
  if (!root) return { html: '', ok: false, warnings: [{ kind: 'módulo inválido', sample: module.id }] };
  const writer = WRITERS[module.type];
  let ok = true;
  try {
    ok = writer ? writer(root, ctx, extra) !== false : true;
  } catch (e) {
    ok = false;
  }
  if (ctx.adapting && ctx.pack.copy && ctx.pack.copy[module.type]) applyCopy(root, ctx.pack.copy[module.type]);
  dedupeKeys(root);
  repairIdRefs(root, parseSection(module.section).root);
  // Template hooks for the old free-form pipeline are not needed anymore.
  root.querySelectorAll('[data-event-field]').forEach((el) => el.removeAttribute('data-event-field'));
  // Sample links left in a module never go out.
  root.querySelectorAll('a[href]').forEach((a) => {
    if (PLACEHOLDER_URLS.test(a.getAttribute('href') || '')) remove(a);
  });
  // Each module declares `const moduleMetadata` for the library. Several
  // modules on one page would redeclare it and throw, so the block is kept
  // as inert data instead of running.
  root.querySelectorAll('script').forEach((sc) => {
    if (/moduleMetadata\s*=/.test(sc.textContent || '') && !sc.getAttribute('type')) {
      sc.setAttribute('type', 'text/plain');
      sc.setAttribute('data-module-metadata', '');
    }
  });
  if (extra.instance && extra.instance > 1) suffixInstance(root, extra.instance);
  root.setAttribute('data-im-module', module.id);
  const warnings = scanPlaceholders(root);
  return { html: root.outerHTML, ok, warnings };
}
