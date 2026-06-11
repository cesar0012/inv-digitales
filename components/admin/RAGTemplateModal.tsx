import React, { useEffect, useRef } from 'react';
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

// References para el modal nativo
let modalContainer: HTMLDivElement | null = null;

function createModalElement(props: Props): HTMLDivElement {
  const { 
    template, isAnalyzing, analysisResult, htmlInput, saving,
    onClose, onSave, onAnalyze, onUpdateTemplate, onHtmlChange 
  } = props;

  // Crear contenedor principal
  const container = document.createElement('div');
  container.id = 'rag-modal-wrapper';
  container.style.cssText = 'position:fixed;inset:0;z-index:999999;pointer-events:auto';

  // Overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5)';
  overlay.onclick = onClose;

  // Modal wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem';

  // Modal content
  const modal = document.createElement('div');
  modal.style.cssText = 'background:white;border-radius:0.75rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:56rem;max-height:90vh;overflow:hidden;display:flex;flex-direction:column';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding:1.5rem;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#db2777;border-radius:0.75rem 0.75rem 0 0';
  header.innerHTML = `<h3 style="margin:0;font-size:1.125rem;font-weight:700;color:white">${template.id ? 'Editar' : 'Nueva'} Plantilla RAG</h3>`;
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'background:none;border:none;color:white;font-size:1.25rem;cursor:pointer;padding:0.25rem';
  closeBtn.onclick = onClose;
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1rem';

  // Style ID input
  const row1 = document.createElement('div');
  row1.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:1rem';
  const styleIdWrap = document.createElement('div');
  styleIdWrap.innerHTML = '<label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem">Style ID *</label>';
  const styleId = document.createElement('input');
  styleId.value = template.style_id || '';
  styleId.placeholder = 'xv-festivo';
  styleId.style.cssText = 'width:100%;border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.5rem 0.75rem';
  styleId.oninput = (e) => onUpdateTemplate({...template, style_id: (e.target as HTMLInputElement).value});
  styleIdWrap.appendChild(styleId);
  const nameWrap = document.createElement('div');
  nameWrap.innerHTML = '<label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem">Nombre *</label>';
  const nameIn = document.createElement('input');
  nameIn.value = template.style_name || '';
  nameIn.placeholder = 'XV Años Festivo';
  nameIn.style.cssText = 'width:100%;border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.5rem 0.75rem';
  nameIn.oninput = (e) => onUpdateTemplate({...template, style_name: (e.target as HTMLInputElement).value});
  nameWrap.appendChild(nameIn);
  row1.appendChild(styleIdWrap);
  row1.appendChild(nameWrap);
  body.appendChild(row1);

  // Description
  const descWrap = document.createElement('div');
  descWrap.innerHTML = '<label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem">Descripción</label>';
  const descIn = document.createElement('textarea');
  descIn.value = template.description || '';
  descIn.rows = 2;
  descIn.style.cssText = 'width:100%;border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.5rem 0.75rem';
  descIn.oninput = (e) => onUpdateTemplate({...template, description: (e.target as HTMLTextAreaElement).value});
  descWrap.appendChild(descIn);
  body.appendChild(descWrap);

  // Category & Tags
  const row2 = document.createElement('div');
  row2.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:1rem';
  const catWrap = document.createElement('div');
  catWrap.innerHTML = '<label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem">Categoría *</label>';
  const catSel = document.createElement('select');
  catSel.value = template.category || 'boda';
  catSel.style.cssText = 'width:100%;border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.5rem 0.75rem';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    if (c === template.category) opt.selected = true;
    catSel.appendChild(opt);
  });
  catSel.onchange = (e) => onUpdateTemplate({...template, category: (e.target as HTMLSelectElement).value});
  catWrap.appendChild(catSel);
  const tagsWrap = document.createElement('div');
  tagsWrap.innerHTML = '<label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem">Etiquetas</label>';
  const tagsIn = document.createElement('input');
  const tagsVal = Array.isArray(template.theme_tags) ? template.theme_tags.join(', ') : (template.theme_tags || '');
  tagsIn.value = tagsVal;
  tagsIn.placeholder = 'xv, fiesta, celebracion';
  tagsIn.style.cssText = 'width:100%;border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.5rem 0.75rem';
  tagsIn.oninput = (e) => onUpdateTemplate({...template, theme_tags: (e.target as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean)});
  tagsWrap.appendChild(tagsIn);
  row2.appendChild(catWrap);
  row2.appendChild(tagsWrap);
  body.appendChild(row2);

  // Analyzer
  const analyzer = document.createElement('div');
  analyzer.style.cssText = 'border-top:1px solid #e5e7eb;padding-top:1rem';
  analyzer.innerHTML = '<h4 style="font-weight:500;margin:0 0 0.5rem">Analizador HTML → RAG</h4><p style="font-size:0.875rem;color:#6b7280;margin:0 0 0.5rem">Pega código HTML para extraer estructura</p>';
  const htmlArea = document.createElement('textarea');
  htmlArea.value = htmlInput;
  htmlArea.rows = 6;
  htmlArea.placeholder = '<html>...</html>';
  htmlArea.style.cssText = 'width:100%;border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.5rem;font-family:monospace;font-size:0.75rem';
  htmlArea.oninput = (e) => onHtmlChange((e.target as HTMLTextAreaElement).value);
  analyzer.appendChild(htmlArea);
  const analyzeBtn = document.createElement('button');
  analyzeBtn.textContent = isAnalyzing ? 'Analizando...' : 'Analizar HTML';
  analyzeBtn.disabled = isAnalyzing || !htmlInput;
  analyzeBtn.style.cssText = 'margin-top:0.5rem;padding:0.5rem 1rem;background:#db2777;color:white;border-radius:0.5rem;border:none;cursor:' + (isAnalyzing || !htmlInput ? 'not-allowed' : 'pointer');
  analyzeBtn.onclick = onAnalyze;
  analyzer.appendChild(analyzeBtn);
  body.appendChild(analyzer);

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = 'padding:1.5rem;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:0.75rem';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = 'padding:0.5rem 1rem;border:1px solid #e5e7eb;border-radius:0.5rem;background:white;cursor:pointer';
  cancelBtn.onclick = onClose;
  const saveBtn = document.createElement('button');
  saveBtn.textContent = saving ? 'Guardando...' : 'Guardar';
  saveBtn.disabled = saving;
  saveBtn.style.cssText = 'padding:0.5rem 1rem;background:#db2777;color:white;border-radius:0.5rem;border:none;cursor:' + (saving ? 'not-allowed' : 'pointer');
  saveBtn.onclick = onSave;
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  wrapper.appendChild(modal);
  container.appendChild(overlay);
  container.appendChild(wrapper);

  return container;
}

export const RAGTemplateModal: React.FC<Props> = (props) => {
  const isOpen = props.isOpen;

  // Crear/remover modal cuando cambia isOpen
  useEffect(() => {
    if (isOpen) {
      // Remover cualquier instancia previa
      if (modalContainer) {
        modalContainer.remove();
      }
      // Crear nuevo modal
      modalContainer = createModalElement(props);
      document.body.appendChild(modalContainer);
    } else {
      // Remover modal cuando se cierra
      if (modalContainer) {
        modalContainer.remove();
        modalContainer = null;
      }
    }

    // Cleanup al desmontar componente
    return () => {
      if (modalContainer) {
        modalContainer.remove();
        modalContainer = null;
      }
    };
  }, [isOpen]);

  // Actualizar props cuando cambian (sin cerrar el modal)
  useEffect(() => {
    if (isOpen && modalContainer) {
      // Solo actualizar el contenido si el modal ya existe
      const newModal = createModalElement(props);
      document.body.replaceChild(newModal, modalContainer);
      modalContainer = newModal;
    }
  }, [props.template, props.htmlInput, props.isAnalyzing, props.saving]);

  return null;
};