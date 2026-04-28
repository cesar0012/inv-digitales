import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Heart, Edit3, Save, Home, Image as ImageIcon, Link as LinkIcon, Type, MousePointer2, ChevronDown, ChevronRight, AlignLeft, AlignCenter, AlignRight, AlignJustify, Map, Upload, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '../services/imageCompressionService';

// ============================================================
// FEATURE FLAG: AI ITERATIONS
// ============================================================
// Establecer en false para ocultar las funciones de IA en el editor
// Estas funciones permiten regenerar diseño y agregar nuevos módulos
// Mantener false hasta que el sistema de créditos esté implementado
const AI_ITERATIONS_ENABLED = false;
// ============================================================

interface EditableElement {
  geminiId: string;
  tagName: string;
  content: string;
  textContent: string;
  src: string;
  href: string;
  styles: Record<string, string>;
  animationClass: string;
  label: string;
  moduleName?: string;
  isHidden: boolean;
}

const parseEditableElements = (code: string): EditableElement[] => {
  if (!code) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(code, 'text/html');
  const elements = Array.from(doc.querySelectorAll('[data-gemini-id]'));
  
  return elements.map(el => {
    const htmlEl = el as HTMLElement;
    const geminiId = htmlEl.getAttribute('data-gemini-id')!;
    
    let isHidden = false;
    let current: HTMLElement | null = htmlEl;
    while (current && current.tagName !== 'BODY') {
      if (current.getAttribute('data-gemini-hidden') === 'true') {
        isHidden = true;
        break;
      }
      current = current.parentElement;
    }
    
    // Create a more descriptive label based on the geminiId if it exists and isn't just a random string
    let label = 'Elemento';
    let moduleName = '';
    
    if (geminiId && !geminiId.startsWith('edit-') && geminiId.length < 30) {
      // Try to extract module name if it follows a pattern like module-element
      const parts = geminiId.split('-');
      if (parts.length > 1) {
        moduleName = parts[0].replace(/\b\w/g, l => l.toUpperCase());
        label = parts.slice(1).join(' ').replace(/\b\w/g, l => l.toUpperCase());
      } else {
        label = geminiId
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
    } else {
      if (htmlEl.tagName === 'IMG') label = 'Imagen';
      else if (htmlEl.tagName === 'IFRAME') label = 'Mapa / Video';
      else if (htmlEl.tagName === 'A') label = 'Enlace';
      else if (htmlEl.tagName.match(/^H[1-6]$/)) label = `Título (${htmlEl.tagName})`;
      else label = 'Texto';
    }

    let animationClass = 'none';
    const animClasses = ['animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce', 'animate-fade-in', 'animate-slide-up'];
    for (const cls of animClasses) {
      if (htmlEl.classList.contains(cls)) {
        animationClass = cls;
        break;
      }
    }

    return {
      geminiId: htmlEl.getAttribute('data-gemini-id')!,
      tagName: htmlEl.tagName,
      content: htmlEl.innerHTML,
      textContent: htmlEl.textContent || '',
      src: htmlEl.getAttribute('src') || '',
      href: htmlEl.getAttribute('href') || '',
      styles: {
        textAlign: htmlEl.style.textAlign || '',
        fontWeight: htmlEl.style.fontWeight || '',
        fontSize: htmlEl.style.fontSize || '',
        padding: htmlEl.style.padding || '',
        lineHeight: htmlEl.style.lineHeight || '',
        letterSpacing: htmlEl.style.letterSpacing || '',
        width: htmlEl.style.width || '',
        height: htmlEl.style.height || '',
      },
      animationClass,
      label,
      moduleName,
      isHidden
    };
  });
};

const ElementEditor = ({ element, onUpdate, isSelected }: { element: EditableElement, onUpdate: any, isSelected: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [content, setContent] = useState(element.content);
  const [src, setSrc] = useState(element.src);
  const [href, setHref] = useState(element.href);
  const [styles, setStyles] = useState(element.styles);
  const [animationClass, setAnimationClass] = useState(element.animationClass);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) {
      setIsExpanded(true);
      setTimeout(() => {
        editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isSelected]);

  useEffect(() => {
    setContent(element.content);
    setSrc(element.src);
    setHref(element.href);
    setStyles(element.styles);
    setAnimationClass(element.animationClass);
  }, [element]);

  const triggerUpdate = (newContent = content, newSrc = src, newHref = href, newStyles = styles, newAnimationClass = animationClass) => {
    onUpdate(element.geminiId, newContent, { src: newSrc, href: newHref, animationClass: newAnimationClass }, newStyles);
  };

  const handleStyleChange = (key: string, value: string) => {
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);
    triggerUpdate(content, src, href, newStyles, animationClass);
  };

  const handleAnimationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAnimationClass = e.target.value;
    setAnimationClass(newAnimationClass);
    triggerUpdate(content, src, href, styles, newAnimationClass);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setSrc(compressedBase64);
      triggerUpdate(content, compressedBase64, href, styles);
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      alert('Error al procesar la imagen. Intenta con otra.');
    } finally {
      setIsCompressing(false);
    }
  };

  const renderIcon = () => {
    if (element.tagName === 'IMG') return <ImageIcon className="w-4 h-4 text-pink-500" />;
    if (element.tagName === 'IFRAME') return <Map className="w-4 h-4 text-pink-500" />;
    if (element.tagName === 'A') return <LinkIcon className="w-4 h-4 text-pink-500" />;
    return <Type className="w-4 h-4 text-pink-500" />;
  };

  const isText = !['IMG', 'IFRAME'].includes(element.tagName);
  const isImage = element.tagName === 'IMG';
  const isIframe = element.tagName === 'IFRAME';
  const isLink = element.tagName === 'A';

  return (
    <div ref={editorRef} className={`border rounded-xl mb-2 overflow-hidden transition-all ${isSelected ? 'border-pink-400 shadow-md shadow-pink-100' : 'border-pink-100 hover:border-pink-200'}`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 bg-white hover:bg-pink-50/50 transition-colors ${isExpanded ? 'bg-pink-50/30' : ''}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 bg-pink-100 rounded-lg shrink-0">
            {renderIcon()}
          </div>
          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-sm font-semibold text-gray-700">{element.label}</span>
            <span className="text-xs text-gray-400 truncate w-48 text-left">
              {isText ? element.textContent.substring(0, 30) || 'Texto vacío' : element.src.substring(0, 30) || 'Sin URL'}
            </span>
          </div>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="p-4 bg-white border-t border-pink-50 space-y-4">
          
          {/* Content / URL Inputs */}
          {isText && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Contenido</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => triggerUpdate()}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 min-h-[80px] resize-y"
              />
            </div>
          )}

          {isLink && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">URL del Enlace</label>
              <input
                type="text"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                onBlur={() => triggerUpdate()}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
              />
            </div>
          )}

          {isImage && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">URL de la Imagen</label>
                <input
                  type="text"
                  value={src}
                  onChange={(e) => setSrc(e.target.value)}
                  onBlur={() => triggerUpdate()}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isCompressing} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="w-full py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Comprimiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir Imagen
                  </>
                )}
              </button>
              {src && <img src={src} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200" />}
            </div>
          )}

          {isIframe && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">URL del Mapa/Video (src)</label>
              <input
                type="text"
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                onBlur={() => triggerUpdate()}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
              />
            </div>
          )}

          {/* Styling Controls */}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estilos</h4>
            
            {isText && (
              <>
                {/* Alignment */}
                <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200 w-fit">
                  {[
                    { icon: AlignLeft, value: 'left' },
                    { icon: AlignCenter, value: 'center' },
                    { icon: AlignRight, value: 'right' },
                    { icon: AlignJustify, value: 'justify' }
                  ].map(({ icon: Icon, value }) => (
                    <button
                      key={value}
                      onClick={() => handleStyleChange('textAlign', value)}
                      className={`p-1.5 rounded-md transition-colors ${styles.textAlign === value ? 'bg-white shadow-sm text-pink-500' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Grosor (Weight)</label>
                    <select 
                      value={styles.fontWeight} 
                      onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
                    >
                      <option value="">Por defecto</option>
                      <option value="normal">Normal</option>
                      <option value="500">Medio</option>
                      <option value="600">Semibold</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Tamaño (Size)</label>
                    <input 
                      type="text" 
                      placeholder="ej. 16px, 2rem"
                      value={styles.fontSize}
                      onChange={(e) => setStyles({...styles, fontSize: e.target.value})}
                      onBlur={() => triggerUpdate()}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Interlineado</label>
                    <input 
                      type="text" 
                      placeholder="ej. 1.5, 24px"
                      value={styles.lineHeight}
                      onChange={(e) => setStyles({...styles, lineHeight: e.target.value})}
                      onBlur={() => triggerUpdate()}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Espaciado (Letter)</label>
                    <input 
                      type="text" 
                      placeholder="ej. 1px, 0.05em"
                      value={styles.letterSpacing}
                      onChange={(e) => setStyles({...styles, letterSpacing: e.target.value})}
                      onBlur={() => triggerUpdate()}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
                    />
                  </div>
                </div>
              </>
            )}

            {(isImage || isIframe) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Ancho (Width)</label>
                  <input 
                    type="text" 
                    placeholder="ej. 100%, 300px"
                    value={styles.width}
                    onChange={(e) => setStyles({...styles, width: e.target.value})}
                    onBlur={() => triggerUpdate()}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
                  />
                </div>
                {isIframe && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Alto (Height)</label>
                    <input 
                      type="text" 
                      placeholder="ej. 400px"
                      value={styles.height}
                      onChange={(e) => setStyles({...styles, height: e.target.value})}
                      onBlur={() => triggerUpdate()}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase">Padding (Relleno)</label>
              <input 
                type="text" 
                placeholder="ej. 10px 20px"
                value={styles.padding}
                onChange={(e) => setStyles({...styles, padding: e.target.value})}
                onBlur={() => triggerUpdate()}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase">Animación</label>
              <select 
                value={animationClass} 
                onChange={handleAnimationChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-pink-400"
              >
                <option value="none">Ninguna</option>
                <option value="animate-fade-in">Fade In</option>
                <option value="animate-slide-up">Slide Up</option>
                <option value="animate-bounce">Bounce</option>
                <option value="animate-pulse">Pulse</option>
                <option value="animate-spin">Spin</option>
                <option value="animate-ping">Ping</option>
              </select>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

const ModuleGroup = ({ 
  groupName, 
  elements, 
  onUpdateElement, 
  selectedElementId, 
  onToggleVisibility 
}: { 
  groupName: string, 
  elements: EditableElement[], 
  onUpdateElement: any, 
  selectedElementId: string | null,
  onToggleVisibility: (name: string) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasSelected = elements.some(el => el.geminiId === selectedElementId);
  
  useEffect(() => {
    if (hasSelected) {
      setIsExpanded(true);
    }
  }, [hasSelected]);

  const isHidden = elements.every(el => el.isHidden);

  return (
    <div className="space-y-0 border border-pink-100 rounded-xl overflow-hidden bg-white shadow-sm">
      <div 
        className="flex items-center justify-between px-3 py-2.5 bg-pink-50/50 hover:bg-pink-100/50 cursor-pointer transition-colors" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-pink-500" /> : <ChevronRight className="w-4 h-4 text-pink-500" />}
          <span className="text-xs font-bold text-pink-600 uppercase tracking-widest">{groupName}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(groupName); }}
          className={`p-1.5 rounded-md transition-colors ${isHidden ? 'text-gray-400 hover:text-gray-600 bg-gray-100' : 'text-pink-500 hover:text-pink-600 bg-pink-100/50'}`}
          title={isHidden ? "Mostrar módulo" : "Ocultar módulo"}
        >
          {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {isExpanded && (
        <div className="p-2 space-y-2 bg-white border-t border-pink-50">
          {elements.map(el => (
            <ElementEditor 
              key={el.geminiId} 
              element={el} 
              onUpdate={onUpdateElement} 
              isSelected={selectedElementId === el.geminiId} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface EditorSidebarProps {
  code: string;
  selectedElementId: string | null;
  onUpdateElement: (geminiId: string, newContent?: string, newAttributes?: Record<string, string>, newStyles?: Record<string, string>) => void;
  onClearSelection: () => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onAddModule: (insertAfterModule: string, moduleDescription: string) => void;
  onModifyDesign: (designDescription: string) => void;
  onToggleModuleVisibility: (moduleName: string) => void;
  onSaveInvitation?: () => void;
  hasCode?: boolean;
  isReplace?: boolean;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  code,
  selectedElementId,
  onUpdateElement,
  onClearSelection,
  isSelectionMode,
  onToggleSelectionMode,
  onAddModule,
  onModifyDesign,
  onToggleModuleVisibility,
  onSaveInvitation,
  hasCode = false,
  isReplace = false
}) => {
  const navigate = useNavigate();
  const elements = useMemo(() => parseEditableElements(code), [code]);
  
  const moduleNames = useMemo(() => {
    const names = new Set<string>();
    elements.forEach(el => {
      if (el.moduleName) names.add(el.moduleName);
    });
    return Array.from(names);
  }, [elements]);

  const [activeTab, setActiveTab] = useState<'add' | 'modify'>('add');
  const [insertAfter, setInsertAfter] = useState<string>('Al final');
  const [moduleDescription, setModuleDescription] = useState('');
  const [designDescription, setDesignDescription] = useState('');

  const handleAddSubmit = () => {
    if (!moduleDescription.trim()) return;
    onAddModule(insertAfter, moduleDescription);
    setModuleDescription('');
  };

  const handleModifySubmit = () => {
    if (!designDescription.trim()) return;
    onModifyDesign(designDescription);
    setDesignDescription('');
  };

  return (
    <div className="w-80 md:w-96 flex flex-col h-full bg-white border-r border-pink-200 shadow-xl shadow-pink-100/50 z-20 shrink-0">
      
      {/* Header */}
      <div className="h-14 border-b border-pink-100 flex items-center justify-between px-4 bg-pink-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-pink-500 hover:bg-pink-100 transition-colors"
            title="Ir al Dashboard"
          >
            <Home className="w-4 h-4" />
          </button>
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500/20" />
          <span className="font-semibold text-gray-800 tracking-tight">Módulos</span>
        </div>
        <div className="flex items-center gap-1">
          {hasCode && onSaveInvitation && (
            <button
              onClick={() => onSaveInvitation()}
              className={`p-2 rounded-lg transition-colors ${
                isReplace
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title={isReplace ? 'Guardar y Reemplazar' : 'Guardar Invitación'}
            >
              <Save className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleSelectionMode}
            className={`p-2 rounded-lg transition-colors ${isSelectionMode ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20' : 'text-gray-400 hover:text-pink-500 hover:bg-pink-100'}`}
            title={isSelectionMode ? "Desactivar modo selección" : "Activar modo selección"}
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {elements.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center border border-pink-100">
              <MousePointer2 className="w-8 h-8 text-pink-300" />
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-700 font-medium">Sin elementos editables</h3>
              <p className="text-sm text-gray-500 max-w-[200px]">
                Genera una invitación para ver los módulos editables aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 px-1">
              Elementos por orden de aparición
            </div>
            {Object.entries(
              elements.reduce((acc, el) => {
                const group = el.moduleName || 'Otros Elementos';
                if (!acc[group]) acc[group] = [];
                acc[group].push(el);
                return acc;
              }, {} as Record<string, EditableElement[]>)
            ).map(([groupName, groupElements]) => (
              <ModuleGroup 
                key={groupName}
                groupName={groupName}
                elements={groupElements}
                onUpdateElement={onUpdateElement}
                selectedElementId={selectedElementId}
                onToggleVisibility={onToggleModuleVisibility}
              />
            ))}
             
            {/* ============================================================ */}
            {/* DESIGN MODIFIER SECTION - AI ITERATIONS (Feature Flag) */}
            {/* ============================================================ */}
            {AI_ITERATIONS_ENABLED && (
            <div className="mt-8 border-t border-pink-200 pt-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">✨</span>
                Agregar / Modificar Diseño
              </h3>
              
              <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                <button 
                  onClick={() => setActiveTab('add')}
                  className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${activeTab === 'add' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Agregar Módulo
                </button>
                <button 
                  onClick={() => setActiveTab('modify')}
                  className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${activeTab === 'modify' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Modificar Diseño
                </button>
              </div>

              {activeTab === 'add' && (
                <div className="space-y-3 bg-pink-50/30 p-4 rounded-xl border border-pink-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Insertar después de:</label>
                    <select 
                      value={insertAfter}
                      onChange={(e) => setInsertAfter(e.target.value)}
                      className="w-full bg-white border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                    >
                      <option value="Al principio">Al principio</option>
                      {moduleNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="Al final">Al final</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Descripción del módulo:</label>
                    <textarea 
                      value={moduleDescription}
                      onChange={(e) => setModuleDescription(e.target.value)}
                      placeholder="Ej. Una sección para mesa de postres con una imagen y texto descriptivo."
                      className="w-full bg-white border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 min-h-[80px] resize-y"
                    />
                  </div>
                  <button 
                    onClick={handleAddSubmit}
                    disabled={!moduleDescription.trim()}
                    className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-pink-500/20"
                  >
                    Generar Módulo
                  </button>
                </div>
              )}

              {activeTab === 'modify' && (
                <div className="space-y-3 bg-pink-50/30 p-4 rounded-xl border border-pink-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Descripción de los cambios:</label>
                    <textarea 
                      value={designDescription}
                      onChange={(e) => setDesignDescription(e.target.value)}
                      placeholder="Ej. Cambia la paleta de colores a tonos azules y haz que los bordes sean más redondeados."
                      className="w-full bg-white border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 min-h-[100px] resize-y"
                    />
                  </div>
                  <button 
                    onClick={handleModifySubmit}
                    disabled={!designDescription.trim()}
                    className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-pink-500/20"
                  >
                    Aplicar Cambios
                  </button>
                </div>
              )}
            </div>
            )}
            {/* ============================================================ */}
          </div>
        )}
      </div>
    </div>
  );
};
