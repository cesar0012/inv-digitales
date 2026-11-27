/**
 * Cómo se aplica a un elemento una edición hecha en el panel del editor.
 *
 * La invitación vive en dos documentos: el de la vista previa (el que la
 * persona está viendo) y el que se guarda. Los dos usan estas mismas reglas,
 * así que lo que se ve es exactamente lo que se guarda.
 */

export interface EdicionElemento {
  /** Texto nuevo del elemento (solo para textos). */
  content?: string;
  /** Atributos que cambian. Con valor vacío se quita el atributo. */
  attributes?: Record<string, string>;
  /** Estilos en línea. Con valor vacío se quita la propiedad. */
  styles?: Record<string, string>;
  /**
   * Posición del texto que se edita dentro del elemento (ver rutaDelTexto).
   * Sin ella se toma el primer texto con contenido, que es lo que el panel
   * muestra al abrir un elemento.
   */
  rutaTexto?: number[];
}

const TEXT_LEAF_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, span, li, time, figcaption, blockquote, strong, em, label, td, th';
export const CLASES_DE_ANIMACION = ['animate-none', 'animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce', 'animate-fade-in', 'animate-slide-up'];

/** Selector del elemento con ese identificador (los identificadores pueden traer comillas). */
export const selectorDeElemento = (geminiId: string): string => `[data-gemini-id="${geminiId.replace(/(["\\])/g, '\\$1')}"]`;

export const buscarElemento = (raiz: ParentNode, geminiId: string): HTMLElement | null =>
  (raiz.querySelector(selectorDeElemento(geminiId)) as HTMLElement | null) ?? null;

/** El texto que el panel edita: el primer texto directo con contenido o, si no lo hay, la primera hoja de texto. */
const nodoDelTexto = (el: HTMLElement): Node | null => {
  for (let i = 0; i < el.childNodes.length; i++) {
    const nodo = el.childNodes[i];
    if (nodo.nodeType === Node.TEXT_NODE && nodo.textContent && nodo.textContent.trim().length > 0) return nodo;
  }
  const hoja = el.querySelector(TEXT_LEAF_SELECTOR);
  if (hoja && hoja.children.length === 0) return hoja;
  return null;
};

/**
 * Posición del texto que se edita, como índices entre hermanos desde el
 * elemento. [] es el propio elemento (solo tiene texto). null si el elemento
 * no tiene un texto que editar.
 *
 * Se calcula una vez, al empezar a editar, y se conserva: si solo se buscara
 * "el primer texto con contenido", al borrarlo la siguiente letra iría a otro
 * texto del mismo elemento.
 */
export const rutaDelTexto = (el: HTMLElement): number[] | null => {
  if (el.children.length === 0) return [];
  const nodo = nodoDelTexto(el);
  if (!nodo) return null;
  const ruta: number[] = [];
  let actual: Node | null = nodo;
  while (actual && actual !== el) {
    const padre = actual.parentNode;
    if (!padre) return null;
    ruta.unshift(Array.prototype.indexOf.call(padre.childNodes, actual));
    actual = padre;
  }
  return actual === el ? ruta : null;
};

/** El nodo que está en esa posición dentro del elemento. */
export const nodoEnRuta = (el: HTMLElement, ruta: number[]): Node | null => {
  let actual: Node = el;
  for (const indice of ruta) {
    const siguiente: Node | undefined = actual.childNodes[indice];
    if (!siguiente) return null;
    actual = siguiente;
  }
  return actual;
};

/** El texto que el panel muestra para este elemento (el de la posición fijada, si la hay). */
export const textoEditable = (el: HTMLElement, rutaTexto?: number[] | null): string => {
  if (rutaTexto && rutaTexto.length > 0) {
    const nodo = nodoEnRuta(el, rutaTexto);
    if (nodo) return nodo.textContent || '';
  }
  return el.textContent || '';
};

const camelToKebab = (k: string): string => k.replace(/([A-Z])/g, '-$1').toLowerCase();

const ponerAtributo = (el: HTMLElement, nombre: string, valor: string): void => {
  if (nombre === 'animationClass') {
    for (const clase of CLASES_DE_ANIMACION) {
      if (clase !== valor && el.classList.contains(clase)) el.classList.remove(clase);
    }
    if (valor && valor !== 'none' && !el.classList.contains(valor)) el.classList.add(valor);
    return;
  }
  if (nombre === 'bgImage') {
    if (valor) {
      const fondo = `url("${valor}")`;
      if (el.style.getPropertyValue('background-image') !== fondo) el.style.setProperty('background-image', fondo, 'important');
    } else if (el.style.backgroundImage) {
      el.style.removeProperty('background-image');
    }
    return;
  }
  // Solo se toca lo que de verdad cambia: en la vista previa el elemento sigue
  // vivo, y reponer una y otra vez la misma imagen o el mismo enlace la recargaría.
  if (valor) {
    if (el.getAttribute(nombre) !== valor) el.setAttribute(nombre, valor);
  } else if (el.hasAttribute(nombre)) {
    el.removeAttribute(nombre);
  }
};

