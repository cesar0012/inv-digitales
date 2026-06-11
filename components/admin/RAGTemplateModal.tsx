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
    <>
      {/* Overlay con z-index alto */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.5)'
        }}
        onClick={onClose}
      />
      
      {/* Contenedor del modal con z-index alto */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '56rem',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '2rem'
        }}>
          {/* Header */}
          <div style={{
            flexShrink: 0,
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #9333ea, #4f46e5)',
            borderTopLeftRadius: '0.75rem',
            borderTopRightRadius: '0.75rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'white',
              margin: 0
            }}>
              {template.id ? 'Editar' : 'Nueva'} Plantilla RAG
            </h3>
            <button 
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Style ID *</label>
                <input
                  value={template.style_id || ''}
                  onChange={e => onUpdateTemplate({...template, style_id: e.target.value})}
                  style={{
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem'
                  }}
                  placeholder="xv-festivo"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Nombre *</label>
                <input
                  value={template.style_name || ''}
                  onChange={e => onUpdateTemplate({...template, style_name: e.target.value})}
                  style={{
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem'
                  }}
                  placeholder="XV Años Festivo"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Descripción</label>
              <textarea
                value={template.description || ''}
                onChange={e => onUpdateTemplate({...template, description: e.target.value})}
                style={{
                  width: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem'
                }}
                rows={2}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Categoría *</label>
                <select
                  value={template.category || 'boda'}
                  onChange={e => onUpdateTemplate({...template, category: e.target.value})}
                  style={{
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem'
                  }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Etiquetas</label>
                <input
                  value={themeTagsValue}
                  onChange={e => onUpdateTemplate({
                    ...template,
                    theme_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  style={{
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem'
                  }}
                  placeholder="xv, fiesta, celebracion"
                />
              </div>
            </div>

            {/* HTML Analyzer */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <h4 style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Analizador HTML → RAG</h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Pega código HTML para extraer estructura automáticamente
              </p>
              <textarea
                value={htmlInput}
                onChange={e => onHtmlChange(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}
                rows={6}
                placeholder="<html>...</html>"
              />
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing || !htmlInput}
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#9333ea',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: isAnalyzing || !htmlInput ? 'not-allowed' : 'pointer',
                  opacity: isAnalyzing || !htmlInput ? 0.5 : 1
                }}
              >
                {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAnalyzing ? 'Analizando...' : 'Analizar HTML'}
              </button>
            </div>

            {/* CDNs */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>CDNs Requeridos</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CDN_OPTIONS.map(cdn => {
                  const currentCdns = Array.isArray(template.base_cdns) ? template.base_cdns : [];
                  return (
                    <label key={cdn} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#f3f4f6', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
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

            {/* Analysis Result */}
            {analysisResult && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <h4 style={{ fontWeight: 500, marginBottom: '0.5rem', color: '#16a34a' }}>Análisis completado:</h4>
                <pre style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', overflow: 'auto', maxHeight: '10rem' }}>
                  {JSON.stringify(analysisResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            flexShrink: 0,
            padding: '1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#9333ea',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};