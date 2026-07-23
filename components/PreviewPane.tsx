import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Monitor, Smartphone, Tablet, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { SelectedElement } from '../types';

interface PreviewPaneProps {
  code: string;
  onElementClick: (element: SelectedElement) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isSelectionMode: boolean;
  selectedElementId: string | null;
}

export interface PreviewPaneHandle {
  sendCountdownUpdate: (targetDate: string) => void;
}

export const PreviewPane = forwardRef<PreviewPaneHandle, PreviewPaneProps>(({ 
  code, 
  onElementClick,
  isFullscreen,
  onToggleFullscreen,
  isSelectionMode,
  selectedElementId
}, ref) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    sendCountdownUpdate: (targetDate: string) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'UPDATE_COUNTDOWN',
        payload: targetDate
      }, '*');
    }
  }));

  // Inject script for Click-to-Edit functionality with mode support
  const enhancedCode = code ? `
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
    ${code}
    <script>
      window.setInterval = _origSetInterval;
      window.__GEMINI_SELECTION_MODE = false;
      // Tracking del elemento seleccionado persistente (highlight visual)
      // Mantiene el outline hasta que se seleccione otro o se desactive.
      window.__GEMINI_SELECTED_EL = null;
      window.__GEMINI_SELECTED_PREV_OUTLINE = '';
      window.__GEMINI_SELECTED_PREV_OFFSET = '';

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

      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TOGGLE_SELECTION_MODE') {
          window.__GEMINI_SELECTION_MODE = event.data.payload;
          document.body.style.cursor = event.data.payload ? 'crosshair' : 'default';
          // Al desactivar el modo selección, quitar el highlight persistente
          if (!event.data.payload) {
            __geminiClearSelected();
          }
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
          var ts = new Date(targetDate).getTime();
          if (isNaN(ts)) return;
          function pad2(n) { return n < 10 ? '0' + n : '' + n; }
          var newInterval = setInterval(function() {
            var diff = ts - Date.now();
            if (diff <= 0) diff = 0;
            var d = Math.floor(diff / 86400000);
            var h = Math.floor((diff % 86400000) / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            countdownEls.forEach(function(el) {
              var daysEl = el.querySelector('[data-unit="days"], .countdown-days, #countdown-days');
              var hoursEl = el.querySelector('[data-unit="hours"], .countdown-hours, #countdown-hours');
              var minsEl = el.querySelector('[data-unit="minutes"], .countdown-minutes, #countdown-minutes');
              var secsEl = el.querySelector('[data-unit="seconds"], .countdown-seconds, #countdown-seconds');
              if (daysEl) daysEl.textContent = d;
              if (hoursEl) hoursEl.textContent = pad2(h);
              if (minsEl) minsEl.textContent = pad2(m);
              if (secsEl) secsEl.textContent = pad2(s);
              var numSpans = el.querySelectorAll('.countdown-number, .countdown-value, .flip-number');
              if (numSpans.length >= 4) {
                numSpans[0].textContent = d;
                numSpans[1].textContent = pad2(h);
                numSpans[2].textContent = pad2(m);
                numSpans[3].textContent = pad2(s);
              }
              var cards = el.querySelectorAll('.countdown-card-value, .timer-value');
              if (cards.length >= 4) {
                cards[0].textContent = d;
                cards[1].textContent = pad2(h);
                cards[2].textContent = pad2(m);
                cards[3].textContent = pad2(s);
              }
            });
            if (diff <= 0) clearInterval(newInterval);
          }, 1000);
          (window.__countdownIntervals = window.__countdownIntervals || []).push(newInterval);
        }
      });

      document.body.addEventListener('click', (e) => {
        const target = e.target.closest('a') || e.target;
        const isLink = target.tagName === 'A';
        
        // 1. Handle Selection Mode
        if (window.__GEMINI_SELECTION_MODE) {
          e.preventDefault();
          e.stopPropagation();
          
          const element = e.target.closest('[data-gemini-id], a, img, h1, h2, h3, h4, p, span') || e.target;
          
          // No permitir edición de elementos con memory_usage="protected"
          const memoryUsage = element.getAttribute('memory_usage');
          if (memoryUsage === 'protected') {
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
          
          // Ensure element has a gemini-id for editing
          if (!element.getAttribute('data-gemini-id')) {
             element.setAttribute('data-gemini-id', 'edit-' + Math.random().toString(36).substr(2, 9));
          }

          // Highlight persistente: marca el elemento seleccionado hasta que
          // se elija otro o se desactive el modo selección. Se envía el
          // outerHTML YA CON el data-gemini-id para que el parent pueda
          // persistirlo en el code si es efímero.
          __geminiSetSelected(element);

          window.parent.postMessage({
            type: 'GEMINI_ELEMENT_CLICK',
            payload: {
              tagName: element.tagName,
              content: element.innerHTML,
              id: element.id,
              geminiId: element.getAttribute('data-gemini-id'),
              outerHTML: element.outerHTML,
              src: element.getAttribute('src'),
              href: element.getAttribute('href')
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
      
      // Request initial state
      window.parent.postMessage({ type: 'GEMINI_PREVIEW_LOADED' }, '*');
    </script>
  ` : '';

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
          href: event.data.payload.href
        });
      }
      if (event.data?.type === 'GEMINI_PREVIEW_LOADED') {
         // Sync state when iframe loads
         iframeRef.current?.contentWindow?.postMessage({
          type: 'TOGGLE_SELECTION_MODE',
          payload: isSelectionMode
        }, '*');
         // Re-apply highlight del elemento seleccionado previamente si existe
         if (selectedElementId) {
           iframeRef.current?.contentWindow?.postMessage({
             type: 'SELECT_ELEMENT',
             payload: selectedElementId
           }, '*');
         }
       }
     };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementClick, isSelectionMode, selectedElementId]);

  // Sync selection mode whenever prop changes
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'TOGGLE_SELECTION_MODE',
      payload: isSelectionMode
    }, '*');
  }, [isSelectionMode]);

  // Sync selected element highlight whenever the selected id or code changes
  // (necesario porque el iframe se re-renderiza con el srcDoc y pierde el
  // outline aplicado). También re-envía tras un UPDATE_COUNTDOWN.
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
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-md transition-colors ${viewport === 'tablet' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500 hover:bg-pink-100/50'}`}
              title="Tablet View"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-colors ${viewport === 'mobile' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500 hover:bg-pink-100/50'}`}
              title="Mobile View"
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
            srcDoc={enhancedCode}
            className="w-full flex-1 border-none bg-white"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
});
