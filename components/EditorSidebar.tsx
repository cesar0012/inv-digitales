import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ClipboardList, Palette, Heart, Pencil, Save, Home, Image as ImageIcon, Link as LinkIcon, Type, MousePointer2, ChevronDown, ChevronRight, AlignLeft, AlignCenter, AlignRight, AlignJustify, Map, Upload, Eye, EyeOff, Loader2, Calendar, Clock, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { compressImage, SUPPORTED_IMAGE_TYPES, SUPPORTED_FORMATS_LABEL } from '../services/imageCompressionService';
import { GOOGLE_FONT_OPTIONS, GOOGLE_HEADING_FONT_OPTIONS } from '../constants';
import { SelectorPalabras, ControlColor, ColorDeInvitacion } from './editor/FriendlyControls';
import {
  elegirNivel, nivelActual, nivelDisponible, etiquetasDe, esDelDiseno, fijarEstilo, restaurarDiseno,
  serializarRegistro, parsearRegistro, ATTR_REGISTRO, REGISTRO_VACIO,
  type PropiedadEstilo, type RegistroEditor, type MetricasElemento,
} from './editor/friendlyStyles';
import { textoEditable } from './editor/elementEdit';

// ============================================================
// FEATURE FLAG: AI ITERATIONS
// ============================================================
// Establecer en false para ocultar las funciones de IA en el editor
// Estas funciones permiten regenerar diseño y agregar nuevos módulos
// Mantener false hasta que el sistema de créditos esté implementado
const AI_ITERATIONS_ENABLED = true;
// ============================================================

/** Un elemento de la invitación tal como se muestra y se edita en el panel. */
export interface EditableElement {
  geminiId: string;
  tagName: string;
  content: string;
  textContent: string;
  src: string;
  href: string;
  bgImage: string;
  styles: Record<string, string>;
  animationClass: string;
  label: string;
  moduleName?: string;
  isHidden: boolean;
  isBackground: boolean;
  editorStyles: RegistroEditor;
}

const extractBgImageUrl = (bgValue: string): string => {
  if (!bgValue || bgValue === 'none') return '';
  const match = bgValue.match(/url\(["']?([^"')]+)["']?\)/);
  return match ? match[1] : '';
};

const TEXT_LEAF_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, span, li, time, figcaption, blockquote, strong, em, label, td, th';

// hasUsefulText: revisa el texto que REALMENTE se mostrará en el panel
// (extractEditableText). El filtro anterior miraba textContent global del
// elemento, lo que NO coincidía con el contenido del textarea del panel
// cuando extractEditableText iteraba childNodes o buscaba hojas.
// Descartos: vacío, solo whitespace/tabs/newlines (incluye U+00A0 &nbsp;),
// 1 solo char, solo signos/puntuación/símbolos, secuencias de un mismo char.
const NORMALIZE_WHITESPACE = (s: string): string => {
  if (!s) return '';
  // .trim() no cubre U+00A0 (nbsp) ni otros espacios Unicode. Convertimos
  // a U+0020 y luego trim.
  return s
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const hasUsefulText = (raw: string): boolean => {
  const trimmed = NORMALIZE_WHITESPACE(raw);
  if (!trimmed) return false;
  if (trimmed.length < 2) return false;
  // Sin letras ni dígitos (solo signos/puntos/rayas/símbolos) → descartar.
  const hasLetterOrDigit = /[A-Za-zÁÉÍÓÚáéíóúÜüÑñ0-9]/.test(trimmed);
  if (!hasLetterOrDigit) return false;
  // Secuencia de un único caracter repetido (---, ..., ···, ===, ___)
  if (/^(.)\1+$/.test(trimmed)) return false;
  return true;
};

// isVisualElement: conserva elementos no textuales aunque no tengan texto.
// - IMG, IFRAME siempre visuales
// - A con imagen de fondo o con IMG interno
// - elementos con background-image (con data-gemini-id) → backgrounds
// - memory_type="background"
const isVisualElement = (el: HTMLElement): boolean => {
  const tag = el.tagName;
  if (tag === 'IMG' || tag === 'IFRAME') return true;
  if (tag === 'A') {
    if (el.querySelector('img')) return true;
    const bg = extractBgImageUrl(el.style.backgroundImage);
    if (bg) return true;
  }
  if (el.getAttribute('memory_type') === 'background') return true;
  const bg = extractBgImageUrl(el.style.backgroundImage);
  if (bg) return true;
  return false;
};

const extractEditableText = (el: HTMLElement): string => {
  if (el.children.length === 0) {
    return el.textContent || '';
  }
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) {
      return node.textContent;
    }
  }
  const leaf = el.querySelector(TEXT_LEAF_SELECTOR);
  if (leaf && leaf.children.length === 0) {
    return leaf.textContent || '';
  }
  return el.textContent || '';
};

/** Si el elemento debe aparecer en la lista del panel. */
const esElementoEditable = (htmlEl: HTMLElement): boolean => {
  // Excluir countdowns
  if (htmlEl.getAttribute('data-gemini-id')!.startsWith('countdown')) return false;
  // Excluir elementos con memory_usage="protected" salvo backgrounds editables
  if (htmlEl.getAttribute('memory_usage') === 'protected'
      && htmlEl.getAttribute('memory_type') !== 'background') return false;
  // Filtro de contenido: descartar elementos cuyo texto-editable (lo que
  // verá el usuario en el textarea del panel) NO tenga contenido útil.
  // Se revisa justo el sub-árbol que se mostrará.
  if (!isVisualElement(htmlEl)) {
    // Elementos A sin imagen de fondo pero con href: se conservan (son
    // enlaces útiles aunque su texto sea corto). A con texto utilizable
    // también pasa por la regla general.
    const isLinkWithHref = htmlEl.tagName === 'A' && (htmlEl.getAttribute('href') || '').trim().length > 0;
    if (!isLinkWithHref) {
      const text = extractEditableText(htmlEl);
      if (!hasUsefulText(text)) return false;
    }
  }
  return true;
};

/**
 * Cómo se muestra y se edita el elemento en el panel.
 *
 * "rutaTexto" es la posición del texto que se está editando (ver elementEdit):
 * mientras se escribe, el campo muestra ese texto aunque quede vacío.
 */
