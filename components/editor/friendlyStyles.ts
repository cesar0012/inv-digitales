/**
 * ============================================================================
 * ESTILOS DEL EDITOR EN PALABRAS — lógica pura (sin interfaz)
 * ============================================================================
 * Quien personaliza su invitación no debe ver medidas técnicas (píxeles, rem,
 * hex, variables CSS). Cada control se expresa en palabras y SIEMPRE en
 * relación con el diseño original: "Grande" significa un poco más grande de
 * lo que ese texto ya es, en computadora y en celular.
 *
 * Cómo se logra sin mostrar medidas (todas son relativas a la propia letra
 * del elemento, por eso se adaptan a cualquier pantalla):
 *   - Tamaño de la letra      → "zoom" (proporción del propio tamaño)
 *   - Espacio entre renglones → proporción de la propia letra
 *   - Espacio entre letras    → proporción de la propia letra
 *   - Espacio alrededor       → proporción de la propia letra
 *
 * Para que las opciones sean relativas al DISEÑO (y no a lo que el usuario ya
 * haya cambiado) se guardan dos cosas en el elemento (data-editor-styles):
 *   base: medidas del diseño original, tomadas de la vista previa
 *   orig: cómo estaba escrita la propiedad originalmente, para poder volver
 * ============================================================================
 */

export type PropiedadEstilo =
  | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'padding'
  | 'width' | 'height' | 'color' | 'backgroundColor' | 'fontWeight';

/** Medidas reales del elemento tal como está en el diseño (en píxeles). */
export interface MetricasElemento {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  padding: [number, number, number, number];
}

/** Medidas del diseño original, en proporción a la propia letra del elemento. */
export interface BaseDiseno {
  lineHeight?: number;
  letterSpacing?: number;
  padding?: [number, number, number, number];
}

export interface RegistroEditor {
  base?: BaseDiseno;
  orig?: Record<string, string>;
}

export const REGISTRO_VACIO: RegistroEditor = {};

/** Atributo del elemento donde se guarda el registro. */
export const ATTR_REGISTRO = 'data-editor-styles';

export function parsearRegistro(raw: string | null | undefined): RegistroEditor {
  if (!raw) return REGISTRO_VACIO;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return REGISTRO_VACIO;
    const reg: RegistroEditor = {};
    if (v.base && typeof v.base === 'object') {
      const base: BaseDiseno = {};
      if (Number.isFinite(v.base.lineHeight)) base.lineHeight = v.base.lineHeight;
      if (Number.isFinite(v.base.letterSpacing)) base.letterSpacing = v.base.letterSpacing;
      const p = v.base.padding;
      if (Array.isArray(p) && p.length === 4 && p.every((n: unknown) => Number.isFinite(n))) {
        base.padding = [p[0], p[1], p[2], p[3]];
      }
      if (Object.keys(base).length) reg.base = base;
    }
    if (v.orig && typeof v.orig === 'object' && !Array.isArray(v.orig)) {
      const orig: Record<string, string> = {};
      for (const [k, val] of Object.entries(v.orig)) if (typeof val === 'string') orig[k] = val;
      if (Object.keys(orig).length) reg.orig = orig;
    }
    return reg;
  } catch {
    return REGISTRO_VACIO;
  }
}

export function serializarRegistro(reg: RegistroEditor): string {
  const base = reg.base && Object.keys(reg.base).length ? reg.base : undefined;
  const orig = reg.orig && Object.keys(reg.orig).length ? reg.orig : undefined;
  if (!base && !orig) return '';
  return JSON.stringify({ ...(base ? { base } : {}), ...(orig ? { orig } : {}) });
}

function clonarRegistro(reg: RegistroEditor): RegistroEditor {
  const out: RegistroEditor = {};
  if (reg.base && Object.keys(reg.base).length) {
    out.base = { ...reg.base };
    if (reg.base.padding) out.base.padding = [...reg.base.padding] as [number, number, number, number];
  }
  if (reg.orig && Object.keys(reg.orig).length) out.orig = { ...reg.orig };
  return out;
}

