import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Monitor, Smartphone, Tablet, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { SelectedElement } from '../types';
import type { MetricasElemento } from './editor/friendlyStyles';
import { aplicarEdicionEnElemento, buscarElemento, type EdicionElemento } from './editor/elementEdit';

interface PreviewPaneProps {
  code: string;
  onElementClick: (element: SelectedElement) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isSelectionMode: boolean;
  selectedElementId: string | null;
  isModuleSelectionMode?: boolean;
  onModuleClick?: (moduleName: string) => void;
}

export interface PreviewPaneHandle {
  sendCountdownUpdate: (targetDate: string) => void;
  /** Mide un elemento tal como se ve ahora en la vista previa (en píxeles). */
  measureElement: (geminiId: string) => MetricasElemento | null;
  /**
   * Cambia un elemento directo en el documento que la persona está viendo, sin
   * recargar la vista previa. Solo se aplica si lo que se ve es "codigoBase";
   * después, lo que se ve es "codigoNuevo".
   */
  aplicarEdicion: (geminiId: string, edicion: EdicionElemento, codigoBase: string, codigoNuevo: string) => void;
  /**
   * Aplica al documento que la persona ve el mismo cambio que se hizo en el
   * código: "cambio" recibe el documento y lo modifica igual en ambos.
   */
  aplicarCambio: (cambio: (doc: Document) => void, codigoBase: string, codigoNuevo: string) => void;
  /** Cambia en vivo el bloque de colores de toda la invitación (lo crea si no existe). */
  aplicarEstilosDePaleta: (css: string, codigoBase: string, codigoNuevo: string | null) => void;
  /** Avisa que el documento que se ve ya refleja "codigoNuevo" (no hay que recargar). */
  marcarCodigoVivo: (codigoBase: string, codigoNuevo: string) => void;
}

// Dónde estaba la persona antes de una recarga. Se guarda también el primer
// elemento que asomaba por el borde superior: sirve de referencia para volver
// al mismo lugar aunque lo de arriba cambie de tamaño.
interface PosicionVista { x: number; y: number; id: string | null; margen: number }

/**
 * La invitación con los scripts del editor (selección de elementos, cuenta
 * regresiva). "carga" distingue cada vez que se carga el documento: la vista
 * previa avisa al terminar y así se ignoran los avisos de una carga reemplazada.
 */
