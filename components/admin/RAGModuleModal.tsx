import React, { useRef } from 'react';
import { X, Loader2, Save, Sparkles, Upload, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { RAGModule, ModuleAnalysis } from '../../services/adminService';

export const MODULE_CATEGORIES = ['general', 'boda', 'xv-anos', 'cumpleanos', 'bautizo', 'primera-comunion', 'confirmacion', 'baby-shower', 'otro'];
export const MODULE_TYPES = [
  'portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'vestimenta', 'regalos', 'galeria',
  'hospedaje', 'transporte', 'music', 'quotes', 'mensaje', 'pascar', 'mensaje_padres', 'gracias'
];

interface ModuleData extends Partial<RAGModule> {
  descripcion_larga?: string;
}

interface Props {
  isOpen: boolean;
  module: Partial<ModuleData>;
  isAnalyzing: boolean;
  analysisResult: ModuleAnalysis | null;
  htmlInput: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onAnalyze: () => void;
  onUpdateModule: (module: Partial<ModuleData>) => void;
  onHtmlInput: (html: string) => void;
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      />
    </div>
  );
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const RAGModuleModal: React.FC<Props> = ({
  isOpen,
  module,
  isAnalyzing,
  analysisResult,
  htmlInput,
  saving,
  onClose,
  onSave,
  onAnalyze,
  onUpdateModule,
  onHtmlInput
}) => {
  const htmlFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const update = (field: string, value: any) => {
    onUpdateModule({ ...module, [field]: value });
  };

  const tagsDisplay = Array.isArray(module.tags)
    ? module.tags.join(', ')
    : (module.tags && typeof module.tags === 'string' ? module.tags : '');

  const themeTagsDisplay = Array.isArray(module.theme_tags)
    ? module.theme_tags.join(', ')
    : (module.theme_tags && typeof module.theme_tags === 'string' ? module.theme_tags : '');

  const handleHtmlFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      update('html_content', content);
    };
    reader.readAsText(file);
  };

  const htmlContentSize = module.html_content ? new Blob([module.html_content]).size : 0;

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-purple-600 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <h3 className="text-lg font-bold text-white">
                {module.id ? 'Editar' : 'Nuevo'} Módulo RAG
              </h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Row: Module ID + Module Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module ID *</label>
                <input
                  type="text"
                  value={module.module_id || ''}
                  onChange={(e) => update('module_id', e.target.value)}
                  placeholder="portada-nombre"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module Type *</label>
                <select
                  value={module.module_type || 'portada'}
                  onChange={(e) => update('module_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {MODULE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Style Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style Name *</label>
              <input
                type="text"
                value={module.style_name || ''}
                onChange={(e) => update('style_name', e.target.value)}
                placeholder="Portada Castillo con Fotos"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={module.description || ''}
                onChange={(e) => update('description', e.target.value)}
                rows={2}
                placeholder="Descripción breve del propósito visual del módulo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Row: Category + Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={module.category || 'general'}
                  onChange={(e) => update('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {MODULE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separados por coma)</label>
                <input
                  type="text"
                  value={tagsDisplay}
                  onChange={(e) => update('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                  placeholder="portada, boda, hero"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Theme Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme Tags (separados por coma)</label>
              <input
                type="text"
                value={themeTagsDisplay}
                onChange={(e) => update('theme_tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                placeholder="elegante, moderno, animado"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* JSON Fields: Color Palette + CSS Variables */}
            <div className="grid grid-cols-2 gap-4">
              <JsonField
                label="Color Palette (JSON)"
                value={module.color_palette || {}}
                onChange={(val) => update('color_palette', val)}
                rows={4}
              />
              <JsonField
                label="CSS Variables (JSON)"
                value={module.css_variables || {}}
                onChange={(val) => update('css_variables', val)}
                rows={4}
              />
            </div>

            {/* JSON Fields: Memory Sources */}
            <JsonField
              label="Memory Sources (JSON)"
              value={module.memory_sources || {}}
              onChange={(val) => update('memory_sources', val)}
              rows={2}
            />

            {/* HTML Content (con file upload + preview size) */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-gray-800 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-600" />
                  HTML Content del Módulo
                </h4>
                {htmlContentSize > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {formatBytes(htmlContentSize)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3">
                HTML del módulo individual (un&nbsp;
                <code className="text-xs bg-gray-100 px-1 rounded">{'<section data-gemini-id="...">'}</code>
                &nbsp;con su&nbsp;
                <code className="text-xs bg-gray-100 px-1 rounded">moduleMetadata</code>
                &nbsp;embebido).
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  ref={htmlFileRef}
                  type="file"
                  accept=".html,.htm"
                  onChange={handleHtmlFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => htmlFileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Subir .html
                </button>
                {module.html_content && (
                  <button
                    type="button"
                    onClick={() => update('html_content', null)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                    <X className="w-4 h-4" />
                    Quitar HTML
                  </button>
                )}
              </div>
              <textarea
                value={module.html_content || ''}
                onChange={(e) => update('html_content', e.target.value)}
                rows={6}
                placeholder="<!-- Pega o sube el HTML del módulo aquí -->"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="module_is_active"
                checked={module.is_active !== 0}
                onChange={(e) => update('is_active', e.target.checked ? 1 : 0)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="module_is_active" className="text-sm font-medium text-gray-700">Activo</label>
            </div>

            {/* Analyzer Section */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-800 mb-1">Analizador HTML → Módulo RAG</h4>
              <p className="text-sm text-gray-500 mb-3">
                Pega código HTML de un módulo individual para extraer su metadata automáticamente usando IA (Gemini) con regex fallback.
              </p>
              <textarea
                value={htmlInput}
                onChange={(e) => onHtmlInput(e.target.value)}
                rows={6}
                placeholder='<section data-gemini-id="portada-nombre">...</section>'
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing || !htmlInput.trim()}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

              {analysisResult && (
                <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    {analysisResult.is_valid ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h5 className="font-medium text-gray-800">Resultado del Análisis {analysisResult.llm_used && '(IA)'}</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Module ID</p>
                      <p className="font-mono">{analysisResult.module_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Module Type</p>
                      <p className="font-mono">{analysisResult.module_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tags</p>
                      <p>{analysisResult.tags?.join(', ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">HTML Size</p>
                      <p>{formatBytes(analysisResult.html_size || 0)}</p>
                    </div>
                  </div>
                  {analysisResult.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-red-600 text-xs font-bold mb-1">Errores:</p>
                      <ul className="text-xs text-red-600 list-disc list-inside">
                        {analysisResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                  {analysisResult.warnings.length > 0 && (
                    <div className="mt-2">
                      <p className="text-yellow-600 text-xs font-bold mb-1">Advertencias:</p>
                      <ul className="text-xs text-yellow-600 list-disc list-inside">
                        {analysisResult.warnings.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