// ---------------------------------------------------------------------------
// Escalas en palabras
// ---------------------------------------------------------------------------
interface Escala {
  etiquetas: string[];
  /** Índice de la opción "Normal" (vuelve al diseño), o -1 si no tiene. */
  normal: number;
}

const TAMANO_LETRA = [0.8, 0.9, 1, 1.15, 1.35];
const ANCHO_PRESETS = ['35%', '60%', '80%', '100%'];
const ALTO_PRESETS = ['250px', '350px', '480px', '600px'];

const ESCALAS: Record<PropiedadEstilo, Escala> = {
  fontSize:        { etiquetas: ['Muy pequeña', 'Pequeña', 'Normal', 'Grande', 'Muy grande'], normal: 2 },
  lineHeight:      { etiquetas: ['Muy junto', 'Junto', 'Normal', 'Suelto', 'Muy suelto'], normal: 2 },
  letterSpacing:   { etiquetas: ['Juntas', 'Normal', 'Separadas', 'Muy separadas'], normal: 1 },
  padding:         { etiquetas: ['Muy reducido', 'Reducido', 'Normal', 'Amplio', 'Muy amplio'], normal: 2 },
  width:           { etiquetas: ['Pequeña', 'Mediana', 'Grande', 'Completa'], normal: -1 },
  height:          { etiquetas: ['Bajo', 'Normal', 'Alto', 'Muy alto'], normal: -1 },
  color:           { etiquetas: [], normal: -1 },
  backgroundColor: { etiquetas: [], normal: -1 },
  fontWeight:      { etiquetas: [], normal: -1 },
};

type Relativa = 'lineHeight' | 'letterSpacing' | 'padding';
const RELATIVAS: Relativa[] = ['lineHeight', 'letterSpacing', 'padding'];

/** Cuánto se aparta cada opción del diseño (en pasos). */
const DESPLAZAMIENTOS: Record<Relativa, number[]> = {
  lineHeight: [-2, -1, 0, 1, 2],
  letterSpacing: [-1, 0, 1, 2],
  padding: [-2, -1, 0, 1, 2],
};
/** Tamaño de cada paso, en proporción a la letra del elemento. */
const PASO: Record<Relativa, number> = { lineHeight: 0.22, letterSpacing: 0.05, padding: 0.35 };
/** Límites para que el resultado siempre sea legible. */
const MINIMO: Record<Relativa, number> = { lineHeight: 0.8, letterSpacing: -0.04, padding: 0 };

const BASE_POR_DEFECTO: Required<BaseDiseno> = { lineHeight: 1.5, letterSpacing: 0, padding: [0, 0, 0, 0] };

/** Opciones en palabras de un control. */
export const etiquetasDe = (prop: PropiedadEstilo): string[] => ESCALAS[prop].etiquetas;

/** Índice de la opción "Normal", o -1 si el control no la tiene. */
export const nivelNormal = (prop: PropiedadEstilo): number => ESCALAS[prop].normal;

/** ¿La propiedad está tal como está en el diseño (el usuario no la ha cambiado)? */
export const esDelDiseno = (prop: PropiedadEstilo, reg: RegistroEditor): boolean => reg.orig?.[prop] === undefined;

// ---------------------------------------------------------------------------
// Medidas del diseño
// ---------------------------------------------------------------------------
const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Medidas del diseño a partir de lo medido en la vista previa. Todo se
 * expresa en proporción a la propia letra del elemento. Valores imposibles
 * (elemento oculto, "normal", etc.) caen a un valor por defecto.
 */
export function baseDesdeMetricas(m: MetricasElemento | null | undefined): Required<BaseDiseno> {
  const fs = Number.isFinite(m?.fontSize) && (m as MetricasElemento).fontSize > 0 ? (m as MetricasElemento).fontSize : 0;
  const proporcion = (valor: number, defecto: number, min: number, max: number) => {
    if (!(fs > 0) || !Number.isFinite(valor)) return defecto;
    const r = valor / fs;
    return r >= min && r <= max ? redondear(r) : defecto;
  };
  const p = m?.padding ?? [0, 0, 0, 0];
  return {
    lineHeight: proporcion(m?.lineHeight ?? NaN, BASE_POR_DEFECTO.lineHeight, 0.6, 4),
    letterSpacing: proporcion(m?.letterSpacing ?? NaN, 0, -0.2, 1),
    padding: [proporcion(p[0], 0, 0, 20), proporcion(p[1], 0, 0, 20), proporcion(p[2], 0, 0, 20), proporcion(p[3], 0, 0, 20)],
  };
}

