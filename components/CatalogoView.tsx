import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X, Eye, Edit3 } from 'lucide-react';

interface Invitacion {
  id: number;
  filename: string;
  title: string;
  event_type: string;
  theme: string;
  colors: string;
  tags: string;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_PUBLIC_URL 
  ? `${import.meta.env.VITE_PUBLIC_URL}/api`
  : 'http://localhost:3001/api';

const PREVIEW_BASE = import.meta.env.VITE_PUBLIC_URL 
  ? `${import.meta.env.VITE_PUBLIC_URL}/preview`
  : 'http://localhost:3001/preview';

export const CatalogoView: React.FC = () => {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvitacion, setSelectedInvitacion] = useState<Invitacion | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadCatalogo();
  }, []);

  useEffect(() => {
    if (invitaciones.length > 0) {
      const urls: Record<number, string> = {};
      invitaciones.forEach((inv) => {
        urls[inv.id] = `${PREVIEW_BASE}/${inv.filename}`;
      });
      setThumbnailUrls(urls);
    }
  }, [invitaciones]);

  const loadCatalogo = async () => {
    try {
      const res = await fetch(`${API_BASE}/catalogo?starred=true`);
      const data = await res.json();
      setInvitaciones(data.invitaciones || []);
    } catch (error) {
      console.error('Error loading catalogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerCompleta = (invitacion: Invitacion) => {
    setSelectedInvitacion(invitacion);
  };

  const handlePersonalizar = async (invitacion: Invitacion) => {
    try {
      const res = await fetch(`${API_BASE}/catalogo/${invitacion.filename}`);
      const html = await res.text();
      localStorage.setItem('catalogo_html', html);
      localStorage.setItem('catalogo_filename', invitacion.filename);
      navigate('/editor?fromCatalogo=true');
    } catch (error) {
      console.error('Error loading HTML for editor:', error);
    }
  };

  const parseColors = (colorsStr: string): string[] => {
    try {
      return JSON.parse(colorsStr) || [];
    } catch {
      return [];
    }
  };

  const parseTags = (tagsStr: string): string[] => {
    try {
      return JSON.parse(tagsStr) || [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Catálogo de Invitaciones</h1>
          <p className="text-gray-600">Explora nuestras invitaciones y personaliza la que más te gustes</p>
        </div>

        {invitaciones.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay invitaciones en el catálogo aún.</p>
            <p className="text-gray-400">¡Genera tu primera invitación para verla aquí!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {invitaciones.map((inv) => (
              <div key={inv.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gradient-to-br from-pink-100 to-rose-100 relative overflow-hidden">
                  <iframe
                    src={thumbnailUrls[inv.id]}
                    className="w-[200%] h-[200%] origin-top-left scale-[0.5] pointer-events-none"
                    title={`Preview ${inv.filename}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-1 truncate">{inv.title || 'Sin título'}</h3>
                  <p className="text-sm text-pink-600 mb-2">{inv.event_type || 'Evento'}</p>
                  <p className="text-xs text-gray-500 mb-3">{inv.theme}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {parseTags(inv.tags).slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerCompleta(inv)}
                      className="flex-1 flex items-center justify-center gap-1 bg-pink-500 hover:bg-pink-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para ver invitación completa */}
      {selectedInvitacion && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedInvitacion.title}</h2>
                <p className="text-sm text-gray-500">{selectedInvitacion.event_type} - {selectedInvitacion.theme}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePersonalizar(selectedInvitacion)}
                  className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Personalizar
                </button>
                <a
                  href={`${PREVIEW_BASE}/${selectedInvitacion.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Nueva pestaña
                </a>
                <button
                  onClick={() => setSelectedInvitacion(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100">
              <iframe
                src={`${PREVIEW_BASE}/${selectedInvitacion.filename}`}
                className="w-full h-full border-0"
                title={`Vista previa ${selectedInvitacion.filename}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};