export const describirElemento = (htmlEl: HTMLElement, rutaTexto?: number[] | null): EditableElement => {
  const geminiId = htmlEl.getAttribute('data-gemini-id')!;

  let isHidden = false;
  let current: HTMLElement | null = htmlEl;
  while (current && current.tagName !== 'BODY') {
    if (current.getAttribute('data-gemini-hidden') === 'true') {
      isHidden = true;
      break;
    }
    current = current.parentElement;
  }

  // Create a more descriptive label based on the geminiId if it exists and isn't just a random string
  let label = 'Elemento';
  let moduleName = '';
  const isBackground = htmlEl.getAttribute('memory_type') === 'background';

  // Soporta el formato jerárquico nuevo: <moduleId>__<memoryKey>__<tagName>-<idx>
  // (ej: "portada-nombre__couple-names__h1-1") inyectado por injectEditableIds
  // en el flujo modular. Y el formato legacy: "module-name-element" (split por '-').
  if (geminiId && !geminiId.startsWith('edit-') && geminiId.length < 60) {
    if (geminiId.includes('__')) {
      // Formato modular jerárquico: moduleId__memoryKey__tag-idx
      const parts = geminiId.split('__');
      moduleName = parts[0].replace(/\b\w/g, l => l.toUpperCase());
      const memoryKey = parts[1] || '';
      // Tag descriptivo por tagName del elemento
      const tagLabels = {
        H1: 'Título', H2: 'Título', H3: 'Subtítulo', H4: 'Subtítulo',
        H5: 'Subtítulo', H6: 'Subtítulo',
        P: 'Párrafo', SPAN: 'Texto', A: 'Enlace',
        IMG: 'Imagen', FIGCAPTION: 'Descripción', LI: 'Ítem', TIME: 'Fecha'
      };
      const tagLabel = tagLabels[htmlEl.tagName as keyof typeof tagLabels] || 'Texto';
      // memoryKey en human-readable: "couple-names" -> "Couple Names"
      const humanKey = memoryKey.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      label = humanKey ? `${humanKey} · ${tagLabel}` : tagLabel;
    } else {
      // Formato legacy: split por '-' (module-element-name)
      const parts = geminiId.split('-');
      if (parts.length > 1) {
        moduleName = parts[0].replace(/\b\w/g, l => l.toUpperCase());
        label = parts.slice(1).join(' ').replace(/\b\w/g, l => l.toUpperCase());
      } else {
        label = geminiId
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  } else {
    if (htmlEl.tagName === 'IMG') label = 'Imagen';
    else if (htmlEl.tagName === 'IFRAME') label = 'Mapa / Video';
    else if (htmlEl.tagName === 'A') label = 'Enlace';
    else if (htmlEl.tagName.match(/^H[1-6]$/)) label = `Título (${htmlEl.tagName})`;
    else label = 'Texto';
  }

  if (isBackground) {
    const assetType = htmlEl.getAttribute('data-asset-type');
    const memoryKey = htmlEl.getAttribute('memory_key');
    const source = assetType || memoryKey;
    if (source) {
      label = source.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } else if (label === 'Texto' || label === 'Elemento') {
      label = 'Fondo';
    }
    if (!moduleName) {
      const classMatch = htmlEl.className.match(/module-([a-z]+)/);
      if (classMatch) {
        moduleName = classMatch[1].replace(/\b\w/g, l => l.toUpperCase());
      } else if (source) {
        moduleName = source.split('-')[0].replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  }

  let animationClass = 'none';
  const animClasses = ['animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce', 'animate-fade-in', 'animate-slide-up'];
  for (const cls of animClasses) {
    if (htmlEl.classList.contains(cls)) {
      animationClass = cls;
      break;
    }
  }

  const bgImage = extractBgImageUrl(htmlEl.style.backgroundImage);

  // Si el elemento tiene background-image y no se le asignó un label
  // descriptivo vía geminiId, etiquetarlo como "Imagen de fondo".
  if (bgImage && label === 'Elemento') {
    label = 'Imagen de fondo';
  }

  return {
    geminiId,
    tagName: htmlEl.tagName,
    // Para texto atómico (no IMG/IFRAME), cargar textContent plano en content
    // (lo que el usuario ve y edita en el <textarea>).
    content: (htmlEl.tagName !== 'IMG' && htmlEl.tagName !== 'IFRAME')
      ? (rutaTexto ? textoEditable(htmlEl, rutaTexto) : extractEditableText(htmlEl))
      : '',
    textContent: htmlEl.textContent || '',
    src: htmlEl.getAttribute('src') || '',
    href: htmlEl.getAttribute('href') || '',
    bgImage,
    styles: {
      textAlign: htmlEl.style.textAlign || '',
      fontWeight: htmlEl.style.fontWeight || '',
      fontSize: htmlEl.style.fontSize || '',
      padding: htmlEl.style.padding || '',
      lineHeight: htmlEl.style.lineHeight || '',
      letterSpacing: htmlEl.style.letterSpacing || '',
      width: htmlEl.style.width || '',
      height: htmlEl.style.height || '',
      color: htmlEl.style.color || '',
      backgroundColor: htmlEl.style.backgroundColor || '',
      zoom: (htmlEl.style as CSSStyleDeclaration & { zoom?: string }).zoom || ''
    },
    // Cambios hechos con los controles en palabras (para que "Normal"
    // siempre vuelva al diseño y las opciones sigan siendo relativas a él).
    editorStyles: parsearRegistro(htmlEl.getAttribute(ATTR_REGISTRO)),
    animationClass,
    label,
    moduleName,
    isHidden,
    isBackground
  };
};

/** Todos los elementos editables de una invitación (la interpreta completa: solo al cambiar por completo). */
const parseEditableElements = (code: string): EditableElement[] => {
  if (!code) return [];
  const doc = new DOMParser().parseFromString(code, 'text/html');
  return Array.from(doc.querySelectorAll('[data-gemini-id]'))
    .map((el) => el as HTMLElement)
    .filter(esElementoEditable)
    .map((el) => describirElemento(el));
};

const ElementEditor = ({ element, onUpdate, isSelected, onToggleVisibility, measureElement }: { element: EditableElement, onUpdate: any, isSelected: boolean, onToggleVisibility?: () => void, measureElement?: (geminiId: string) => MetricasElemento | null }) => {
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [content, setContent] = useState(element.content);
  const [src, setSrc] = useState(element.src);
  const [href, setHref] = useState(element.href);
  const [bgImage, setBgImage] = useState(element.bgImage);
  const [styles, setStyles] = useState(element.styles);
  const [reg, setReg] = useState<RegistroEditor>(element.editorStyles || REGISTRO_VACIO);
  const [animationClass, setAnimationClass] = useState(element.animationClass);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Estado para edición de Google Maps: dirección textual que el usuario
  // ingresa. El embed se regenera con https://www.google.com/maps?q=<addr>
  // Solo se activa cuando el iframe es de Google Maps (o está vacío y el
  // geminiId sugiere ubicación/región, en cuyo caso lo tractamos como Maps).
  const [mapAddress, setMapAddress] = useState<string>('');

  // isGoogleMapsIframe: detecta si el src del iframe apunta a Google Maps
  // (incluye embeds legacy, output=embed, maps/embed/v1/place). Si el src
  // está vacío pero el geminiId sugiere ubicación/mapa, también true para
  // que el usuario pueda inicializar el embed con una dirección.
  const isGoogleMapsIframe = (iframeSrc: string, geminiId: string): boolean => {
    const s = (iframeSrc || '').toLowerCase();
    if (s.includes('google.com/maps') || s.includes('maps.google.com')) return true;
    if (s.includes('googleapis.com/maps') || s.includes('google.com/maps/embed')) return true;
    const gid = (geminiId || '').toLowerCase();
    if (!s && (gid.includes('ubicacion') || gid.includes('mapa') || gid.includes('location'))) return true;
    return false;
  };

  // buildMapsEmbedUrl: genera el src de embed sin API key usando el endpoint
  // público https://www.google.com/maps?q=<encoded>&output=embed. Soporta
  // direcciones (textuales), coordenadas "lat,lng" y plus codes.
  const buildMapsEmbedUrl = (address: string): string => {
    const q = (address || '').trim();
    if (!q) return '';
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  };

  // extractMapsAddress: intenta extraer una dirección legible del src actual
  // del iframe (para pre-poblar el input cuando ya hay un embed de Maps).
  const extractMapsAddress = (iframeSrc: string): string => {
    const s = iframeSrc || '';
    const m = s.match(/[?&]q=([^&]+)/);
    if (m) {
      try { return decodeURIComponent(m[1]).replace(/\+/g, ' '); } catch { return m[1]; }
    }
    const m2 = s.match(/[?&]center=([^&]+)/);
    if (m2) {
      try { return decodeURIComponent(m2[1]).replace(/\+/g, ' '); } catch { return m2[1]; }
    }
    return '';
  };

  // Medidas del elemento tal como está en el DISEÑO, tomadas de la vista
  // previa al desplegar el panel. Los controles en palabras calculan sus
  // opciones a partir de aquí: "Grande" siempre es respecto a lo que el
  // texto ya era, no a lo último que el usuario eligió.
  const metricasRef = useRef<MetricasElemento | null>(null);

  // Ref para trackear el último snapshot que el componente envió al parent.
  // Solo sincronizamos el estado local cuando el `element` entrante difiere
  // del último enviado — es decir, el cambio viene de una fuente externa
  // (selección de otro elemento, load inicial, etc.). Evita que el parent
  // re-renderice tras cada triggerUpdate y sobrescriba lo que el usuario
  // está escribiendo en el textarea/input activo.
  const lastSentRef = useRef<{ geminiId: string; content: string; src: string; href: string; bgImage: string; stylesKey: string; animationClass: string } | null>(null);

  // Helper para firmar styles de forma estable.
  const stylesKey = (s: Record<string, string>) => Object.keys(s).sort().map(k => `${k}:${s[k] || ''}`).join('|');

  useEffect(() => {
    if (isSelected) {
      setIsExpanded(true);
      setTimeout(() => {
        editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isSelected]);

  useEffect(() => {
    // Si el elemento entrante coincide con el último snapshot enviado, no
    // sobrescribimos el estado local: el cambio ya vino del usuario.
    const incomingSig = {
      geminiId: element.geminiId,
      content: element.content,
      src: element.src,
      href: element.href,
      bgImage: element.bgImage,
      stylesKey: stylesKey(element.styles),
      animationClass: element.animationClass
    };
    const last = lastSentRef.current;
    const isSameAsSent = last
      && last.geminiId === incomingSig.geminiId
      && last.content === incomingSig.content
      && last.src === incomingSig.src
      && last.href === incomingSig.href
      && last.bgImage === incomingSig.bgImage
      && last.stylesKey === incomingSig.stylesKey
      && last.animationClass === incomingSig.animationClass;

    if (isSameAsSent) return; // cambio originado por el usuario, no sobrescribir

    // Cambio externo: actualizar estado local.
    setContent(element.content);
    setSrc(element.src);
    setHref(element.href);
    setBgImage(element.bgImage);
    setStyles(element.styles);
    setReg(element.editorStyles || REGISTRO_VACIO);
    setAnimationClass(element.animationClass);
    // Es otro elemento (o se recargó la invitación): se vuelve a medir al desplegar.
    metricasRef.current = null;
    // Actualizar el snapshot para futuras comparaciones.
    lastSentRef.current = incomingSig;
  }, [element]);

  // Al desplegar el panel se mide el elemento en la vista previa. Sirve como
  // punto de partida del diseño para las opciones que todavía no se han tocado.
  useEffect(() => {
    if (!isExpanded) return;
    metricasRef.current = measureElement?.(element.geminiId) ?? null;
  }, [isExpanded, element.geminiId, measureElement]);

  // Pre-poblar mapAddress cuando el elemento es un iframe de Google Maps.
  // Si el src ya tiene un?q=<addr>, lo decodifica; si no, deja vacío para
  // que el usuario ingrese una nueva dirección.
  useEffect(() => {
    if (element.tagName === 'IFRAME' && isGoogleMapsIframe(element.src, element.geminiId)) {
      setMapAddress(extractMapsAddress(element.src));
    } else {
      setMapAddress('');
    }
  }, [element.geminiId, element.src, element.tagName]);

  // Últimos valores de los campos. El texto se aplica con cada letra; los
  // enlaces y las imágenes, cuando la persona deja de escribir o sale del campo
  // (aplicarlos letra por letra cargaría direcciones a medias).
  const valoresRef = useRef({ content, src, href, bgImage, styles, animationClass, reg });
  valoresRef.current = { content, src, href, bgImage, styles, animationClass, reg };
  const pausaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (pausaRef.current) clearTimeout(pausaRef.current); }, []);

  const enviar = (v: typeof valoresRef.current) => {
    // Registrar el snapshot enviado para que el useEffect de [element] no
    // sobrescriba el estado local cuando el parent re-renderice con este
    // mismo contenido tras aplicar la edición.
    lastSentRef.current = {
      geminiId: element.geminiId,
      content: v.content,
      src: v.src,
      href: v.href,
      bgImage: v.bgImage,
      stylesKey: stylesKey(v.styles),
      animationClass: v.animationClass
    };
    onUpdate(element.geminiId, v.content, {
      src: v.src, href: v.href, animationClass: v.animationClass, bgImage: v.bgImage,
      [ATTR_REGISTRO]: serializarRegistro(v.reg), // vacío = se quita el atributo
    }, v.styles);
  };

  const triggerUpdate = (newContent = content, newSrc = src, newHref = href, newStyles = styles, newAnimationClass = animationClass, newBgImage = bgImage, newReg = reg) => {
    enviar({ content: newContent, src: newSrc, href: newHref, bgImage: newBgImage, styles: newStyles, animationClass: newAnimationClass, reg: newReg });
  };

  // Enlaces e imágenes: aplicar tras una pausa de escritura, o al salir del campo.
  const aplicarAlPausar = () => {
    if (pausaRef.current) clearTimeout(pausaRef.current);
    pausaRef.current = setTimeout(() => { pausaRef.current = null; enviar(valoresRef.current); }, 400);
  };
  const aplicarAhora = () => {
    if (pausaRef.current) { clearTimeout(pausaRef.current); pausaRef.current = null; }
    enviar(valoresRef.current);
  };

  // Alineación: un toque la cambia (no guarda "cómo estaba": siempre se
  // vuelve a alinear eligiendo otra).
  const handleStyleChange = (key: string, value: string) => {
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);
    triggerUpdate(content, src, href, newStyles, animationClass);
  };

  // ---- Controles en palabras (sin medidas) --------------------------------
  // "Tamaño de la letra" se guarda como proporción del propio texto ("zoom"),
  // así se adapta a la pantalla igual que el diseño. Las demás usan su mismo
  // nombre. La interfaz nunca muestra estos valores.
  const estiloDe = (prop: PropiedadEstilo) => (prop === 'fontSize' ? 'zoom' : prop);

  const aplicar = (prop: PropiedadEstilo, resultado: { css: string; reg: RegistroEditor }) => {
    const newStyles = { ...styles, [estiloDe(prop)]: resultado.css };
    setReg(resultado.reg);
    setStyles(newStyles);
    triggerUpdate(content, src, href, newStyles, animationClass, bgImage, resultado.reg);
  };

  const contextoDe = (prop: PropiedadEstilo) => ({ inline: styles[estiloDe(prop)] ?? '', reg });

  const elegir = (prop: PropiedadEstilo, nivel: number) => {
    // Si al desplegar la vista aún no estaba lista, se mide en este momento
    // (la propiedad todavía no se ha tocado, así que lo medido es el diseño).
    if (!metricasRef.current) metricasRef.current = measureElement?.(element.geminiId) ?? null;
    aplicar(prop, elegirNivel(prop, nivel, { ...contextoDe(prop), metricas: metricasRef.current }));
  };
  const poner = (prop: PropiedadEstilo, css: string) => aplicar(prop, fijarEstilo(prop, css, contextoDe(prop)));
  const restaurar = (prop: PropiedadEstilo) => aplicar(prop, restaurarDiseno(prop, contextoDe(prop)));

  // Estado de un selector de palabras para la interfaz.
  const selector = (prop: PropiedadEstilo) => {
    const ctx = contextoDe(prop);
    const etiquetas = etiquetasDe(prop);
    const desactivadas: number[] = [];
    etiquetas.forEach((_, i) => { if (!nivelDisponible(prop, i, ctx.reg)) desactivadas.push(i); });
    return {
      opciones: etiquetas,
      activo: nivelActual(prop, ctx),
      desactivadas,
      alElegir: (i: number) => elegir(prop, i),
    };
  };

  const handleAnimationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAnimationClass = e.target.value;
    setAnimationClass(newAnimationClass);
    triggerUpdate(content, src, href, styles, newAnimationClass);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setSrc(compressedBase64);
      triggerUpdate(content, compressedBase64, href, styles);
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      alert(`Error al procesar la imagen. Formatos soportados: ${SUPPORTED_FORMATS_LABEL}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleBgFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setBgImage(compressedBase64);
      triggerUpdate(content, src, href, styles, animationClass, compressedBase64);
    } catch (error) {
      console.error('Error al procesar imagen de fondo:', error);
      alert(`Error al procesar la imagen. Formatos soportados: ${SUPPORTED_FORMATS_LABEL}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const renderIcon = () => {
    if (element.tagName === 'IMG') return <ImageIcon className="w-4 h-4 text-pink-500" />;
    if (element.tagName === 'IFRAME') return <Map className="w-4 h-4 text-pink-500" />;
    if (element.tagName === 'A') return <LinkIcon className="w-4 h-4 text-pink-500" />;
    if (element.bgImage || element.isBackground) return <ImageIcon className="w-4 h-4 text-pink-500" />;
    return <Type className="w-4 h-4 text-pink-500" />;
  };

  const isText = !['IMG', 'IFRAME'].includes(element.tagName) && !element.isBackground;
  const isImage = element.tagName === 'IMG';
  const isIframe = element.tagName === 'IFRAME';
  const isLink = element.tagName === 'A';
  const isBgImage = !!element.bgImage || element.isBackground;

  return (
    <div ref={editorRef} className={`border rounded-xl mb-2 overflow-hidden transition-all ${isSelected ? 'border-pink-400 shadow-md shadow-pink-100' : 'border-pink-100 hover:border-pink-200'} ${element.isHidden ? 'opacity-50' : ''}`}>
      <div className="w-full flex items-center justify-between p-3 bg-white hover:bg-pink-50/50 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex-1 flex items-center gap-3 overflow-hidden text-left ${isExpanded ? 'bg-pink-50/30' : ''}`}
        >
          <div className="p-1.5 bg-pink-100 rounded-lg shrink-0">
            {renderIcon()}
          </div>
          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-sm font-semibold text-gray-700">{element.label}</span>
            <span className="text-xs text-gray-400 truncate w-48 text-left">
              {isText && element.textContent ? element.textContent.substring(0, 30) : isBgImage ? (element.bgImage.substring(0, 30) || (element.isBackground ? 'Imagen de fondo' : 'Sin URL')) : element.src.substring(0, 30) || 'Sin URL'}
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleVisibility && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
              className={`p-1.5 rounded-md transition-colors ${element.isHidden ? 'text-gray-400 hover:text-gray-600 bg-gray-100' : 'text-gray-400 hover:text-pink-500 hover:bg-pink-100'}`}
              title={element.isHidden ? "Mostrar elemento" : "Ocultar elemento"}
            >
              {element.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-white border-t border-pink-50 space-y-4">
          
          {/* Content / URL Inputs */}
          {isText && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Texto</label>
              <textarea
                value={content}
                // Cada letra se ve en la invitación al momento, sin salir del campo.
                onChange={(e) => { setContent(e.target.value); triggerUpdate(e.target.value); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 min-h-[80px] resize-y"
              />
            </div>
          )}

          {isLink && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Enlace (a dónde lleva al tocarlo)</label>
              <input
                type="text"
                value={href}
                onChange={(e) => { setHref(e.target.value); aplicarAlPausar(); }}
                onBlur={aplicarAhora}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
              />
            </div>
          )}

          {isImage && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Enlace de la imagen (opcional)</label>
                <input
                  type="text"
                  value={src}
                  onChange={(e) => { setSrc(e.target.value); aplicarAlPausar(); }}
                  onBlur={aplicarAhora}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept={SUPPORTED_IMAGE_TYPES} onChange={handleFileUpload} disabled={isCompressing} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="w-full py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Comprimiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir Imagen
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center">{SUPPORTED_FORMATS_LABEL}</p>
              {src && <img src={src} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200" />}
            </div>
          )}

          {isIframe && (
            <div className="space-y-3">
              {isGoogleMapsIframe(src, element.geminiId) && (
                <div className="space-y-1.5 p-3 bg-pink-50/50 border border-pink-200 rounded-lg">
                  <label className="text-xs font-medium text-pink-700 flex items-center gap-1.5">
                    <Map className="w-3.5 h-3.5" />
                    Dirección del mapa
                  </label>
                  <input
                    type="text"
                    value={mapAddress}
                    onChange={(e) => setMapAddress(e.target.value)}
                    placeholder="Ej: Av. Reforma 123, CDMX"
                    className="w-full bg-white border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!mapAddress.trim()) return;
                      const newSrc = buildMapsEmbedUrl(mapAddress);
                      setSrc(newSrc);
                      triggerUpdate(content, newSrc, href, styles, animationClass, bgImage);
                    }}
                    className="w-full py-2 bg-pink-500 text-white hover:bg-pink-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Map className="w-4 h-4" />
                    Actualizar mapa
                  </button>
                  <p className="text-[10px] text-gray-400">
                    Escribe la dirección y presiona "Actualizar mapa" para regenerar la ubicación.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Enlace del mapa o video</label>
                <input
                  type="text"
                  value={src}
                  onChange={(e) => { setSrc(e.target.value); aplicarAlPausar(); }}
                  onBlur={aplicarAhora}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                />
              </div>
            </div>
          )}

          {isBgImage && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Enlace de la imagen de fondo (opcional)</label>
                <input
                  type="text"
                value={bgImage}
                onChange={(e) => { setBgImage(e.target.value); aplicarAlPausar(); }}
                onBlur={aplicarAhora}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                />
              </div>
              <input type="file" ref={bgFileInputRef} className="hidden" accept={SUPPORTED_IMAGE_TYPES} onChange={handleBgFileUpload} disabled={isCompressing} />
              <button
                onClick={() => bgFileInputRef.current?.click()}
                disabled={isCompressing}
                className="w-full py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Comprimiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir Imagen de Fondo
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center">{SUPPORTED_FORMATS_LABEL}</p>
              {bgImage && <img src={bgImage} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200" />}
            </div>
          )}

          {/* Apariencia: solo palabras, sin medidas ni códigos */}
          <div className="pt-3 border-t border-gray-100 space-y-4">
            <h4 className="text-xs font-semibold text-gray-500">Apariencia</h4>

            {isText && (
              <>
                {/* Alineación */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-gray-600">Posición del texto</span>
                  <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                    {[
                      { icon: AlignLeft, value: 'left', titulo: 'A la izquierda' },
                      { icon: AlignCenter, value: 'center', titulo: 'Centrado' },
                      { icon: AlignRight, value: 'right', titulo: 'A la derecha' },
                      { icon: AlignJustify, value: 'justify', titulo: 'Justificado' },
                    ].map(({ icon: Icon, value, titulo }) => (
                      <button
                        key={value}
                        type="button"
                        title={titulo}
                        aria-label={titulo}
                        aria-pressed={styles.textAlign === value}
                        onClick={() => handleStyleChange('textAlign', value)}
                        className={`p-1.5 rounded-md transition-colors ${styles.textAlign === value ? 'bg-white shadow-sm text-pink-500' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <SelectorPalabras etiqueta="Tamaño de la letra" {...selector('fontSize')} />
                <SelectorPalabras
                  etiqueta="Espacio entre renglones"
                  ayuda="Qué tan separadas quedan las líneas del texto."
                  {...selector('lineHeight')}
                />
                <SelectorPalabras
                  etiqueta="Espacio entre letras"
                  ayuda="Qué tan juntas o separadas se ven las letras."
                  {...selector('letterSpacing')}
                />

                {/* Grosor */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-medium text-gray-600">Grosor de la letra</span>
                  <select
                    value={esDelDiseno('fontWeight', reg) ? '' : (styles.fontWeight || '')}
                    onChange={(e) => (e.target.value === '' ? restaurar('fontWeight') : poner('fontWeight', e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
                  >
                    <option value="">Como en el diseño</option>
                    <option value="normal">Normal</option>
                    <option value="500">Un poco gruesa</option>
                    <option value="600">Gruesa</option>
                    <option value="bold">Muy gruesa</option>
                  </select>
                </div>
              </>
            )}

            {(isImage || isIframe) && (
              <SelectorPalabras etiqueta="Tamaño" {...selector('width')} />
            )}
            {isIframe && (
              <SelectorPalabras etiqueta="Alto del mapa o video" {...selector('height')} />
            )}

            <SelectorPalabras
              etiqueta="Espacio alrededor"
              ayuda="Qué tan lejos queda el contenido de sus bordes."
              {...selector('padding')}
            />

            {isText && (
              <ControlColor
                etiqueta="Color del texto"
                valor={styles.color || ''}
                cambiado={!esDelDiseno('color', reg)}
                alCambiar={(v) => poner('color', v)}
                alRestaurar={() => restaurar('color')}
              />
            )}
            <ControlColor
              etiqueta="Color de fondo"
              valor={styles.backgroundColor || ''}
              cambiado={!esDelDiseno('backgroundColor', reg)}
              alCambiar={(v) => poner('backgroundColor', v)}
              alRestaurar={() => restaurar('backgroundColor')}
              extra={
                /^(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/i.test(styles.backgroundColor || '') ? undefined : (
                  <button
                    type="button"
                    onClick={() => poner('backgroundColor', 'transparent')}
                    className="text-[11px] text-pink-600 hover:text-pink-700 hover:underline transition-colors"
                  >
                    Quitar el color de fondo
                  </button>
                )
              }
            />

            {/* Animación */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-medium text-gray-600">Animación</span>
              <select
                value={animationClass}
                onChange={handleAnimationChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
              >
                <option value="none">Sin animación</option>
                <option value="animate-fade-in">Aparece suavemente</option>
                <option value="animate-slide-up">Sube al aparecer</option>
                <option value="animate-bounce">Rebota</option>
                <option value="animate-pulse">Late suavemente</option>
                <option value="animate-spin">Gira sin parar</option>
                <option value="animate-ping">Destella</option>
              </select>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({
  groupName,
  isHidden,
  onToggleVisibility
}: {
  groupName: string,
  isHidden: boolean,
  onToggleVisibility: () => void
}) => {
  return (
    <div className="flex items-center justify-between px-1 py-2 mt-4 first:mt-0">
      <span className="text-xs font-bold text-pink-600 uppercase tracking-widest">{groupName}</span>
      <button
        onClick={onToggleVisibility}
        className={`p-1 rounded-md transition-colors ${isHidden ? 'text-gray-400 hover:text-gray-600 bg-gray-100' : 'text-pink-500 hover:text-pink-600 bg-pink-100/50'}`}
        title={isHidden ? "Mostrar sección" : "Ocultar sección"}
      >
        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

interface EditorSidebarProps {
  code: string;
  /**
   * Elementos que acaba de cambiar el panel. Con esto la lista actualiza solo
   * esos; si no coincide con "code", la invitación cambió por completo y la
   * lista se reconstruye (interpretar una invitación de varios MB tarda).
   */
  listaEditada?: { codigo: string; elementos: EditableElement[] } | null;
  onResetColorVars?: () => void;
  selectedElementId: string | null;
  onUpdateElement: (geminiId: string, newContent?: string, newAttributes?: Record<string, string>, newStyles?: Record<string, string>) => void;
  onUpdateCountdown?: (targetDate: string) => void;
  onClearSelection: () => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onIterateModule: (mode: 'add' | 'modify', description: string, targetModuleName?: string) => void;
  onToggleModuleVisibility: (moduleName: string) => void;
  onToggleElementVisibility: (geminiId: string) => void;
  onSaveInvitation?: () => void;
  hasCode?: boolean;
  hasUnsavedChanges?: boolean;
  onNavigateHome?: () => void;
  iterationAvailable: number;
  isModuleSelectionMode: boolean;
  onToggleModuleSelectionMode: () => void;
  selectedModuleName: string | null;
  onClearModuleSelection: () => void;
  fontBase?: string;
  fontHeading?: string;
  onFontChange?: (which: 'base' | 'heading', value: string) => void;
  colorVars?: Record<string, string>;
  onUpdateColorVars?: (key: string, value: string) => void;
  onOpenEventData?: () => void;
  pencilBtnRef?: React.RefObject<HTMLElement>;
  /** Mide un elemento tal como se ve en la vista previa (para las opciones relativas al diseño). */
  measureElement?: (geminiId: string) => MetricasElemento | null;
}

// ============================================================
// TYPOGRAPHY CARD — Selector de Google Fonts (textos y títulos)
// Aparece SIEMPRE al inicio de la barra lateral del editor.
// Las fuentes se aplican a toda la invitación vía Post-RAG Theming.
// ============================================================
const ensureGoogleFontsLoaded = (families: string[]) => {
  const valid = families.map(f => (f || '').trim()).filter(Boolean);
  if (valid.length === 0) return;
  const href = `https://fonts.googleapis.com/css2?family=${valid.map(f => encodeURIComponent(f).replace(/%20/g, '+')).join('&family=')}&display=swap`;
  const LINK_ID = 'editor-sidebar-google-fonts';
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  // Solo actualizar el <link> si cambió la selección (evita re-fetch)
  const signature = valid.join('|');
  if (link.getAttribute('data-families') !== signature) {
    link.href = href;
    link.setAttribute('data-families', signature);
  }
};

const TypographyCard: React.FC<{
  fontBase?: string;
  fontHeading?: string;
  onFontChange?: (which: 'base' | 'heading', value: string) => void;
}> = ({ fontBase = '', fontHeading = '', onFontChange }) => {
  useEffect(() => {
    ensureGoogleFontsLoaded([fontBase, fontHeading].filter(Boolean) as string[]);
  }, [fontBase, fontHeading]);

  return (
    <div className="mb-4 border border-pink-200 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-pink-50/70">
        <Type className="w-4 h-4 text-pink-500" />
        <span className="text-xs font-bold text-pink-600 uppercase tracking-widest">Tipografía</span>
      </div>
      <div className="p-3 space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase font-medium">Fuente de textos</label>
          <select
            value={fontBase}
            onChange={(e) => onFontChange?.('base', e.target.value)}
            disabled={!onFontChange}
            style={{ fontFamily: `'${fontBase}', sans-serif` }}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 cursor-pointer disabled:opacity-50"
          >
            {GOOGLE_FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: `'${f.value}', sans-serif` }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase font-medium">Fuente de títulos</label>
          <select
            value={fontHeading}
            onChange={(e) => onFontChange?.('heading', e.target.value)}
            disabled={!onFontChange}
            style={{ fontFamily: `'${fontHeading || fontBase}', serif` }}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 cursor-pointer disabled:opacity-50"
          >
            {GOOGLE_HEADING_FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: `'${f.value || fontBase}', serif` }}>
                {f.value ? f.label : 'Igual que la fuente de textos'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
          <span
            className="text-xl leading-none text-gray-800 truncate"
            style={{ fontFamily: `'${fontHeading || fontBase}', serif` }}
            title="Vista previa de títulos"
          >
            Aa
          </span>
          <span
            className="text-sm leading-none text-gray-600 truncate"
            style={{ fontFamily: `'${fontBase}', sans-serif` }}
            title="Vista previa de textos"
          >
            Texto de ejemplo 123
          </span>
        </div>
      </div>
    </div>
  );
};

const CountdownEditor = ({ code, onUpdateCountdown }: { code: string, onUpdateCountdown?: (targetDate: string) => void }) => {
  const [countdownDate, setCountdownDate] = useState('');
  const [countdownTime, setCountdownTime] = useState('');
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (!code) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'text/html');
    const countdownEl = doc.querySelector('[data-gemini-id^="countdown"]');
    if (countdownEl) {
      setDetected(true);
      const targetAttr = countdownEl.getAttribute('data-countdown-target');
      if (targetAttr) {
        try {
          const d = new Date(targetAttr);
          if (!isNaN(d.getTime())) {
            setCountdownDate(d.toISOString().split('T')[0]);
            setCountdownTime(d.toTimeString().substring(0, 5));
          }
        } catch {}
      }
      let scriptMatch = code.match(/countdown[_-]?target\s*[:=]\s*['"]?(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?)/i);
      if (!scriptMatch) {
        const newDateMatch = code.match(/new\s+Date\s*\(\s*['"](\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?)/i);
        if (newDateMatch) scriptMatch = newDateMatch;
      }
      if (!scriptMatch) {
        const monthMatch = code.match(/new\s+Date\s*\(\s*['"]([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+\d{2}:\d{2}(?::\d{2})?)/i);
        if (monthMatch) scriptMatch = monthMatch;
      }
      if (scriptMatch && !countdownDate) {
        try {
          const d = new Date(scriptMatch[1]);
          if (!isNaN(d.getTime())) {
            setCountdownDate(d.toISOString().split('T')[0]);
            setCountdownTime(scriptMatch[1].includes('T') ? scriptMatch[1].split('T')[1].substring(0, 5) : d.toTimeString().substring(0, 5));
          }
        } catch {}
      }
    } else {
      setDetected(false);
    }
  }, [code]);

  const handleApply = () => {
    if (!countdownDate || !onUpdateCountdown) return;
    const dateTime = countdownTime ? `${countdownDate}T${countdownTime}:00` : `${countdownDate}T00:00:00`;
    onUpdateCountdown(dateTime);
  };

  if (!detected) return null;

  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50/50 cursor-pointer">
        <Clock className="w-4 h-4 text-purple-500" />
        <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Countdown</span>
      </div>
      <div className="p-4 bg-white border-t border-purple-50 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">Fecha del evento</label>
          <input
            type="date"
            value={countdownDate}
            onChange={(e) => setCountdownDate(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">Hora del evento</label>
          <input
            type="time"
            value={countdownTime}
            onChange={(e) => setCountdownTime(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={!countdownDate}
          className="w-full py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Actualizar Countdown
        </button>
      </div>
    </div>
  );
};

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  code,
  listaEditada = null,
  onResetColorVars,
  selectedElementId,
  onUpdateElement,
  onUpdateCountdown,
  onClearSelection,
  isSelectionMode,
  onToggleSelectionMode,
  pencilBtnRef,
  measureElement,
  onIterateModule,
  onToggleModuleVisibility,
  onToggleElementVisibility,
  onSaveInvitation,
  hasCode = false,
  hasUnsavedChanges = false,
  onNavigateHome,
  iterationAvailable,
  isModuleSelectionMode,
  onToggleModuleSelectionMode,
  selectedModuleName,
  onClearModuleSelection,
  fontBase,
  fontHeading,
  onFontChange,
  colorVars = {},
  onUpdateColorVars,
  onOpenEventData
}) => {
  const navigate = useNavigate();

  // La lista de elementos. Se reconstruye solo cuando la invitación cambia por
  // completo (interpretarla tarda con archivos de varios MB); cuando el panel
  // edita un elemento, solo se vuelve a leer ese.
  const [lista, setLista] = useState(() => ({ codigo: code, completo: code, elementos: parseEditableElements(code) }));
  if (lista.codigo !== code) {
    const esEdicion = !!listaEditada && listaEditada.codigo === code;
    if (esEdicion && listaEditada) {
      // (Ojo: en este archivo "Map" es un ícono; por eso se usa un objeto.)
      const cambiados: Record<string, EditableElement> = {};
      for (const cambiado of listaEditada.elementos) cambiados[cambiado.geminiId] = cambiado;
      // Los que ya estaban se actualizan (así el que se está editando no
      // desaparece aunque su texto quede vacío un momento). Solo entra uno
      // nuevo si es el que la persona acaba de elegir en la vista previa.
      const elementos = lista.elementos.map((el) => cambiados[el.geminiId] || el);
      for (const id in cambiados) {
        if (id === selectedElementId && !lista.elementos.some((el) => el.geminiId === id)) elementos.push(cambiados[id]);
      }
      setLista({ codigo: code, completo: lista.completo, elementos });
    } else {
      setLista({ codigo: code, completo: code, elementos: parseEditableElements(code) });
    }
  }
  const elements = lista.elementos;
  
  const moduleNames = useMemo(() => {
    const names = new Set<string>();
    elements.forEach(el => {
      if (el.moduleName) names.add(el.moduleName);
    });
    return Array.from(names);
  }, [elements]);

  const [activeTab, setActiveTab] = useState<'add' | 'modify'>('add');
  const [insertAfter, setInsertAfter] = useState<string>('Al final');
  const [moduleDescription, setModuleDescription] = useState('');
  const [designDescription, setDesignDescription] = useState('');

  const handleAddSubmit = () => {
    if (!moduleDescription.trim()) return;
    if (iterationAvailable < 1) return;
    onIterateModule('add', moduleDescription, insertAfter);
    setModuleDescription('');
  };

  const handleModifySubmit = () => {
    if (!designDescription.trim()) return;
    if (iterationAvailable < 1) return;
    if (!selectedModuleName) return;
    onIterateModule('modify', designDescription, selectedModuleName);
    setDesignDescription('');
  };

  return (
    <div className="w-80 md:w-96 flex flex-col h-full bg-white border-r border-pink-200 shadow-xl shadow-pink-100/50 z-20 shrink-0">
      
      {/* Header */}
      <div className="h-14 border-b border-pink-100 flex items-center justify-between px-4 bg-pink-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
            if (hasUnsavedChanges && onNavigateHome) {
              onNavigateHome();
            } else {
              navigate('/');
            }
          }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-pink-500 hover:bg-pink-100 transition-colors"
            title="Ir al Dashboard"
          >
            <Home className="w-4 h-4" />
          </button>
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500/20" />
          <span className="font-semibold text-gray-800 tracking-tight">Módulos</span>
        </div>
        <div className="flex items-center gap-1">
          {hasCode && onSaveInvitation && (
            <button
              onClick={() => onSaveInvitation()}
              className="p-2 rounded-lg transition-colors bg-green-500 text-white hover:bg-green-600"
              title="Guardar Invitación"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
          <button
            ref={pencilBtnRef as React.RefObject<HTMLButtonElement>}
            onClick={onToggleSelectionMode}
            className={`relative flex items-center gap-1.5 rounded-xl transition-all font-medium text-xs ${
              isSelectionMode
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 px-3 py-2 ring-2 ring-pink-300'
                : 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-600 hover:from-pink-100 hover:to-rose-100 px-3 py-2 border border-pink-200'
            }`}
            title={isSelectionMode ? 'Modo edición ACTIVO: haz clic en cualquier texto para cambiarlo' : 'Haz clic aquí y después en cualquier texto de la invitación para editarlo'}
            aria-label={isSelectionMode ? 'Desactivar modo edición de textos' : 'Activar modo edición de textos'}
            aria-pressed={isSelectionMode}
          >
            <Pencil className={`w-4 h-4 ${!isSelectionMode ? 'animate-pulse' : ''}`} />
            <span>{isSelectionMode ? 'Editando ✓' : 'Editar textos'}</span>
            {!isSelectionMode && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-400 rounded-full animate-ping" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Selector de tipografía: SIEMPRE visible al inicio de la barra lateral */}
        {onOpenEventData && (
          <div className="px-3 pt-4">
            <button
              onClick={onOpenEventData}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-pink-200 rounded-xl text-sm font-medium text-pink-600 hover:bg-pink-50 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Completar datos del evento
            </button>
          </div>
        )}

        {onUpdateColorVars && (
          <div className="px-3 pt-4">
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-pink-500" />
                <h4 className="text-xs font-semibold text-gray-600">Colores de la invitación</h4>
              </div>
              <p className="text-[10px] text-gray-400 leading-snug">Cambian los colores de toda la invitación.</p>
              {/* Solo se elige el color con el selector visual; nada de códigos. */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {[
                  { key: 'primary', label: 'Principal' },
                  { key: 'accent', label: 'Realce' },
                  { key: 'text', label: 'Texto' },
                  { key: 'bg', label: 'Fondo' },
                  { key: 'secondary', label: 'Segundo' },
                  { key: 'surface', label: 'Tarjetas' },
                ].map(({ key, label }) => (
                  <ColorDeInvitacion
                    key={key}
                    etiqueta={label}
                    valor={colorVars[key]}
                    alCambiar={(hex) => onUpdateColorVars(key, hex)}
                  />
                ))}
              </div>
              {Object.keys(colorVars).length > 0 && onResetColorVars && (
                <button
                  onClick={onResetColorVars}
                  className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Restablecer colores originales
                </button>
              )}
            </div>
          </div>
        )}

        <TypographyCard
          fontBase={fontBase}
          fontHeading={fontHeading}
          onFontChange={onFontChange}
        />

        {elements.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center border border-pink-100">
              <MousePointer2 className="w-8 h-8 text-pink-300" />
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-700 font-medium">Sin elementos editables</h3>
              <p className="text-sm text-gray-500 max-w-[200px]">
                Genera una invitación para ver los módulos editables aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {Object.entries(
              elements.reduce((acc, el) => {
                const group = el.moduleName || 'Otros Elementos';
                if (!acc[group]) acc[group] = [];
                acc[group].push(el);
                return acc;
              }, {} as Record<string, EditableElement[]>)
            ).map(([groupName, groupElements]) => (
              <div key={groupName}>
                <SectionHeader
                  groupName={groupName}
                  isHidden={groupElements.every(el => el.isHidden)}
                  onToggleVisibility={() => onToggleModuleVisibility(groupName)}
                />
                {groupElements.map(el => (
                  <ElementEditor
                    key={el.geminiId}
                    element={el}
                    onUpdate={onUpdateElement}
                    isSelected={selectedElementId === el.geminiId}
                    onToggleVisibility={() => onToggleElementVisibility(el.geminiId)}
                    measureElement={measureElement}
                  />
                ))}
              </div>
            ))}
              
            {/* La cuenta regresiva solo cambia cuando la invitación cambia por completo. */}
            <CountdownEditor code={lista.completo} onUpdateCountdown={onUpdateCountdown} />

            {/* ============================================================ */}
            {/* DESIGN MODIFIER SECTION - AI ITERATIONS (per-module) */}
            {/* ============================================================ */}
            {AI_ITERATIONS_ENABLED && (
            <div className="mt-8 border-t border-pink-200 pt-6">
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-500"><Wand2 className="w-3.5 h-3.5" /></span>
                Agregar / Modificar Módulo
              </h3>
              <div className="mb-4 text-xs text-gray-500">
                Iteraciones disponibles: <span className={`font-bold ${iterationAvailable > 0 ? 'text-pink-600' : 'text-red-500'}`}>{iterationAvailable}</span>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setActiveTab('add')}
                  className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${activeTab === 'add' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Agregar Módulo
                </button>
                <button
                  onClick={() => setActiveTab('modify')}
                  className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${activeTab === 'modify' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Modificar Módulo
                </button>
              </div>

              {activeTab === 'add' && (
                <div className="space-y-3 bg-pink-50/30 p-4 rounded-xl border border-pink-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Insertar después de:</label>
                    <select
                      value={insertAfter}
                      onChange={(e) => setInsertAfter(e.target.value)}
                      disabled={iterationAvailable < 1}
                      className="w-full bg-white border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="Al principio">Al principio</option>
                      {moduleNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="Al final">Al final</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Descripción del módulo:</label>
                    <textarea
                      value={moduleDescription}
                      onChange={(e) => setModuleDescription(e.target.value)}
                      placeholder="Ej. Una sección para mesa de postres con una imagen y texto descriptivo."
                      disabled={iterationAvailable < 1}
                      className="w-full bg-white border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 min-h-[80px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    onClick={handleAddSubmit}
                    disabled={!moduleDescription.trim() || iterationAvailable < 1}
                    className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-pink-500/20"
                  >
                    {iterationAvailable < 1 ? 'Sin iteraciones disponibles' : 'Generar Módulo'}
                  </button>
                </div>
              )}

              {activeTab === 'modify' && (
                <div className="space-y-3 bg-pink-50/30 p-4 rounded-xl border border-pink-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Módulo a modificar:</label>
                    <button
                      onClick={onToggleModuleSelectionMode}
                      disabled={iterationAvailable < 1}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                        isModuleSelectionMode
                          ? 'bg-pink-500 text-white border-pink-500'
                          : selectedModuleName
                          ? 'bg-white text-pink-600 border-pink-300 hover:bg-pink-50'
                          : 'bg-white text-gray-600 border-pink-200 hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isModuleSelectionMode
                        ? 'Haz click en un módulo de la invitación...'
                        : selectedModuleName
                        ? `Seleccionado: ${selectedModuleName}`
                        : 'Seleccionar módulo en la invitación'}
                    </button>
                    {selectedModuleName && !isModuleSelectionMode && (
                      <button
                        onClick={onClearModuleSelection}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Cambiar selección
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Descripción de los cambios:</label>
                    <textarea
                      value={designDescription}
                      onChange={(e) => setDesignDescription(e.target.value)}
                      placeholder="Ej. Cambia la paleta de colores a tonos azules y haz que los bordes sean más redondeados."
                      disabled={iterationAvailable < 1 || !selectedModuleName}
                      className="w-full bg-white border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 min-h-[100px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    onClick={handleModifySubmit}
                    disabled={!designDescription.trim() || iterationAvailable < 1 || !selectedModuleName}
                    className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-pink-500/20"
                  >
                    {iterationAvailable < 1
                      ? 'Sin iteraciones disponibles'
                      : !selectedModuleName
                      ? 'Selecciona un módulo primero'
                      : 'Aplicar Cambios'}
                  </button>
                </div>
              )}
            </div>
            )}
            {/* ============================================================ */}
          </div>
        )}
      </div>
    </div>
  );
};
