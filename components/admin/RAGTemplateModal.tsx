import React from 'react';
import { X, Loader2, Save, Sparkles } from 'lucide-react';

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

const JsonField: React.FC<{
  label: string;
  value: object | string;
  onChange: (val: string) => void;
  rows?: number;
}> = ({ label, value, onChange, rows = 3 }) => {
  const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
      />
    </div>
  );
};

export const RAGTemplateModal: React.FC<Props> = ({
  isOpen,
  template,
  isAnalyzing,
  htmlInput,
  saving,
  onClose,
  onSave,
  onAnalyze,
  onUpdateTemplate,
  onHtmlChange
}) => {
  if (!isOpen) return null;

  const update = (field: string, value: any) => {
    onUpdateTemplate({ ...template, [field]: value });
  };

  const tagsDisplay = Array.isArray(template.theme_tags)
    ? template.theme_tags.join(', ')
    : (template.theme_tags || '');

  const cdnsArray: string[] = Array.isArray(template.base_cdns)
    ? template.base_cdns
    : (typeof template.base_cdns === 'string' && template.base_cdns ? JSON.parse(template.base_cdns as string || '[]') : []);

  const jsDepsArray: string[] = Array.isArray(template.js_dependencies)
    ? template.js_dependencies
    : (typeof template.js_dependencies === 'string' && template.js_dependencies ? JSON.parse(template.js_dependencies as string || '[]') : []);

  const toggleCdn = (cdn: string) => {
    const current = cdnsArray.includes(cdn)
      ? cdnsArray.filter((c: string) => c !== cdn)
      : [...cdnsArray, cdn];
    update('base_cdns', current);
  };

  const toggleJsDep = (dep: string) => {
    const current = jsDepsArray.includes(dep)
      ? jsDepsArray.filter((d: string) => d !== dep)
      : [...jsDepsArray, dep];
    update('js_dependencies', current);
  };

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-pink-600 to-purple-600 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <h3 className="text-lg font-bold text-white">
                {template.id ? 'Editar' : 'Nueva'} Plantilla RAG
              </h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Row: Style ID + Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style ID *</label>
                <input
                  type="text"
                  value={template.style_id || ''}
                  onChange={(e) => update('style_id', e.target.value)}
                  placeholder="xv-festivo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={template.style_name || ''}
                  onChange={(e) => update('style_name', e.target.value)}
                  placeholder="XV Años Festivo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={template.description || ''}
                onChange={(e) => update('description', e.target.value)}
                rows={2}
                placeholder="Descripción del estilo visual de esta plantilla..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            {/* Row: Category + Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  value={template.category || 'boda'}
                  onChange={(e) => update('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={tagsDisplay}
                  onChange={(e) => update('theme_tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="xv, fiesta, celebracion"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            {/* JSON Fields: Color Palette + Typography */}
            <div className="grid grid-cols-2 gap-4">
              <JsonField
                label="Color Palette (JSON)"
                value={template.color_palette || {}}
                onChange={(val) => update('color_palette', val)}
                rows={4}
              />
              <JsonField
                label="Typography Scale (JSON)"
                value={template.typography_scale || {}}
                onChange={(val) => update('typography_scale', val)}
                rows={4}
              />
            </div>

            {/* JSON Fields: Layout Rules + Modules Def */}
            <div className="grid grid-cols-2 gap-4">
              <JsonField
                label="Layout Rules (JSON)"
                value={template.layout_rules || {}}
                onChange={(val) => update('layout_rules', val)}
                rows={4}
              />
              <JsonField
                label="Modules Definition (JSON)"
                value={template.modules_def || {}}
                onChange={(val) => update('modules_def', val)}
                rows={4}
              />
            </div>

            {/* CDNs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CDNs Base</label>
              <div className="flex flex-wrap gap-2">
                {CDN_OPTIONS.map(cdn => (
                  <button
                    key={cdn}
                    type="button"
                    onClick={() => toggleCdn(cdn)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      cdnsArray.includes(cdn)
                        ? 'bg-pink-100 border-pink-400 text-pink-700'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cdn}
                  </button>
                ))}
              </div>
            </div>

            {/* JS Dependencies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JS Dependencies</label>
              <div className="flex flex-wrap gap-2">
                {CDN_OPTIONS.filter(c => c !== 'tailwindcss' && c !== 'iconify').map(dep => (
                  <button
                    key={dep}
                    type="button"
                    onClick={() => toggleJsDep(dep)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      jsDepsArray.includes(dep)
                        ? 'bg-purple-100 border-purple-400 text-purple-700'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {dep}
                  </button>
                ))}
              </div>
            </div>

            {/* JSON Fields: Animation Rules + Variation Params */}
            <div className="grid grid-cols-2 gap-4">
              <JsonField
                label="Animation Rules (JSON)"
                value={template.animation_rules || {}}
                onChange={(val) => update('animation_rules', val)}
                rows={4}
              />
              <JsonField
                label="Variation Params (JSON)"
                value={template.variation_params || {}}
                onChange={(val) => update('variation_params', val)}
                rows={4}
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={template.is_active !== 0}
                onChange={(e) => update('is_active', e.target.checked ? 1 : 0)}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Activa</label>
            </div>

            {/* Analyzer Section */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-800 mb-1">Analizador HTML → RAG</h4>
              <p className="text-sm text-gray-500 mb-3">
                Pega código HTML de una invitación existente para extraer su estructura y llenar automáticamente todos los campos usando IA.
              </p>
              <textarea
                value={htmlInput}
                onChange={(e) => onHtmlChange(e.target.value)}
                rows={6}
                placeholder="<html>...</html>"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing || !htmlInput.trim()}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analizando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analizar HTML con IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};