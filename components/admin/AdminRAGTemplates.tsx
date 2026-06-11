import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, BookOpen } from 'lucide-react';
import { getRAGTemplates, createRAGTemplate, updateRAGTemplate, deleteRAGTemplate, analyzeRAGHtml } from '../../services/adminService';
import { RAGTemplateModal } from './RAGTemplateModal';

interface TemplateData {
  id?: number;
  style_id: string;
  style_name: string;
  description: string;
  category: string;
  theme_tags: string[] | string;
  color_palette: object | string;
  typography_scale: object | string;
  layout_rules: object | string;
  modules_def: object | string;
  base_cdns: string[] | string;
  js_dependencies: string[] | string;
  animation_rules: object | string;
  variation_params: object | string;
  is_active: number;
}

const emptyTemplate: Partial<TemplateData> = {
  style_id: '',
  style_name: '',
  description: '',
  category: 'boda',
  theme_tags: [],
  color_palette: {},
  typography_scale: {},
  layout_rules: {},
  modules_def: {},
  base_cdns: ['tailwindcss'],
  js_dependencies: [],
  animation_rules: {},
  variation_params: {},
  is_active: 1
};

export const AdminRAGTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Partial<TemplateData>>(emptyTemplate);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [htmlInput, setHtmlInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await getRAGTemplates();
      const processed = result.templates.map((t: any) => ({
        ...t,
        color_palette: typeof t.color_palette === 'string' ? t.color_palette : JSON.stringify(t.color_palette || {}),
        typography_scale: typeof t.typography_scale === 'string' ? t.typography_scale : JSON.stringify(t.typography_scale || {}),
        layout_rules: typeof t.layout_rules === 'string' ? t.layout_rules : JSON.stringify(t.layout_rules || {}),
        modules_def: typeof t.modules_def === 'string' ? t.modules_def : JSON.stringify(t.modules_def || {}),
        animation_rules: typeof t.animation_rules === 'string' ? t.animation_rules : JSON.stringify(t.animation_rules || {}),
        variation_params: typeof t.variation_params === 'string' ? t.variation_params : JSON.stringify(t.variation_params || {}),
        theme_tags: Array.isArray(t.theme_tags) ? t.theme_tags : [],
        base_cdns: Array.isArray(t.base_cdns) ? t.base_cdns : [],
        js_dependencies: Array.isArray(t.js_dependencies) ? t.js_dependencies : []
      }));
      setTemplates(processed);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al cargar plantillas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = () => {
    setSelectedTemplate({ ...emptyTemplate });
    setAnalysisResult(null);
    setHtmlInput('');
    setIsModalOpen(true);
  };

  const handleEdit = (template: TemplateData) => {
    setSelectedTemplate({ ...template });
    setAnalysisResult(null);
    setHtmlInput('');
    setIsModalOpen(true);
  };

  const analyzeHtml = async () => {
    if (!htmlInput.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeRAGHtml(htmlInput, selectedTemplate.style_name || 'auto');
      const a = result.analysis;
      setAnalysisResult(a);
      setSelectedTemplate(prev => ({
        ...prev,
        style_id: (!prev.style_id && a.style_id) ? a.style_id : prev.style_id,
        style_name: (!prev.style_name || prev.style_name === '') ? (a.style_name || a.style_id || '') : prev.style_name,
        description: a.description || prev.description,
        category: a.category || prev.category,
        theme_tags: a.theme_tags && a.theme_tags.length > 0 ? a.theme_tags : prev.theme_tags,
        color_palette: a.color_palette && Object.keys(a.color_palette).length > 0 ? a.color_palette : prev.color_palette,
        typography_scale: a.typography_scale && Object.keys(a.typography_scale).length > 0 ? a.typography_scale : prev.typography_scale,
        layout_rules: a.layout_rules && Object.keys(a.layout_rules).length > 0 ? a.layout_rules : prev.layout_rules,
        modules_def: a.modules_def && Object.keys(a.modules_def).length > 0 ? a.modules_def : prev.modules_def,
        base_cdns: a.base_cdns && a.base_cdns.length > 0 ? a.base_cdns : prev.base_cdns,
        js_dependencies: a.js_dependencies && a.js_dependencies.length > 0 ? a.js_dependencies : prev.js_dependencies,
        animation_rules: a.animation_rules && Object.keys(a.animation_rules).length > 0 ? a.animation_rules : prev.animation_rules,
        variation_params: a.variation_params && Object.keys(a.variation_params).length > 0 ? a.variation_params : prev.variation_params
      }));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al analizar HTML' });
    }
    setIsAnalyzing(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate.style_id || !selectedTemplate.style_name || !selectedTemplate.category) {
      setMessage({ type: 'error', text: 'Faltan campos requeridos' });
      return;
    }

    setSaving(true);
    try {
      const templateToSave = {
        ...selectedTemplate,
        theme_tags: Array.isArray(selectedTemplate.theme_tags) 
          ? selectedTemplate.theme_tags 
          : (typeof selectedTemplate.theme_tags === 'string' ? selectedTemplate.theme_tags : []),
        color_palette: typeof selectedTemplate.color_palette === 'string' ? selectedTemplate.color_palette : JSON.stringify(selectedTemplate.color_palette || {}),
        typography_scale: typeof selectedTemplate.typography_scale === 'string' ? selectedTemplate.typography_scale : JSON.stringify(selectedTemplate.typography_scale || {}),
        layout_rules: typeof selectedTemplate.layout_rules === 'string' ? selectedTemplate.layout_rules : JSON.stringify(selectedTemplate.layout_rules || {}),
        modules_def: typeof selectedTemplate.modules_def === 'string' ? selectedTemplate.modules_def : JSON.stringify(selectedTemplate.modules_def || {}),
        base_cdns: Array.isArray(selectedTemplate.base_cdns) ? selectedTemplate.base_cdns : [],
        js_dependencies: Array.isArray(selectedTemplate.js_dependencies) ? selectedTemplate.js_dependencies : [],
        animation_rules: typeof selectedTemplate.animation_rules === 'string' ? selectedTemplate.animation_rules : JSON.stringify(selectedTemplate.animation_rules || {}),
        variation_params: typeof selectedTemplate.variation_params === 'string' ? selectedTemplate.variation_params : JSON.stringify(selectedTemplate.variation_params || {})
      };

      if (selectedTemplate.id) {
        await updateRAGTemplate(selectedTemplate.id, templateToSave);
      } else {
        await createRAGTemplate(templateToSave);
      }
      setMessage({ type: 'success', text: 'Plantilla guardada correctamente' });
      setIsModalOpen(false);
      fetchTemplates();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    
    try {
      await deleteRAGTemplate(id);
      setMessage({ type: 'success', text: 'Plantilla eliminada' });
      fetchTemplates();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al eliminar' });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleUpdateTemplate = (template: Partial<TemplateData>) => {
    setSelectedTemplate(template);
  };

  const handleHtmlChange = (html: string) => {
    setHtmlInput(html);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Plantillas RAG</h2>
            <p className="text-sm text-gray-500">Base de conocimiento para generación de invitaciones</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Grid de plantillas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-purple-300 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{template.style_name}</h3>
                  <p className="text-xs text-gray-500">{template.style_id}</p>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => template.id && handleDelete(template.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal separado */}
      <RAGTemplateModal
        isOpen={isModalOpen}
        template={selectedTemplate}
        isAnalyzing={isAnalyzing}
        analysisResult={analysisResult}
        htmlInput={htmlInput}
        saving={saving}
        onClose={handleCloseModal}
        onSave={handleSave}
        onAnalyze={analyzeHtml}
        onUpdateTemplate={handleUpdateTemplate}
        onHtmlChange={handleHtmlChange}
      />
    </div>
  );
};