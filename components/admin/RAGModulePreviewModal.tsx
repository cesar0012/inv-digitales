import React, { useState, useEffect } from 'react';
import { X, Loader2, Eye, AlertCircle } from 'lucide-react';
import { previewRAGModule } from '../../services/adminService';

interface Props {
  moduleId: number | null;
  onClose: () => void;
}

export const RAGModulePreviewModal: React.FC<Props> = ({ moduleId, onClose }) => {
  const [html, setHtml] = useState<string>('');
  const [meta, setMeta] = useState<{ module_type?: string; style_name?: string }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moduleId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setHtml('');

    previewRAGModule(moduleId)
      .then((data) => {
        if (!active) return;
        setHtml(data.html_content || '');
        setMeta({ module_type: data.module_type, style_name: data.style_name });
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Error al cargar preview');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [moduleId]);

  if (!moduleId) return null;

  const srcDoc = html ? html : '';

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-purple-600 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-white" />
              <div>
                <h3 className="text-lg font-bold text-white">Preview del Módulo</h3>
                {(meta.module_type || meta.style_name) && (
                  <p className="text-xs text-purple-100">
                    {meta.module_type && <span className="font-mono">{meta.module_type}</span>}
                    {meta.module_type && meta.style_name && ' · '}
                    {meta.style_name && <span>{meta.style_name}</span>}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
            {loading && (
              <div className="flex flex-col items-center gap-2 text-gray-500 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <p className="text-sm">Cargando HTML...</p>
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center gap-2 text-red-600 py-12">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            {!loading && !error && html && (
              <iframe
                title="module-preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full min-h-[60vh] bg-white"
              />
            )}
            {!loading && !error && !html && (
              <div className="flex flex-col items-center gap-2 text-gray-500 py-12">
                <Eye className="w-8 h-8" />
                <p className="text-sm">Este módulo no tiene contenido HTML.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 flex justify-end bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