const conScriptsDeEdicion = (codigo: string, carga: number): string => codigo ? `
    <script>
      window.__countdownIntervals = [];
      var _origSetInterval = window.setInterval;
      window.setInterval = function(fn, delay) {
        var id = _origSetInterval.call(window, fn, delay);
        if (delay >= 900 && delay <= 1100) {
          window.__countdownIntervals.push(id);
        }
        return id;
      };
    </script>
    ${codigo}
    <script>
      window.setInterval = _origSetInterval;
      window.__GEMINI_SELECTION_MODE = false;
      window.__GEMINI_MODULE_SELECTION_MODE = false;
      // Tracking del elemento seleccionado persistente (highlight visual)
      // Mantiene el outline hasta que se seleccione otro o se desactive.
      window.__GEMINI_SELECTED_EL = null;
      window.__GEMINI_SELECTED_PREV_OUTLINE = '';
      window.__GEMINI_SELECTED_PREV_OFFSET = '';

      function __getModuleName(geminiId) {
        if (!geminiId || geminiId.indexOf('edit-') === 0) return '';
        if (geminiId.indexOf('__') !== -1) return geminiId.split('__')[0];
        var parts = geminiId.split('-');
        return parts.length > 1 ? parts[0] : '';
      }

      function __geminiClearSelected() {
        if (window.__GEMINI_SELECTED_EL) {
          try {
            window.__GEMINI_SELECTED_EL.style.outline = window.__GEMINI_SELECTED_PREV_OUTLINE;
            window.__GEMINI_SELECTED_EL.style.outlineOffset = window.__GEMINI_SELECTED_PREV_OFFSET;
          } catch (e) {}
          window.__GEMINI_SELECTED_EL = null;
          window.__GEMINI_SELECTED_PREV_OUTLINE = '';
          window.__GEMINI_SELECTED_PREV_OFFSET = '';
        }
      }

      function __geminiSetSelected(el) {
        __geminiClearSelected();
        if (!el) return;
        window.__GEMINI_SELECTED_EL = el;
        window.__GEMINI_SELECTED_PREV_OUTLINE = el.style.outline;
        window.__GEMINI_SELECTED_PREV_OFFSET = el.style.outlineOffset;
        el.style.outline = '2px dashed #f472b6'; // pink-400
        el.style.outlineOffset = '2px';
      }

      function __startAllCountdowns() {
        document.querySelectorAll('[data-gemini-id^="countdown"]').forEach(function(cd) {
          var t = cd.getAttribute('data-countdown-target');
          if (!t || t.indexOf('YYYY-MM-DD') !== -1) return;
          var ts = new Date(t).getTime();
          if (isNaN(ts)) return;
          function pad2(n){return n<10?'0'+n:''+n;}
          function tick(){
            var diff = ts - Date.now(); if (diff<0) diff=0;
            cd.querySelectorAll('[data-countdown-unit]').forEach(function(u){
              var u2 = u.getAttribute('data-countdown-unit');
              if (u2==='days') u.textContent = Math.floor(diff/86400000);
              if (u2==='hours') u.textContent = pad2(Math.floor((diff%86400000)/3600000));
              if (u2==='minutes') u.textContent = pad2(Math.floor((diff%3600000)/60000));
              if (u2==='seconds') u.textContent = pad2(Math.floor((diff%60000)/1000));
            });
            var d2 = Math.floor(diff/86400000);
            var h2 = Math.floor((diff%86400000)/3600000);
            var m2 = Math.floor((diff%3600000)/60000);
            var s2 = Math.floor((diff%60000)/1000);
            var dataNums = cd.querySelectorAll('[data-countdown-number]');
            if (dataNums.length >= 4) {
              dataNums[0].textContent = d2;
              dataNums[1].textContent = pad2(h2);
              dataNums[2].textContent = pad2(m2);
              dataNums[3].textContent = pad2(s2);
            }
            var numSpans = cd.querySelectorAll('.countdown-number, .countdown-value, .flip-number');
            if (numSpans.length >= 4) {
              numSpans[0].textContent = d2;
              numSpans[1].textContent = pad2(h2);
              numSpans[2].textContent = pad2(m2);
              numSpans[3].textContent = pad2(s2);
            }
            var cards = cd.querySelectorAll('.countdown-card-value, .timer-value');
            if (cards.length >= 4) {
              cards[0].textContent = d2;
              cards[1].textContent = pad2(h2);
              cards[2].textContent = pad2(m2);
              cards[3].textContent = pad2(s2);
            }
          }
          tick();
          if (ts > Date.now()) {
            var id = _origSetInterval.call(window, tick, 1000);
            (window.__countdownIntervals = window.__countdownIntervals || []).push(id);
          }
          console.log('[PREVIEW-COUNTDOWN] arrancado para', cd.getAttribute('data-gemini-id'), 'target=', t);
        });
      }

      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TOGGLE_SELECTION_MODE') {
          window.__GEMINI_SELECTION_MODE = event.data.payload;
          document.body.style.cursor = event.data.payload ? 'crosshair' : 'default';
          // Al desactivar el modo selección, quitar el highlight persistente
          if (!event.data.payload) {
            __geminiClearSelected();
          }
        }
        if (event.data && event.data.type === 'TOGGLE_MODULE_SELECTION_MODE') {
          window.__GEMINI_MODULE_SELECTION_MODE = event.data.payload;
          document.body.style.cursor = event.data.payload ? 'crosshair' : 'default';
        }
        if (event.data && event.data.type === 'SELECT_ELEMENT') {
          const id = event.data.payload;
          if (!id) { __geminiClearSelected(); return; }
          const el = document.querySelector('[data-gemini-id="' + id + '"]');
          __geminiSetSelected(el);
        }
        if (event.data && event.data.type === 'DESELECT_ELEMENT') {
          __geminiClearSelected();
        }
        if (event.data && event.data.type === 'UPDATE_COUNTDOWN') {
          var targetDate = event.data.payload;
          console.log('[PREVIEW-COUNTDOWN] recibido targetDate=', targetDate, 'countdownEls=', document.querySelectorAll('[data-gemini-id^="countdown"]').length);
          var countdownEls = document.querySelectorAll('[data-gemini-id^="countdown"]');
          countdownEls.forEach(function(el) {
            el.setAttribute('data-countdown-target', targetDate);
          });
          if (typeof window.__countdownTarget !== 'undefined') {
            window.__countdownTarget = targetDate;
          }
          if (typeof window.countdown_target !== 'undefined') {
            window.countdown_target = targetDate;
          }
          if (typeof window.updateCountdown === 'function') {
            window.updateCountdown(targetDate);
          }
          (window.__countdownIntervals || []).forEach(function(id) { clearInterval(id); });
          window.__countdownIntervals = [];
          __startAllCountdowns();
        }
      });

      document.body.addEventListener('click', (e) => {
        const target = e.target.closest('a') || e.target;
        const isLink = target.tagName === 'A';
        
        // 0. Handle Module Selection Mode (Modificar Diseño per-module)
        if (window.__GEMINI_MODULE_SELECTION_MODE) {
          e.preventDefault();
          e.stopPropagation();
          const el = e.target.closest('[data-gemini-id]');
          if (!el) return;
          const geminiId = el.getAttribute('data-gemini-id');
          const moduleName = __getModuleName(geminiId);
          if (!moduleName) return;
          // Highlight visual temporal del módulo
          __geminiSetSelected(el);
          window.parent.postMessage({
            type: 'GEMINI_MODULE_CLICK',
            payload: moduleName
          }, '*');
          return;
        }

        // 1. Handle Selection Mode
        if (window.__GEMINI_SELECTION_MODE) {
          e.preventDefault();
          e.stopPropagation();
          
          // Lo que se toca dentro de un elemento YA editable se edita como ese
          // elemento (así el panel lo despliega y resalta). Solo se baja al
          // texto suelto cuando está dentro de un contenedor genérico
          // (sección o fondo), que no es lo que la persona quiere editar.
          var __conId = e.target.closest('[data-gemini-id]');
          var __esContenedor = !__conId || /^(SECTION|DIV|BODY|MAIN|FOOTER|HEADER|NAV|ASIDE)$/.test(__conId.tagName);
          var __texto = e.target.closest('a, img, h1, h2, h3, h4, h5, h6, p, span, li, time, figcaption, blockquote, strong, em, label, td, th');
          const element = __esContenedor ? (__texto || __conId || e.target) : __conId;
          
          // No permitir edición de elementos con memory_usage="protected"
          // salvo backgrounds editables
          const memoryUsage = element.getAttribute('memory_usage');
          const memoryType = element.getAttribute('memory_type');
          if (memoryUsage === 'protected' && memoryType !== 'background') {
            // Mostrar mensaje visual de que está protegido
            const prevOutline = element.style.outline;
            const prevOutlineOffset = element.style.outlineOffset;
            element.style.outline = '2px solid #ef4444'; // red-500
            element.style.outlineOffset = '2px';
            setTimeout(() => { 
              element.style.outline = prevOutline; 
              element.style.outlineOffset = prevOutlineOffset;
            }, 1500);
            return;
          }

          // En la cuenta regresiva los NÚMEROS los pone el reloj y cambian
          // solos: no se editan (confundiría). Los rótulos ("Días") sí.
          if (element.closest('[data-gemini-id^="countdown"]') && /^\\s*\\d+\\s*$/.test(element.textContent || '')) {
            const prevOutline = element.style.outline;
            const prevOutlineOffset = element.style.outlineOffset;
            element.style.outline = '2px solid #ef4444'; // red-500
            element.style.outlineOffset = '2px';
            setTimeout(() => {
              element.style.outline = prevOutline;
              element.style.outlineOffset = prevOutlineOffset;
            }, 1500);
            return;
          }
          
          // Ensure element has a gemini-id for editing
          if (!element.getAttribute('data-gemini-id')) {
             element.setAttribute('data-gemini-id', 'edit-' + Math.random().toString(36).substr(2, 9));
          }

          // Highlight persistente: marca el elemento seleccionado hasta que
          // se elija otro o se desactive el modo selección. Se envía el
          // outerHTML YA CON el data-gemini-id para que el parent pueda
          // persistirlo en el code si es efímero.
          __geminiSetSelected(element);

          // Lugar del elemento en la página (índices entre hermanos, desde el
          // cuerpo): el editor lo usa para encontrarlo en el código de la
          // invitación cuando todavía no tiene identificador.
          var __camino = [];
          for (var __n = element; __n && __n.parentElement; __n = __n.parentElement) {
            __camino.unshift(Array.prototype.indexOf.call(__n.parentElement.children, __n));
            if (__n.parentElement === document.body) break;
          }

          window.parent.postMessage({
            type: 'GEMINI_ELEMENT_CLICK',
            payload: {
              tagName: element.tagName,
              content: element.innerHTML,
              id: element.id,
              geminiId: element.getAttribute('data-gemini-id'),
              outerHTML: element.outerHTML,
              src: element.getAttribute('src'),
              href: element.getAttribute('href'),
              camino: __camino,
              texto: element.textContent || ''
            }
          }, '*');
          return;
        }

// 2. Block all links in editor mode — they should only work in public view
        if (isLink) {
           e.preventDefault();
           e.stopPropagation();
         }
      }, true);
      
      __startAllCountdowns();

      // Request initial state
      window.parent.postMessage({ type: 'GEMINI_PREVIEW_LOADED', carga: ${carga} }, '*');
    </script>
  ` : '';

