import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Upload, CheckCircle2, AlertCircle, X, Search, Eye,
  Pencil, Trash2, Sparkles, Loader2, FileCode, Filter
} from 'lucide-react';
import {
  getRAGModules,
  updateRAGModule,
  deleteRAGModule,
  uploadRAGModule,
  analyzeModuleHtml,
  createRAGModule,
  RAGModule,
  ModuleAnalysis
} from '../../services/adminService';
import { RAGModuleModal, MODULE_TYPES } from './RAGModuleModal';
import { RAGModulePreviewModal } from './RAGModulePreviewModal';

const MODULE_CATEGORIES = ['all', 'general', 'boda', 'xv-anos', 'cumpleanos', 'bautizo', 'primera-comunion', 'confirmacion', 'baby-shower'];
const TYPE_BADGE_COLORS: Record<string, string> = {
  portada: 'bg-pink-100 text-pink-800 border-pink-200',
  padres: 'bg-blue-100 text-blue-800 border-blue-200',
  ubicacion: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  itinerario: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmacion: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  detalles: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  countdown: 'bg-red-100 text-red-800 border-red-200',
  padrinos: 'bg-purple-100 text-purple-800 border-purple-200',
  corte: 'bg-orange-100 text-orange-800 border-orange-200',
  vestimenta: 'bg-teal-100 text-teal-800 border-teal-200',
  regalos: 'bg-lime-100 text-lime-800 border-lime-200',
  galeria: 'bg-rose-100 text-rose-800 border-rose-200',
  hospedaje: 'bg-sky-100 text-sky-800 border-sky-200',
  transporte: 'bg-violet-100 text-violet-800 border-violet-200',
  music: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  quotes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  mensaje: 'bg-green-100 text-green-800 border-green-200',
  pascar: 'bg-stone-100 text-stone-800 border-stone-200',
  mensaje_padres: 'bg-blue-100 text-blue-800 border-blue-200',
  gracias: 'bg-emerald-100 text-emerald-800 border-emerald-200'
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const AdminRAGModules: React.FC = () => {
  const [modules, setModules] = useState<RAGModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const [uploading, setUploading] = useState(false);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  // Modal de edición/creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Partial<RAGModule>>({});
  const [saving, setSaving] = useState(false);

  // Analyzer
  const [htmlInput, setHtmlInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ModuleAnalysis | null>(null);

  // Modal de preview
  const [previewId, setPreviewId] = useState<number | null>(null);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filterType !== 'all') filters.module_type = filterType;
      if (filterCategory !== 'all') filters.category = filterCategory;
      const result = await getRAGModules(filters);
      setModules(result.modules || []);
    } catch (error: any) {
      setToast({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [filterType, filterCategory]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadRAGModule(file);
      setToast({ type: 'success', text: `Módulo "${result.module_id}" subido exitosamente` });
      fetchModules();
    } catch (error: any) {
      setToast({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number, moduleName: string) => {
    if (!confirm(`¿Eliminar módulo "${moduleName}"?`)) return;
    try {
      await deleteRAGModule(id);
      setToast({ type: 'success', text: 'Módulo eliminado' });
      fetchModules();
    } catch (error: any) {
      setToast({ type: 'error', text: error.message });
    }
  };

  const handleToggleActive = async (id: number, current: number) => {
    try {
      await updateRAGModule(id, { is_active: current ? 0 : 1 });
      setModules(prev => prev.map(m => m.id === id ? { ...m, is_active: current ? 0 : 1 } : m));
    } catch (error: any) {
      setToast({ type: 'error', text: error.message });
    }
  };

  const openNewModule = () => {
    setSelectedModule({
      module_id: '',
      module_type: 'portada',
      style_name: '',
      description: '',
      tags: [],
      descripcion_larga: '',
      theme_tags: [],
      color_palette: {},
      css_variables: {},
      memory_sources: {},
      is_active: 1,
      category: 'general',
      html_content: ''
    });
    setHtmlInput('');
    setAnalysisResult(null);
    setIsModalOpen(true);
  };

  const openEditModule = (module: RAGModule) => {
    setSelectedModule({
      ...module,
      tags: typeof module.tags === 'string' ? safeParseArray(module.tags) : module.tags,
      theme_tags: typeof module.theme_tags === 'string' ? safeParseArray(module.theme_tags) : module.theme_tags,
      color_palette: typeof module.color_palette === 'string' ? safeParseObj(module.color_palette) : module.color_palette,
      css_variables: typeof module.css_variables === 'string' ? safeParseObj(module.css_variables) : module.css_variables,
      memory_sources: typeof module.memory_sources === 'string' ? safeParseObj(module.memory_sources) : module.memory_sources
    });
    setHtmlInput('');
    setAnalysisResult(null);
    setIsModalOpen(true);
  };

  const safeParseArray = (s: string): string[] => {
    try { return JSON.parse(s) || []; } catch { return []; }
  };
  const safeParseObj = (s: string) => {
    try { return JSON.parse(s) || {}; } catch { return {}; }
  };

  const handleAnalyze = async () => {
    if (!htmlInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeModuleHtml(htmlInput);
      const analysis = result.analysis;
      setAnalysisResult(analysis);
      // Autocompletar el módulo con los resultados del análisis
      setSelectedModule(prev => ({
        ...prev,
        module_id: analysis.module_id || prev.module_id,
        module_type: analysis.module_type || prev.module_type,
        style_name: analysis.style_name || prev.style_name,
        description: analysis.description || prev.description,
        tags: analysis.tags || prev.tags,
        theme_tags: analysis.theme_tags || prev.theme_tags,
        color_palette: analysis.color_palette || prev.color_palette,
        css_variables: analysis.css_variables || prev.css_variables,
        memory_sources: analysis.memory_sources || prev.memory_sources,
        html_content: htmlInput || prev.html_content,
        html_size: (htmlInput ? new Blob([htmlInput]).size : prev.html_size) as number | undefined
      }));
      setToast({ type: 'success', text: `Análisis ${analysis.llm_used ? 'con IA' : 'regex'} completado` });
    } catch (error: any) {
      setToast({ type: 'error', text: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveModule = async () => {
    if (!selectedModule.module_id || !selectedModule.module_type || !selectedModule.style_name || !selectedModule.html_content) {
      setToast({ type: 'error', text: 'Faltan campos requeridos: module_id, module_type, style_name, html_content' });
      return;
    }
    setSaving(true);
    try {
      if (selectedModule.id) {
        await updateRAGModule(selectedModule.id, selectedModule);
        setToast({ type: 'success', text: 'Módulo actualizado' });
      } else {
        await createRAGModule(selectedModule);
        setToast({ type: 'success', text: 'Módulo creado' });
      }
      fetchModules();
      setIsModalOpen(false);
      setSelectedModule({});
    } catch (error: any) {
      setToast({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredModules = modules.filter(m => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(`${m.module_id} ${m.style_name} ${m.description || ''}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Módulos RAG</h2>
            <p className="text-sm text-gray-500">Piezas individuales reutilizables del flujo modular</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".html"
            ref={uploadFileRef}
            onChange={handleUploadFileSelect}
            className="hidden"
          />
          <button
            onClick={() => uploadFileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Subiendo...' : 'Subir HTML'}
          </button>
          <button
            onClick={openNewModule}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Módulo
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 border ${
          toast.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success' 
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : <AlertCircle className="w-5 h-5 text-red-600" />
          }
          <span className="text-sm font-medium flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ID..."
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los tipos</option>
            {MODULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
          >
            {MODULE_CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'Todas las categorías' : c}</option>)}
          </select>
        </div>
        <span className="text-sm text-gray-500 ml-auto">{filteredModules.length} módulo(s)</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p>Cargando módulos...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 text-gray-700 text-sm">
                <th className="px-3 py-3 text-left font-semibold">ID</th>
                <th className="px-3 py-3 text-left font-semibold">Module ID</th>
                <th className="px-3 py-3 text-left font-semibold">Tipo</th>
                <th className="px-3 py-3 text-left font-semibold">Nombre</th>
                <th className="px-3 py-3 text-left font-semibold">Categoría</th>
                <th className="px-3 py-3 text-left font-semibold">Tamaño</th>
                <th className="px-3 py-3 text-left font-semibold">Activo</th>
                <th className="px-3 py-3 text-left font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredModules.map((m) => (
                <tr key={m.id} className="hover:bg-purple-50/40 transition-colors">
                  <td className="px-3 py-3 text-sm text-gray-500">{m.id}</td>
                  <td className="px-3 py-3">
                    <code className="text-xs bg-purple-50 text-purple-800 px-2 py-0.5 rounded">{m.module_id}</code>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${TYPE_BADGE_COLORS[m.module_type] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                      {m.module_type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-800 font-medium">{m.style_name}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{m.category || 'general'}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{formatBytes(m.html_size)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleToggleActive(m.id!, m.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${m.is_active ? 'bg-purple-600' : 'bg-gray-300'}`}
                      title={m.is_active ? 'Activo · Click para desactivar' : 'Inactivo · Click para activar'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewId(m.id!)}
                        className="p-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModule(m)}
                        className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id!, m.style_name)}
                        className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredModules.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <FileCode className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>No hay módulos. Sube un .html o crea uno manualmente.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de edición/creación */}
      <RAGModuleModal
        isOpen={isModalOpen}
        module={selectedModule}
        isAnalyzing={isAnalyzing}
        analysisResult={analysisResult}
        htmlInput={htmlInput}
        saving={saving}
        onClose={() => { setIsModalOpen(false); setSelectedModule({}); setAnalysisResult(null); setHtmlInput(''); }}
        onSave={handleSaveModule}
        onAnalyze={handleAnalyze}
        onUpdateModule={(m) => setSelectedModule(m)}
        onHtmlInput={setHtmlInput}
      />

      {/* Modal de preview */}
      <RAGModulePreviewModal moduleId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
};
