import React from 'react';
import { X, Upload, Loader2, Save } from 'lucide-react';

const CATEGORIES = ['boda', 'xv-años', 'cumpleaños', 'bautizo', 'comunion', 'baby-shower', 'otro'];
const CDN_OPTIONS = ['tailwindcss', 'iconify', 'gsap', 'scrolltrigger', 'three', 'animejs', 'tsparticles'];

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

interface Props {
  isOpen: boolean;
  template: Partial<TemplateData>;
  isAnalyzing: boolean;
  analysisResult: any;
  htmlInput: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onAnalyze: () => void;
  onUpdateTemplate: (template: Partial<TemplateData>) => void;
  onHtmlChange: (html: string) => void;
}

export const RAGTemplateModal: React.FC<Props> = ({
  isOpen,
  template,
  isAnalyzing,
  analysisResult,
  htmlInput,
  saving,
  onClose,
  onSave,
  onAnalyze,
  onUpdateTemplate,
  onHtmlChange
}) => {
  if (!isOpen) return null;

  const themeTagsValue = Array.isArray(template.theme_tags) 
    ? template.theme_tags.join(', ') 
    : (template.theme_tags || '');

  return (
    <div className="fixed inset-0 z-50 overflow-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-full flex items-start justify-center py-8 px-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b flex items-center justify-between bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-xl">
            <h3 className="text-lg font-bold text-white">
              {template.id ? 'Editar' : 'Nueva'} Plantilla RAG
            </h3>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Style ID *</label>
                <input
                  value={template.style_id || ''}
                  onChange={e => onUpdateTemplate({...template, style_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="xv-festivo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  value={template.style_name || ''}
                  onChange={e => onUpdateTemplate({...template, style_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="XV Años Festivo"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={template.description || ''}
                onChange={e => onUpdateTemplate({...template, description: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Categoría *</label>
                <select
                  value={template.category || 'boda'}
                  onChange={e => onUpdateTemplate({...template, category: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Etiquetas</label>
                <input
                  value={themeTagsValue}
                  onChange={e => onUpdateTemplate({
                    ...template,
                    theme_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="xv, fiesta, celebracion"
                />
              </div>
            </div>

            {/* HTML Analyzer */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Analizador HTML → RAG</h4>
              <p className="text-sm text-gray-600 mb-2">
                Pega código HTML para extraer estructura automáticamente
              </p>
              <textarea
                value={htmlInput}
                onChange={e => onHtmlChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                rows={6}
                placeholder="<html>...</html>"
              />
              <button
                onClick={onAnalyze}
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
                  const currentCdns = Array.isArray(template.base_cdns) ? template.base_cdns : [];
                  return (
                    <label key={cdn} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={currentCdns.includes(cdn)}
                        onChange={e => {
                          const newCdns = e.target.checked
                            ? [...currentCdns, cdn]
                            : currentCdns.filter(c => c !== cdn);
                          onUpdateTemplate({...template, base_cdns: newCdns});
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
                  value={typeof template.color_palette === 'string' ? template.color_palette : JSON.stringify(template.color_palette || {}, null, 2)}
                  onChange={e => onUpdateTemplate({...template, color_palette: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Typography (JSON)</label>
                <textarea
                  value={typeof template.typography_scale === 'string' ? template.typography_scale : JSON.stringify(template.typography_scale || {}, null, 2)}
                  onChange={e => onUpdateTemplate({...template, typography_scale: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={5}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Modules Def (JSON)</label>
              <textarea
                value={typeof template.modules_def === 'string' ? template.modules_def : JSON.stringify(template.modules_def || {}, null, 2)}
                onChange={e => onUpdateTemplate({...template, modules_def: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Animation Rules (JSON)</label>
                <textarea
                  value={typeof template.animation_rules === 'string' ? template.animation_rules : JSON.stringify(template.animation_rules || {}, null, 2)}
                  onChange={e => onUpdateTemplate({...template, animation_rules: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Variation Params (JSON)</label>
                <textarea
                  value={typeof template.variation_params === 'string' ? template.variation_params : JSON.stringify(template.variation_params || {}, null, 2)}
                  onChange={e => onUpdateTemplate({...template, variation_params: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  rows={5}
                />
              </div>
            </div>

            {/* Analysis Result */}
            {analysisResult && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 text-green-600">Análisis completado:</h4>
                <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-40">
                  {JSON.stringify(analysisResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-6 border-t flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};