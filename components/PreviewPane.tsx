import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Tablet, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { SelectedElement } from '../types';

interface PreviewPaneProps {
  code: string;
  onElementClick: (element: SelectedElement) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isSelectionMode: boolean;
  onNavigate?: (path: string) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ 
  code, 
  onElementClick,
  isFullscreen,
  onToggleFullscreen,
  isSelectionMode,
  onNavigate
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Inject script for Click-to-Edit functionality with mode support AND navigation interception
  const enhancedCode = code ? `
    ${code}
    <script>
      window.__GEMINI_SELECTION_MODE = false;

      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TOGGLE_SELECTION_MODE') {
          window.__GEMINI_SELECTION_MODE = event.data.payload;
          document.body.style.cursor = event.data.payload ? 'crosshair' : 'default';
        }
      });

      document.body.addEventListener('click', (e) => {
        const target = e.target.closest('a') || e.target;
        const isLink = target.tagName === 'A';
        
        // 1. Handle Selection Mode
        if (window.__GEMINI_SELECTION_MODE) {
          e.preventDefault();
          e.stopPropagation();
          
          const element = e.target.closest('[data-gemini-id], a, img, h1, h2, h3, h4, p, span, div') || e.target;
          
          // Ensure element has a gemini-id for editing
          if (!element.getAttribute('data-gemini-id')) {
             element.setAttribute('data-gemini-id', 'edit-' + Math.random().toString(36).substr(2, 9));
          }

          const prevOutline = element.style.outline;
          const prevOutlineOffset = element.style.outlineOffset;
          element.style.outline = '2px dashed #f472b6'; // pink-400
          element.style.outlineOffset = '2px';
          setTimeout(() => { 
            element.style.outline = prevOutline; 
            element.style.outlineOffset = prevOutlineOffset;
          }, 1500);

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

        // 2. Handle Navigation Prevention & Routing
        if (isLink) {
           const href = target.getAttribute('href');
           if (href) {
             // If it's an internal anchor or JS, allow it
             if (href.startsWith('#') || href.startsWith('javascript:')) return;
             
             // Prevent default browser navigation
             e.preventDefault();
             
             // Communicate to parent to check if this is a known page
             window.parent.postMessage({
                type: 'GEMINI_NAVIGATE',
                payload: { href }
             }, '*');
           }
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
      if (event.data?.type === 'GEMINI_NAVIGATE') {
         if (onNavigate) {
            onNavigate(event.data.payload.href);
         }
      }
      if (event.data?.type === 'GEMINI_PREVIEW_LOADED') {
         // Sync state when iframe loads
         iframeRef.current?.contentWindow?.postMessage({
          type: 'TOGGLE_SELECTION_MODE',
          payload: isSelectionMode
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementClick, isSelectionMode, onNavigate]);

  // Sync selection mode whenever prop changes
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'TOGGLE_SELECTION_MODE',
      payload: isSelectionMode
    }, '*');
  }, [isSelectionMode]);

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
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