export const PreviewPane = forwardRef<PreviewPaneHandle, PreviewPaneProps>(({ 
  code, 
  onElementClick,
  isFullscreen,
  onToggleFullscreen,
  isSelectionMode,
  selectedElementId,
  isModuleSelectionMode,
  onModuleClick
}, ref) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // La vista previa solo se vuelve a cargar cuando la invitación cambia por
  // completo. Las ediciones del panel se aplican directo en el documento que
  // la persona está viendo (aplicarEdicion): el cambio se ve al instante, no se
  // pierde la posición del scroll y las animaciones no se reinician. Recargar
  // una invitación de varios MB tarda alrededor de un segundo.
  const [srcDoc, setSrcDoc] = useState(() => conScriptsDeEdicion(code, 1));
  const cargaRef = useRef(1);                    // número de la carga en curso: identifica sus avisos
  const vivoRef = useRef<string | null>(null);   // código que refleja el documento ya cargado
  const pendienteRef = useRef(code);             // código del documento que carga (o del último cargado)
  const cargandoRef = useRef(true);
  const posicionRef = useRef<PosicionVista | null>(null);
  const restauracionesRef = useRef<number[]>([]);

  // El documento que la persona está viendo, si ya terminó de cargar.
  const documentoVivo = () => {
    const doc = iframeRef.current?.contentDocument;
    const vista = iframeRef.current?.contentWindow;
    return doc && vista && !cargandoRef.current ? { doc, vista } : null;
  };

  const marcarPosicion = (): PosicionVista | null => {
    try {
      const doc = iframeRef.current?.contentDocument;
      const vista = iframeRef.current?.contentWindow;
      if (!doc || !vista) return null;
      let id: string | null = null;
      let margen = 0;
      let mejor = Infinity;
      doc.querySelectorAll('[data-gemini-id]').forEach((el) => {
        const top = (el as HTMLElement).getBoundingClientRect().top;
        if (top >= -1 && top < mejor) { mejor = top; id = el.getAttribute('data-gemini-id'); margen = top; }
      });
      return { x: vista.scrollX, y: vista.scrollY, id, margen };
    } catch {
      return null;
    }
  };

  const restaurarPosicion = () => {
    const pos = posicionRef.current;
    if (!pos) return;
    try {
      const doc = iframeRef.current?.contentDocument;
      const vista = iframeRef.current?.contentWindow;
      if (!doc || !vista) return;
      let y = pos.y;
      // El elemento de referencia manda si sigue en la página y es visible.
      const referencia = pos.id ? buscarElemento(doc, pos.id) : null;
      if (referencia && referencia.getBoundingClientRect().height > 0) {
        y = referencia.getBoundingClientRect().top + vista.scrollY - pos.margen;
      }
      vista.scrollTo(pos.x, Math.max(0, y));
    } catch { /* el documento todavía no admite desplazamiento */ }
  };

  // Al recargar se vuelve a la posición varias veces mientras la invitación
  // termina de acomodarse (fuentes, imágenes), hasta que la persona se mueva.
  const dejarDeRestaurar = () => {
    restauracionesRef.current.forEach(clearTimeout);
    restauracionesRef.current = [];
    posicionRef.current = null;
  };
  const volverAlMismoLugar = () => {
    restaurarPosicion();
    restauracionesRef.current.forEach(clearTimeout);
    restauracionesRef.current = [150, 600, 1500].map((ms) => window.setTimeout(restaurarPosicion, ms));
  };
  useEffect(() => () => restauracionesRef.current.forEach(clearTimeout), []);

  // Mide cómo se ve un elemento en la invitación. Lo usan los controles en
  // palabras del editor para calcular sus opciones a partir del diseño real
  // (p. ej. "Suelto" = un poco más espacio del que el texto ya tiene).
  const measureElement = useCallback((geminiId: string): MetricasElemento | null => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || !geminiId) return null;
      const el = buscarElemento(doc, geminiId);
      const vista = doc.defaultView;
      if (!el || !vista) return null;
      const cs = vista.getComputedStyle(el);
      // parseFloat de "normal" o "" da NaN: el llamador lo trata como "sin medida".
      const px = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : NaN; };

      let lineHeight = px(cs.lineHeight);
      // El espaciado "normal" es el más común en los diseños y el navegador no
      // da un número para él. Se mide con una sonda: una línea invisible dentro
      // del elemento, retirada de inmediato (no llega a pintarse). Sin esto el
      // punto de partida sería un supuesto y "Junto" podría quedar más suelto
      // que el diseño.
      if (!Number.isFinite(lineHeight) && !/^(IMG|IFRAME|VIDEO|AUDIO|BR|HR|INPUT|SVG|CANVAS|PICTURE)$/.test(el.tagName)) {
        const sonda = doc.createElement('span');
        sonda.setAttribute('style', 'position:absolute;visibility:hidden;display:block;width:1px;padding:0;border:0;margin:0');
        sonda.textContent = '\u200B';
        el.appendChild(sonda);
        lineHeight = sonda.getBoundingClientRect().height;
        el.removeChild(sonda);
        if (lineHeight <= 0) lineHeight = NaN;
      }
      return {
        fontSize: px(cs.fontSize),
        lineHeight,
        letterSpacing: px(cs.letterSpacing),
        padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
      };
    } catch {
      return null;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    sendCountdownUpdate: (targetDate: string) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'UPDATE_COUNTDOWN',
        payload: targetDate
      }, '*');
    },
    measureElement,
    aplicarCambio: (cambio: (doc: Document) => void, codigoBase: string, codigoNuevo: string) => {
      // Solo si lo que se ve es el documento que se está editando y ya terminó
      // de cargar. En cualquier otro caso el código nuevo lo cargará el efecto.
      const vivo = documentoVivo();
      if (!vivo || vivoRef.current !== codigoBase) return;
      try {
        cambio(vivo.doc);
      } catch {
        return;
      }
      vivoRef.current = codigoNuevo;
    },
    aplicarEdicion: (geminiId: string, edicion: EdicionElemento, codigoBase: string, codigoNuevo: string) => {
      // Solo si lo que se ve es el documento que se está editando, ya terminó de
      // cargar y trae el elemento. En cualquier otro caso el código nuevo lo
      // cargará el efecto.
      const vivo = documentoVivo();
      if (!vivo || vivoRef.current !== codigoBase) return;
      const el = buscarElemento(vivo.doc, geminiId);
      if (!el) return;
      try {
        aplicarEdicionEnElemento(el, edicion);
      } catch {
        return;
      }
      vivoRef.current = codigoNuevo;
    },
    aplicarEstilosDePaleta: (css: string, codigoBase: string, codigoNuevo: string | null) => {
      const vivo = documentoVivo();
      if (!vivo || vivoRef.current !== codigoBase) return;
      let estilo = vivo.doc.querySelector('style[data-editor-color-vars]');
      if (!estilo) {
        estilo = vivo.doc.createElement('style');
        estilo.setAttribute('data-editor-color-vars', 'true');
        vivo.doc.head.appendChild(estilo);
      }
      estilo.textContent = css;
      if (codigoNuevo !== null) vivoRef.current = codigoNuevo;
    },
    marcarCodigoVivo: (codigoBase: string, codigoNuevo: string) => {
      if (documentoVivo() && vivoRef.current === codigoBase) vivoRef.current = codigoNuevo;
    }
  }));

  // El código cambia por dos motivos: una edición del panel (ya aplicada en el
  // documento que se ve, ver aplicarEdicion) o un cambio de toda la invitación
  // (colores, tipografía, módulos…), que sí exige volver a cargarla.
  useEffect(() => {
    if (!cargandoRef.current && code === vivoRef.current) return;
    if (cargandoRef.current && code === pendienteRef.current) return;
    pendienteRef.current = code;
    cargandoRef.current = true;
    // Antes de recargar se recuerda dónde estaba la persona.
    posicionRef.current = marcarPosicion();
    restauracionesRef.current.forEach(clearTimeout);
    setSrcDoc(conScriptsDeEdicion(code, ++cargaRef.current));
  }, [code]);


  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GEMINI_ELEMENT_CLICK') {
        onElementClick({
          tagName: event.data.payload.tagName,
          content: event.data.payload.content,
          id: event.data.payload.id,
          geminiId: event.data.payload.geminiId,
          fullHtml: event.data.payload.outerHTML,
          src: event.data.payload.src,
          href: event.data.payload.href,
          camino: event.data.payload.camino,
          texto: event.data.payload.texto
        });
      }
      if (event.data?.type === 'GEMINI_MODULE_CLICK') {
        onModuleClick?.(event.data.payload as string);
      }
      if (event.data?.type === 'GEMINI_PREVIEW_LOADED') {
        // Aviso de una carga anterior: el documento que lo mandó ya fue reemplazado.
        if (event.data.carga !== cargaRef.current) return;
        vivoRef.current = pendienteRef.current;
        cargandoRef.current = false;
         // Sync state when iframe loads
         iframeRef.current?.contentWindow?.postMessage({
          type: 'TOGGLE_SELECTION_MODE',
          payload: isSelectionMode
        }, '*');
         iframeRef.current?.contentWindow?.postMessage({
          type: 'TOGGLE_MODULE_SELECTION_MODE',
          payload: isModuleSelectionMode
        }, '*');
         // Re-apply highlight del elemento seleccionado previamente si existe
         if (selectedElementId) {
           iframeRef.current?.contentWindow?.postMessage({
             type: 'SELECT_ELEMENT',
             payload: selectedElementId
           }, '*');
         }
         // Si hubo una recarga, se vuelve a donde estaba la persona. En cuanto
         // ella se mueva, se deja de corregir la posición.
         volverAlMismoLugar();
         const doc = iframeRef.current?.contentDocument;
         ['wheel', 'touchstart', 'keydown'].forEach((tipo) => doc?.addEventListener(tipo, dejarDeRestaurar, { passive: true, once: true }));
       }
     };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementClick, onModuleClick, isSelectionMode, isModuleSelectionMode, selectedElementId]);

  // Sync selection mode whenever prop changes
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'TOGGLE_SELECTION_MODE',
      payload: isSelectionMode
    }, '*');
  }, [isSelectionMode]);

  // Sync module selection mode whenever prop changes
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'TOGGLE_MODULE_SELECTION_MODE',
      payload: isModuleSelectionMode
    }, '*');
  }, [isModuleSelectionMode]);

  // Sync selected element highlight whenever the selected id or code changes
  // (al recargar la vista previa el documento nuevo llega sin la marca).
  // También se re-envía tras un UPDATE_COUNTDOWN.
  useEffect(() => {
    if (!selectedElementId) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'DESELECT_ELEMENT' }, '*');
    } else {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'SELECT_ELEMENT',
        payload: selectedElementId
      }, '*');
    }
  }, [selectedElementId, code]);

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-pink-50/50 overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-50 w-full h-full' : ''}`}>
      {/* Toolbar */}
      <div className="h-14 border-b border-pink-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-1 bg-pink-50 p-1 rounded-lg border border-pink-100">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-pink-600 shadow-sm"
          >
            <Eye className="w-4 h-4" />
            Vista Previa
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Viewport Controls */}
          <div className="flex items-center gap-1 bg-pink-50 p-1 rounded-lg border border-pink-100">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-md transition-colors ${viewport === 'desktop' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500 hover:bg-pink-100/50'}`}
              title="Ver como en computadora"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-md transition-colors ${viewport === 'tablet' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500 hover:bg-pink-100/50'}`}
              title="Ver como en tableta"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-colors ${viewport === 'mobile' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500 hover:bg-pink-100/50'}`}
              title="Ver como en celular"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-pink-200" />

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
        <div 
          className="h-full bg-white rounded-xl shadow-2xl shadow-pink-200/50 overflow-hidden border border-pink-200 transition-all duration-300 ease-in-out flex flex-col"
          style={{ width: getViewportWidth() }}
        >
          {/* Browser-like header for mobile/tablet */}
          {viewport !== 'desktop' && (
            <div className="h-6 bg-pink-50 border-b border-pink-100 flex items-center justify-center">
              <div className="w-16 h-1.5 bg-pink-200 rounded-full" />
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            // Al terminar de cargar (imágenes incluidas) se ajusta la posición una última vez.
            onLoad={restaurarPosicion}
            className="w-full flex-1 border-none bg-white"
            title="Vista previa de la invitación"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
});