const baseEfectiva = (reg: RegistroEditor): Required<BaseDiseno> => ({ ...BASE_POR_DEFECTO, ...(reg.base || {}) });

// ---------------------------------------------------------------------------
// Valores CSS (se generan aquí; la interfaz nunca los muestra)
// ---------------------------------------------------------------------------
const fmt = (n: number) => String(redondear(n));
const clamp = (n: number, min: number) => (n < min ? min : n);

function cssDe(prop: PropiedadEstilo, nivel: number, base: Required<BaseDiseno>): string {
  if (prop === 'fontSize') return String(TAMANO_LETRA[nivel]);
  if (prop === 'width') return ANCHO_PRESETS[nivel];
  if (prop === 'height') return ALTO_PRESETS[nivel];
  if (prop === 'lineHeight') return fmt(clamp(base.lineHeight + DESPLAZAMIENTOS.lineHeight[nivel] * PASO.lineHeight, MINIMO.lineHeight));
  if (prop === 'letterSpacing') return `${fmt(clamp(base.letterSpacing + DESPLAZAMIENTOS.letterSpacing[nivel] * PASO.letterSpacing, MINIMO.letterSpacing))}em`;
  const d = DESPLAZAMIENTOS.padding[nivel] * PASO.padding;
  return base.padding.map((lado) => `${fmt(Math.max(0, lado + d))}em`).join(' ');
}

/** Valor numérico de un CSS para poder comparar opciones (null si no es comparable). */
function claveDe(prop: PropiedadEstilo, css: string): number[] | null {
  const s = String(css ?? '').trim();
  if (!s) return null;
  const soloNumero = /^-?\d*\.?\d+$/;
  switch (prop) {
    case 'fontSize':
      return soloNumero.test(s) ? [parseFloat(s)] : null;
    case 'lineHeight':
      return soloNumero.test(s) ? [parseFloat(s)] : null;
    case 'letterSpacing':
      if (/^-?\d*\.?\d+em$/.test(s)) return [parseFloat(s)];
      return s === 'normal' || s === '0px' ? [0] : null;
    case 'padding': {
      const partes = s.split(/\s+/);
      if (partes.some((p) => !/^\d*\.?\d+em$/.test(p))) return null;
      const v = partes.map((p) => parseFloat(p));
      if (v.length === 1) return [v[0], v[0], v[0], v[0]];
      if (v.length === 2) return [v[0], v[1], v[0], v[1]];
      if (v.length === 3) return [v[0], v[1], v[2], v[1]];
      return v.length === 4 ? v : null;
    }
    case 'width':
      return /^-?\d*\.?\d+%$/.test(s) ? [parseFloat(s)] : null;
    case 'height':
      return /^-?\d*\.?\d+px$/.test(s) ? [parseFloat(s)] : null;
    default:
      return null;
  }
}

const TOLERANCIA: Partial<Record<PropiedadEstilo, number>> = { fontSize: 0.006, width: 0.51, height: 0.51 };
const cercanos = (prop: PropiedadEstilo, a: number[], b: number[] | null) =>
  !!b && b.length === a.length && a.every((n, i) => Math.abs(n - b[i]) <= (TOLERANCIA[prop] ?? 0.011));

// ---------------------------------------------------------------------------
// API del editor
// ---------------------------------------------------------------------------
export interface ContextoPropiedad {
  /** Valor escrito en el elemento ahora (lo que hay en su atributo style). */
  inline: string;
  reg: RegistroEditor;
}

/**
 * Qué opción está activa en un control, o null si ninguna (valor propio del
 * diseño que no coincide con ninguna palabra).
 */
