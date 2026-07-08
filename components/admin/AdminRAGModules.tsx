import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';
import {
  getRAGModules,
  getRAGModule,
  createRAGModule,
  updateRAGModule,
  deleteRAGModule,
  uploadRAGModule,
  analyzeModuleHtml,
  RAGModule,
  ModuleAnalysis
} from '../../services/adminService';
import { RAGModuleModal } from './RAGModuleModal';

const MODULE_TYPES = [
  'portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'vestimenta', 'regalos', 'galeria',
  'hospedaje', 'transporte', 'music', 'quotes', 'mensaje', 'pascar', 'mensaje_padres', 'gracias'
];

export const AdminRAGModules: React.FC = () => {
  const [modules, setModules] = useState<RAGModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedModule, setSelectedModule] = useState<Partial<RAGModule> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ModuleAnalysis | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const htmlFileRef = useRef<HTMLInputElement>(null);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filterType !== 'all') filters.module_type = filterType;
      const result = await getRAGModules(filters);
      setModules(result.modules);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [filterType]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadRAGModule(file);
      setMessage({ type: 'success', text: `Módulo "${result.module_id}" subido exitosamente` });
      fetchModules();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      e.target.value = '';
    }
  };

  const handleAnalyze = async (file: File) => {
    setAnalyzing(true);
    try {
      const html = await file.text();
      const result = await analyzeModuleHtml(html);
      setAnalysisResult(result.analysis);
      setHtmlPreview(html);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id: number, moduleName: string) => {
    if (!confirm(`¿Eliminar módulo "${moduleName}"?`)) return;
    try {
      await deleteRAGModule(id);
      setMessage({ type: 'success', text: 'Módulo eliminado' });
      fetchModules();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleToggleActive = async (id: number, current: number) => {
    try {
      await updateRAGModule(id, { is_active: current ? 0 : 1 });
      fetchModules();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
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
      is_active: 1,
      category: 'general'
    });
    setIsModalOpen(true);
  };

  const openEditModule = (module: RAGModule) => {
    setSelectedModule({
      ...module,
      tags: typeof module.tags === 'string' ? JSON.parse(module.tags) : module.tags,
      theme_tags: typeof module.theme_tags === 'string' ? JSON.parse(module.theme_tags) : module.theme_tags,
      color_palette: typeof module.color_palette === 'string' ? JSON.parse(module.color_palette) : module.color_palette,
      css_variables: typeof module.css_variables === 'string' ? JSON.parse(module.css_variables) : module.css_variables
    });
    setIsModalOpen(true);
  };

  const handleSaveModule = async (module: Partial<RAGModule>) => {
    try {
      if (module.id) {
        await updateRAGModule(module.id, module);
        setMessage({ type: 'success', text: 'Módulo actualizado' });
      } else {
        await createRAGModule(module);
        setMessage({ type: 'success', text: 'Módulo creado' });
      }
      fetchModules();
      setIsModalOpen(false);
      setSelectedModule(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Módulos RAG (Piezas)</h2>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".html"
            ref={htmlFileRef}
            onChange={(e) => e.target.files?.[0] && handleAnalyze(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => htmlFileRef.current?.click()}
            disabled={analyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Upload size={18} />
            {analyzing ? 'Analizando...' : 'Analizar HTML'}
          </button>
          <button
            onClick={() => htmlFileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Upload size={18} />
            {uploading ? 'Subiendo...' : 'Subir Módulo'}
          </button>
          <button
            onClick={openNewModule}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Nuevo Módulo
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right"><X size={16} /></button>
        </div>
      )}

      {analysisResult && (
        <div className="bg-gray-50 p-4 mb-6 rounded border">
          <h3 className="text-lg font-bold mb-2">Resultado del Análisis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Module ID</p>
              <p className="font-mono">{analysisResult.module_id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Module Type</p>
              <p className="font-mono">{analysisResult.module_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tags</p>
              <p className="text-sm">{analysisResult.tags?.join(', ') || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Descripción</p>
              <p className="text-sm">{analysisResult.descripcion_larga?.slice(0, 100) || 'N/A'}...</p>
            </div>
          </div>
          {analysisResult.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-red-600 font-bold">Errores:</p>
              <ul className="list-disc list-inside text-red-600">
                {analysisResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {analysisResult.warnings.length > 0 && (
            <div className="mt-2">
              <p className="text-yellow-600 font-bold">Advertencias:</p>
              <ul className="list-disc list-inside text-yellow-600">
                {analysisResult.warnings.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                if (analysisResult.module_id && htmlPreview) {
                  handleUpload(new Blob([htmlPreview], { type: 'text/html' }) as File);
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Guardar Módulo
            </button>
            <button onClick={() => { setAnalysisResult(null); setHtmlPreview(''); }} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="mr-2 font-medium">Filtrar por tipo:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option value="all">Todos</option>
          {MODULE_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Cargando módulos...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Module ID</th>
                <th className="border p-2 text-left">Tipo</th>
                <th className="border p-2 text-left">Nombre</th>
                <th className="border p-2 text-left">Tags</th>
                <th className="border p-2 text-left">HTML Size</th>
                <th className="border p-2 text-left">Activo</th>
                <th className="border p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="border p-2">{m.id}</td>
                  <td className="border p-2 font-mono text-sm">{m.module_id}</td>
                  <td className="border p-2">{m.module_type}</td>
                  <td className="border p-2">{m.style_name}</td>
                  <td className="border p-2 text-xs">{Array.isArray(m.tags) ? m.tags.slice(0, 3).join(', ') + (m.tags.length > 3 ? '...' : '') : ''}</td>
                  <td className="border p-2 text-sm">{m.html_size ? `${(m.html_size / 1024).toFixed(1)} KB` : '—'}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleToggleActive(m.id!, m.is_active)}
                      className={`px-2 py-1 rounded text-sm ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {m.is_active ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="border p-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEditModule(m)} className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Editar</button>
                      <button onClick={() => handleDelete(m.id!, m.style_name)} className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={8} className="border p-4 text-center text-gray-500">
                    No hay módulos. Sube el primero con "Subir Módulo" o "Analizar HTML".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && selectedModule && (
        <RAGModuleModal
          module={selectedModule}
          onSave={handleSaveModule}
          onClose={() => { setIsModalOpen(false); setSelectedModule(null); }}
        />
      )}
    </div>
  );
};