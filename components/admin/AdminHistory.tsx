import React, { useState, useEffect } from 'react';
import { History, Star, Eye, Trash2, ExternalLink, Loader2, Sparkles, X, CheckCircle, AlertTriangle, Download, Trash } from 'lucide-react';
import { getCatalogo, starCatalogo, unstarCatalogo, deleteCatalogoItem, generateSEO, CatalogoItem, getHistorialStats, downloadHistorialBackup, clearHistorial, HistorialStats } from '../../services/adminService';

export const AdminHistory: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'starred' | 'backup'>('all');
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<CatalogoItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historialStats, setHistorialStats] = useState<HistorialStats | null>(null);
  const [historialStatsLoading, setHistorialStatsLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'backup') {
      loadHistorialStats();
    } else {
      loadItems();
    }
  }, [activeSubTab]);

  const loadHistorialStats = async () => {
    setHistorialStatsLoading(true);
    try {
      const stats = await getHistorialStats();
      setHistorialStats(stats);
    } catch (error) {
      console.error('Error loading historial stats:', error);
    } finally {
      setHistorialStatsLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const { url, filename, size } = await downloadHistorialBackup();
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setSuccessMessage(`Backup generado: ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error: any) {
      console.error('Error downloading backup:', error);
      alert(`Error al descargar backup: ${error.message || 'Error desconocido'}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleClearHistorial = async () => {
    setShowClearConfirm(false);
    setClearLoading(true);
    try {
      const result = await clearHistorial();
      setSuccessMessage(`Historial limpiado: ${result.deletedFiles} archivos eliminados, ${result.dbRowsDeleted} filas en catálogo. Recomendado: recarga la pestaña "Históricos" para confirmar.`);
      await loadHistorialStats();
    } catch (error: any) {
      console.error('Error clearing historial:', error);
      alert(`Error al limpiar historial: ${error.message || 'Error desconocido'}`);
    } finally {
      setClearLoading(false);
    }
  };

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
        <button
          onClick={() => setActiveSubTab('backup')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeSubTab === 'backup'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Descarga masiva / limpieza del historial — útil cuando la pestaña Históricos se cuelga"
        >
          <Download className="w-3 h-3" />
          Historial Backup
        </button>
      </div>

      {activeSubTab === 'backup' ? (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Respaldar y limpiar historial</h3>
                <p className="text-sm text-gray-500">
                  Operaciones de mantenimiento. No invoca la sincronización del catálogo, por lo que es seguro
                  usarlas aunque la pestaña «Históricos» se quede colgada.
                </p>
              </div>
            </div>

            {historialStatsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Contando archivos en storage/historico...
              </div>
            ) : historialStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Archivos .html</div>
                  <div className="text-2xl font-bold text-gray-800 mt-1">{historialStats.count}</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño total</div>
                  <div className="text-2xl font-bold text-gray-800 mt-1">
                    {historialStats.totalBytes > 0
                      ? `${(historialStats.totalBytes / 1024 / 1024).toFixed(2)} MB`
                      : '0 KB'}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filas en catálogo</div>
                  <div className="text-2xl font-bold text-gray-800 mt-1">{historialStats.dbRows}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No se pudieron obtener estadísticas.</p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadBackup}
                disabled={backupLoading || (historialStats?.count ?? 0) === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {backupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {backupLoading ? 'Generando ZIP...' : 'Descargar todos los .html'}
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={clearLoading || (historialStats?.count ?? 0) === 0 && (historialStats?.dbRows ?? 0) === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 disabled:text-red-300 rounded-xl text-sm font-semibold transition-colors"
              >
                {clearLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash className="w-4 h-4" />
                )}
                {clearLoading ? 'Limpiando...' : 'Limpiar historial completo'}
              </button>
            </div>

            {(historialStats?.count ?? 0) === 0 && (historialStats?.dbRows ?? 0) === 0 && (
              <p className="text-xs text-gray-400 mt-4">
                El historial ya está vacío. Si la pestaña «Históricos» sigue colgada, recarga esta página.
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-medium">Recomendación de uso</p>
              <p>
                1) Descarga el ZIP completo. 2) Verifica que el ZIP abre correctamente y contiene los HTML esperados.
                3) Recién entonces ejecuta «Limpiar historial completo» para vaciar storage/historico y la tabla catalogo.
                Las invitaciones de usuarios (en storage/&#123;user_id&#125;/) NO se ven afectadas — solo el catálogo histórico.
              </p>
            </div>
          </div>
        </div>
      ) : loading ? (
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha Evento</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Datos</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Slug SEO</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Creado</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">URL</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-pink-50 hover:bg-pink-50/30 transition-colors relative">
                  {isGeneratingSEO === item.id && (
                    <td colSpan={9} className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
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
                      {item.primary_color ? (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: item.primary_color }}
                          />
                          <span className="text-xs text-gray-500">{item.primary_color}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin color primario</span>
                      )}
                      {item.secondary_color ? (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: item.secondary_color }}
                          />
                          <span className="text-xs text-gray-500">{item.secondary_color}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin color secundario</span>
                      )}
                      {parseColors(item.colors).map((c, i) => (
                        <span key={i} className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {item.event_date ? (
                      <div>
                        <div>{new Date(item.event_date).toLocaleDateString('es-MX')}</div>
                        {item.event_time && (
                          <div className="text-xs text-gray-500">{item.event_time}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sin fecha</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {(() => {
                      try {
                        const ud = item.user_data ? JSON.parse(item.user_data) : {};
                        const summary = ud.names || ud.ceremonyLocation || ud.parents || '';
                        return (
                          <div className="text-xs text-gray-600 max-w-[200px] truncate" title={summary || ''}>
                            {summary || '—'}
                          </div>
                        );
                      } catch {
                        return <span className="text-xs text-gray-400">—</span>;
                      }
                    })()}
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
                      {item.starred && item.slug && (
                        <a
                          href={`${baseUrl}/catalogo/${item.event_type || 'general'}/${item.slug.split('/').pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                          title="Ver página SEO"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
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

      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Trash className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Limpiar historial completo</h2>
                <p className="text-sm text-red-700">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  Vas a borrar TODOS los <span className="font-semibold">.html del storage/historico</span> y
                  todas las filas de la tabla <span className="font-semibold">catalogo</span>. Las invitaciones
                  de los usuarios (en storage/&#123;user_id&#125;/) NO se tocan.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-medium mb-1">Antes de continuar:</p>
                <p>Asegúrate de haber descargado el ZIP de backup. Si aún no lo hiciste, cancela y usa «Descargar todos los .html» primero.</p>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearHistorial}
                disabled={clearLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 transition-all shadow-lg shadow-red-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {clearLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash className="w-4 h-4" />
                )}
                {clearLoading ? 'Limpiando...' : 'Sí, borrar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};