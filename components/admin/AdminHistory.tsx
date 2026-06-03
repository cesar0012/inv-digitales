import React, { useState, useEffect } from 'react';
import { History, Star, Eye, Trash2, ExternalLink, Loader2, Sparkles, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { getCatalogo, starCatalogo, unstarCatalogo, deleteCatalogoItem, generateSEO } from '../../services/adminService';

interface CatalogoItem {
  id: number;
  filename: string;
  title: string;
  event_type: string;
  theme: string;
  colors: string;
  tags: string;
  primary_color: string;
  secondary_color: string;
  starred: boolean;
  slug: string | null;
  created_at: string;
}

export const AdminHistory: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'starred'>('all');
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<CatalogoItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [activeSubTab]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const starred = activeSubTab === 'starred' ? true : undefined;
      const data = await getCatalogo(starred);
      setItems(data.invitaciones || []);
    } catch (error) {
      console.error('Error loading catalogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (item: CatalogoItem) => {
    if (item.starred) {
      handleUnstar(item);
    } else {
      setShowConfirmModal(item);
    }
  };

  const handleUnstar = async (item: CatalogoItem) => {
    setActionLoading(item.id);
    try {
      await unstarCatalogo(item.id);
      await loadItems();
    } catch (error) {
      console.error('Error unstarring:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmSEO = async () => {
    if (!showConfirmModal) return;
    const item = showConfirmModal;
    setShowConfirmModal(null);
    setIsGeneratingSEO(item.id);

    try {
      const result = await generateSEO(item.id);
      await loadItems();
      setSuccessMessage(`Página SEO generada exitosamente — Slug: ${result.slug}`);
    } catch (error: any) {
      console.error('Error generating SEO:', error);
      alert(`Error al generar SEO: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsGeneratingSEO(null);
    }
  };

  const handleDelete = async (item: CatalogoItem) => {
    if (!confirm(`¿Eliminar invitación "${item.title || item.filename}"?`)) return;
    setActionLoading(item.id);
    try {
      await deleteCatalogoItem(item.id);
      await loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseColors = (colorsStr: string): string[] => {
    try {
      const parsed = JSON.parse(colorsStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };

  const baseUrl = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:3001';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
          <History className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Historial de Invitaciones</h2>
          <p className="text-sm text-gray-500">{items.length} invitaciones</p>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto p-1 hover:bg-emerald-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-emerald-500" />
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSubTab === 'all'
              ? 'bg-pink-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Históricos
        </button>
        <button
          onClick={() => setActiveSubTab('starred')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeSubTab === 'starred'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Star className="w-3 h-3" />
          Seleccionadas
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
          <span className="ml-2 text-gray-500">Cargando invitaciones...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {activeSubTab === 'starred' ? 'No hay invitaciones seleccionadas' : 'No hay invitaciones en el histórico'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-pink-100">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Título</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo / Tema</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Colores</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Slug SEO</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">URL</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-pink-50 hover:bg-pink-50/30 transition-colors relative">
                  {isGeneratingSEO === item.id && (
                    <td colSpan={7} className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                        <span className="text-sm font-medium text-amber-700">Generando página SEO con IA...</span>
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="text-sm font-semibold text-gray-800">{item.title || item.filename}</div>
                    {item.title && item.title !== item.filename && (
                      <div className="text-xs text-gray-400 mt-0.5">{item.filename}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-700">{item.event_type || 'Sin tipo'}</div>
                    {item.theme && <div className="text-xs text-gray-400">{item.theme}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.primary_color && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: item.primary_color }}
                          />
                          <span className="text-xs text-gray-500">{item.primary_color}</span>
                        </div>
                      )}
                      {item.secondary_color && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: item.secondary_color }}
                          />
                          <span className="text-xs text-gray-500">{item.secondary_color}</span>
                        </div>
                      )}
                      {parseColors(item.colors).map((c, i) => (
                        <span key={i} className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {item.slug ? (
                      <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">
                        {item.slug}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{formatDate(item.created_at)}</td>
                  <td className="py-3 px-4">
                    <a
                      href={`${baseUrl}/api/catalogo/${item.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver
                    </a>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <a
                        href={`${baseUrl}/api/catalogo/${item.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors"
                        title="Ver invitación"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleStarClick(item)}
                        disabled={actionLoading === item.id || isGeneratingSEO === item.id}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          item.starred
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={item.starred ? 'Quitar del catálogo público' : 'Agregar al catálogo y generar SEO'}
                      >
                        {actionLoading === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4" fill={item.starred ? 'currentColor' : 'none'} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={actionLoading === item.id || isGeneratingSEO === item.id}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        title="Eliminar invitación"
                      >
                        {actionLoading === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Agregar al Catálogo Público</h2>
                <p className="text-sm text-amber-700">{showConfirmModal.title || showConfirmModal.filename}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  ¿Confirmas que deseas agregar esta invitación al catálogo público? Esto activará la generación automática de su página de ventas y metadatos SEO utilizando la IA de Gemini. El proceso puede demorar entre 5 y 10 segundos debido a la redacción asíncrona de los contenidos.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p><span className="font-medium text-gray-700">Tipo:</span> {showConfirmModal.event_type || 'Sin tipo'}</p>
                <p><span className="font-medium text-gray-700">Tema:</span> {showConfirmModal.theme || 'Sin tema'}</p>
                <p><span className="font-medium text-gray-700">Archivo:</span> {showConfirmModal.filename}</p>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSEO}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200"
              >
                Confirmar y Generar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};