export function nivelActual(prop: PropiedadEstilo, ctx: ContextoPropiedad): number | null {
  const normal = nivelNormal(prop);
  // Sin cambios del usuario: está "Normal", como en el diseño.
  if (normal >= 0 && esDelDiseno(prop, ctx.reg)) return normal;

  const clave = claveDe(prop, ctx.inline);
  if (!clave) return null;
  const base = baseEfectiva(ctx.reg);
  const total = etiquetasDe(prop).length;
  for (let i = 0; i < total; i++) {
    if (i === normal) continue;
    if (cercanos(prop, clave, claveDe(prop, cssDe(prop, i, base)))) return i;
  }
  return null;
}

/**
 * ¿La opción cambia algo respecto al diseño? Las que darían el mismo
 * resultado que "Normal" (o que una opción anterior) se muestran desactivadas:
 * no tendría caso ofrecerlas (p. ej. "Reducido" en un texto sin espacio alrededor).
 */
export function nivelDisponible(prop: PropiedadEstilo, nivel: number, reg: RegistroEditor): boolean {
  const normal = nivelNormal(prop);
  if (normal < 0 || nivel === normal) return true;
  const base = baseEfectiva(reg);
  const css = cssDe(prop, nivel, base);
  if (css === cssDe(prop, normal, base)) return false;
  for (let i = 0; i < nivel; i++) {
    if (i !== normal && nivelDisponible(prop, i, reg) && css === cssDe(prop, i, base)) return false;
  }
  return true;
}

/**
 * El usuario elige una opción (índice en etiquetasDe). Devuelve el valor que
 * debe escribirse en el elemento y el registro actualizado. "Normal" devuelve
 * la propiedad a como estaba en el diseño.
 */
export function elegirNivel(
  prop: PropiedadEstilo,
  nivel: number,
  ctx: ContextoPropiedad & { metricas?: MetricasElemento | null },
): { css: string; reg: RegistroEditor } {
  if (!Number.isInteger(nivel) || nivel < 0 || nivel >= etiquetasDe(prop).length) {
    return { css: ctx.inline, reg: ctx.reg };
  }
  if (nivel === nivelNormal(prop)) return restaurarDiseno(prop, ctx);

  const reg = clonarRegistro(ctx.reg);
  // Primera vez que se toca: recordar cómo estaba en el diseño para poder volver.
  reg.orig = { ...(reg.orig || {}), [prop]: reg.orig?.[prop] ?? ctx.inline };

  if ((RELATIVAS as string[]).includes(prop)) {
    const medida = baseDesdeMetricas(ctx.metricas);
    if (reg.base?.[prop as Relativa] === undefined) {
      reg.base = { ...(reg.base || {}), [prop]: medida[prop as Relativa] };
    }
  }
  return { css: cssDe(prop, nivel, baseEfectiva(reg)), reg };
}

/**
 * Un control fija un valor concreto (color, grosor…). Recuerda cómo estaba la
 * propiedad en el diseño para poder volver a ella.
 */
export function fijarEstilo(prop: PropiedadEstilo, css: string, ctx: ContextoPropiedad): { css: string; reg: RegistroEditor } {
  const reg = clonarRegistro(ctx.reg);
  const orig = { ...(reg.orig || {}), [prop]: reg.orig?.[prop] ?? ctx.inline };
  // Si quedó igual que en el diseño, ya no hay nada que restaurar.
  if (css === orig[prop]) delete orig[prop];
  reg.orig = Object.keys(orig).length ? orig : undefined;
  return { css, reg };
}

/**
 * Vuelve a como está la propiedad en el diseño. Si el usuario no la había
 * cambiado, no toca nada (nunca borra un valor propio del diseño).
 */
export function restaurarDiseno(prop: PropiedadEstilo, ctx: ContextoPropiedad): { css: string; reg: RegistroEditor } {
  const orig = ctx.reg.orig?.[prop];
  if (orig === undefined) return { css: ctx.inline, reg: ctx.reg };
  const restantes = { ...(ctx.reg.orig || {}) };
  delete restantes[prop];
  return { css: orig, reg: clonarRegistro({ base: ctx.reg.base, orig: restantes }) };
}