/**
 * Aplica la edición al elemento. Solo toca lo indicado: lo demás que haya en
 * el elemento (por ejemplo, la marca de selección en la vista previa) se queda.
 */
export const aplicarEdicionEnElemento = (el: HTMLElement, edicion: EdicionElemento): void => {
  const { content, attributes, styles, rutaTexto } = edicion;

  if (content !== undefined && el.tagName !== 'IMG' && el.tagName !== 'IFRAME') {
    let objetivo: Node | null = null;
    if (rutaTexto) objetivo = nodoEnRuta(el, rutaTexto);
    else if (el.children.length === 0) objetivo = el;
    else objetivo = nodoDelTexto(el);
    // Si la posición fijada ya no lleva a un texto (o a una hoja), se vuelve a buscar.
    if (objetivo && objetivo.nodeType !== Node.TEXT_NODE && objetivo.nodeType !== Node.ELEMENT_NODE) objetivo = el.children.length === 0 ? el : nodoDelTexto(el);
    if (objetivo) objetivo.textContent = content;
  }

  if (attributes) {
    for (const [nombre, valor] of Object.entries(attributes)) ponerAtributo(el, nombre, valor);
  }

  if (styles) {
    for (const [propiedad, valor] of Object.entries(styles)) {
      if (propiedad === 'color') {
        // El color elegido para UN elemento manda sobre el tema de toda la
        // invitación (el tema vuelve a definir sus colores en cada elemento).
        // Se aplica al elemento y sus textos heredan, aunque por su cuenta
        // usaran un color del tema.
        if (valor) {
          el.style.setProperty('color', valor, 'important');
          for (const hijo of Array.from(el.querySelectorAll('*'))) {
            const h = hijo as HTMLElement;
            if (!h.style.color) h.style.color = 'inherit';
          }
        } else {
          el.style.removeProperty('color');
          for (const hijo of Array.from(el.querySelectorAll('*'))) {
            const h = hijo as HTMLElement;
            if (h.style.color === 'inherit') h.style.removeProperty('color');
          }
        }
        continue;
      }
      if (valor) {
        if ((el.style as CSSStyleDeclaration & Record<string, string>)[propiedad] !== valor) {
          (el.style as CSSStyleDeclaration & Record<string, string>)[propiedad] = valor;
        }
      } else {
        el.style.removeProperty(camelToKebab(propiedad));
      }
    }
  }
};

/**
 * Cambia un elemento dentro del código de la invitación sin reescribir todo el
 * documento (que puede pesar varios MB). Devuelve null si el elemento no se
 * localiza con seguridad: entonces conviene reescribirlo completo.
 */
export const cambiarElementoEnCodigo = (codigo: string, antes: string, despues: string): string | null => {
  const posicion = codigo.indexOf(antes);
  if (posicion === -1 || codigo.indexOf(antes, posicion + 1) !== -1) return null;
  return codigo.slice(0, posicion) + despues + codigo.slice(posicion + antes.length);
};

export type Visibilidad = { geminiId: string } | { modulo: string };

// Mismo criterio con el que la barra lateral agrupa los elementos por módulo.
const esDelModulo = (geminiId: string, modulo: string): boolean => {
  let nombre = '';
  if (geminiId && !geminiId.startsWith('edit-') && geminiId.length < 30) {
    const partes = geminiId.split('-');
    if (partes.length > 1) nombre = partes[0].replace(/\b\w/g, (l) => l.toUpperCase());
  }
  return (nombre || 'Otros Elementos') === modulo;
};

/**
 * Lo que hay que ocultar o mostrar: el propio elemento, o bien la sección
 * completa que contiene los elementos de un módulo (si abarcan todo el cuerpo,
 * cada elemento por separado).
 */
export const nodosAAlternar = (doc: Document, objetivo: Visibilidad): HTMLElement[] => {
  if ('geminiId' in objetivo) {
    const el = buscarElemento(doc, objetivo.geminiId);
    return el ? [el] : [];
  }
  const delModulo = Array.from(doc.querySelectorAll('[data-gemini-id]'))
    .filter((el) => esDelModulo(el.getAttribute('data-gemini-id') || '', objetivo.modulo)) as HTMLElement[];
  if (delModulo.length === 0) return [];
  let comun: HTMLElement | null = delModulo[0];
  for (let i = 1; i < delModulo.length && comun; i++) {
    while (comun && !comun.contains(delModulo[i])) comun = comun.parentElement;
  }
  if (comun && comun.tagName !== 'BODY' && comun.tagName !== 'HTML') return [comun];
  return delModulo;
};

/** Oculta un elemento, o lo vuelve a mostrar si ya estaba oculto. */
export const alternarOculto = (el: HTMLElement): void => {
  if (el.getAttribute('data-gemini-hidden') === 'true') {
    el.removeAttribute('data-gemini-hidden');
    el.style.removeProperty('display');
  } else {
    el.setAttribute('data-gemini-hidden', 'true');
    el.style.setProperty('display', 'none', 'important');
  }
};
