import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Save, X, Upload, Loader2, BookOpen } from 'lucide-react';
import { getRAGTemplates, createRAGTemplate, updateRAGTemplate, deleteRAGTemplate, analyzeRAGHtml, RAGTemplate } from '../../services/adminService';

const CATEGORIES = ['boda', 'xv-años', 'cumpleaños', 'bautizo', 'comunion', 'baby-shower', 'otro'];
const CDN_OPTIONS = ['tailwindcss', 'iconify', 'gsap', 'scrolltrigger', 'three', 'animejs', 'tsparticles'];

const emptyTemplate: Partial<RAGTemplate> = {
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
  const [templates, setTemplates] = useState<RAGTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Partial<RAGTemplate>>(emptyTemplate);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [htmlInput, setHtmlInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await getRAGTemplates();
      // Convertir campos JSON a strings para los textareas
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
    setIsEditing(true);
    setAnalysisResult(null);
    setHtmlInput('');
  };

  const handleEdit = (template: RAGTemplate) => {
    setSelectedTemplate({ ...template });
    setIsEditing(true);
    setAnalysisResult(null);
    setHtmlInput('');
  };

  const analyzeHtml = async () => {
    if (!htmlInput || !selectedTemplate.style_name) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeRAGHtml(htmlInput, selectedTemplate.style_name);
      setAnalysisResult(result.analysis);
      
      // Auto-fill con resultado del análisis
      setSelectedTemplate(prev => ({
        ...prev,
        style_id: result.analysis.style_id,
        base_cdns: result.analysis.base_cdns,
        color_palette: result.analysis.color_palette,
        typography_scale: result.analysis.typography_scale,
        modules_def: result.analysis.modules_def,
        animation_rules: result.analysis.animation_rules,
        variation_params: result.analysis.variation_params
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
      // Parsear JSON strings antes de enviar
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
      setIsEditing(false);
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Plantillas RAG</h2>
            <p className="text-sm text-gray-500">Base de conocimiento para generación de invitaciones</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all"
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
                  <Edit className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => template.id && handleDelete(template.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"
                >
                  <Trash2 className="w-3 h-3" />Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isEditing && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto m-4">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {selectedTemplate.id ? 'Editar' : 'Nueva'} Plantilla RAG
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Style ID *</label>
                  <input
                    value={selectedTemplate.style_id || ''}
                    onChange={e => setSelectedTemplate({...selectedTemplate, style_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="xv-festivo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre *</label>
                  <input
                    value={selectedTemplate.style_name || ''}
                    onChange={e => setSelectedTemplate({...selectedTemplate, style_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="XV Años Festivo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={selectedTemplate.description || ''}
                  onChange={e => setSelectedTemplate({...selectedTemplate, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría *</label>
                  <select
                    value={selectedTemplate.category || 'boda'}
                    onChange={e => setSelectedTemplate({...selectedTemplate, category: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Etiquetas (comma separated)</label>
                  <input
                    value={Array.isArray(selectedTemplate.theme_tags) ? selectedTemplate.theme_tags.join(', ') : (selectedTemplate.theme_tags || '')}
                    onChange={e => setSelectedTemplate({
                      ...selectedTemplate,
                      theme_tags: typeof selectedTemplate.theme_tags === 'string' 
                        ? e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        : e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="xv, fiesta, celebracion"
                  />
                </div>
              </div>

              {/* Analizador HTML */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Analizador HTML → RAG</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Pega código HTML para extraer estructura automáticamente
                </p>
                <textarea
                  value={htmlInput}
                  onChange={e => setHtmlInput(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={6}
                  placeholder="<html>...</html>"
                />
                <button
                  onClick={analyzeHtml}
                  disabled={isAnalyzing || !htmlInput}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isAnalyzing ? 'Analizando...' : 'Analizar HTML'}
                </button>
              </div>

              {/* CDNs */}
              <div>
                <label className="block text-sm font-medium mb-2">CDNs Requeridos</label>
                <div className="flex flex-wrap gap-2">
                  {CDN_OPTIONS.map(cdn => {
                    const currentCdns = Array.isArray(selectedTemplate.base_cdns) ? selectedTemplate.base_cdns : [];
                    return (
                    <label key={cdn} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={currentCdns.includes(cdn)}
                        onChange={e => {
                          const newCdns = e.target.checked
                            ? [...currentCdns, cdn]
                            : currentCdns.filter(c => c !== cdn);
                          setSelectedTemplate({...selectedTemplate, base_cdns: newCdns});
                        }}
                      />
                      {cdn}
                    </label>
                    );
                  })}
                </div>
              </div>

              {/* JSON Editors */}
<div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Color Palette (JSON)</label>
                  <textarea
                    value={typeof selectedTemplate.color_palette === 'string' ? selectedTemplate.color_palette : JSON.stringify(selectedTemplate.color_palette || {}, null, 2)}
                    onChange={e => setSelectedTemplate({...selectedTemplate, color_palette: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                    rows={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Typography (JSON)</label>
                  <textarea
                    value={typeof selectedTemplate.typography_scale === 'string' ? selectedTemplate.typography_scale : JSON.stringify(selectedTemplate.typography_scale || {}, null, 2)}
                    onChange={e => setSelectedTemplate({...selectedTemplate, typography_scale: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                    rows={5}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Modules Def (JSON)</label>
                <textarea
                  value={typeof selectedTemplate.modules_def === 'string' ? selectedTemplate.modules_def : JSON.stringify(selectedTemplate.modules_def || {}, null, 2)}
                  onChange={e => setSelectedTemplate({...selectedTemplate, modules_def: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={6}
                />
              </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Typography (JSON)</label>
                  <textarea
                    value={JSON.stringify(selectedTemplate.typography_scale || {}, null, 2)}
                    onChange={e => {
                      try {
                        setSelectedTemplate({
                          ...selectedTemplate,
                          typography_scale: typeof e.target.value === 'object' ? e.target.value : JSON.parse(e.target.value || '{}')
                        });
                      } catch {
                        setSelectedTemplate({
                          ...selectedTemplate,
                          typography_scale: {}
                        });
                      }
                    }}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                    rows={5}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Modules Def (JSON)</label>
                <textarea
                  value={JSON.stringify(selectedTemplate.modules_def || {}, null, 2)}
                  onChange={e => {
                    try {
                      setSelectedTemplate({
                        ...selectedTemplate,
                        modules_def: JSON.parse(e.target.value)
                      });
                    } catch {}
                  }}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={6}
                />
              </div>

<div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Typography (JSON)</label>
                  <textarea
                    value={typeof selectedTemplate.typography_scale === 'string' ? selectedTemplate.typography_scale : JSON.stringify(selectedTemplate.typography_scale || {}, null, 2)}
                    onChange={e => setSelectedTemplate({...selectedTemplate, typography_scale: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                    rows={5}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Modules Def (JSON)</label>
                <textarea
                  value={typeof selectedTemplate.modules_def === 'string' ? selectedTemplate.modules_def : JSON.stringify(selectedTemplate.modules_def || {}, null, 2)}
                  onChange={e => setSelectedTemplate({...selectedTemplate, modules_def: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Animation Rules (JSON)</label>
                  <textarea
                    value={typeof selectedTemplate.animation_rules === 'string' ? selectedTemplate.animation_rule : JSON.stringify(selectedTemplate.animation_rules || {}, null, 2)}
                    onChange={e => setSelectedTemplate({...selectedTemplate, animation_rules: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                    rows={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Variation Params (JSON)</label>
                  <textarea
                    value={typeof selectedTemplate.variation_params === 'string' ? selectedTemplate.variation_params : JSON.stringify(selectedTemplate.variation_params || {}, null, 2)}
                    onChange={e => setSelectedTemplate({...selectedTemplate, variation_params: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                    rows={5}
                  />
                </div>
              </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Variation Params (JSON)</label>
                  <textarea
                    value={JSON.stringify(selectedTemplate.variation_params || {}, null, 2)}
                    onChange={e => {
                      try {
                        setSelectedTemplate({
                          ...selectedTemplate,
                          variation_params: JSON.parse(e.target.value)
                        });
                      } catch {}
                    }}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                    rows={5}
                  />
                </div>
              </div>

              {/* Resultado análisis */}
              {analysisResult && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 text-green-600">Análisis completado:</h4>
                  <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(analysisResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};