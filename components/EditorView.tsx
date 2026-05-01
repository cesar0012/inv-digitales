import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { EditorSidebar } from './EditorSidebar';
import { PreviewPane } from './PreviewPane';
import { InitialView } from './InitialView';
import { SelectedElement, Attachment, ProjectPage, InvitationMetadata, EditorConfig, LocalImageFile } from '../types';
import { IMAGE_SOURCES } from '../constants';
import { generateWebProject, addModuleToProject, modifyProjectDesign } from '../services/aiService';
import { consumeCredit, saveInvitation, replaceInvitation, updateInvitationContent, getInvitationContent } from '../services/apiService';
import { injectMetadata, extractMetadata, buildMetadataFromHTML } from '../services/metadataService';
import { useAuth } from '../contexts/AuthContext';
import { getLocalImages, hasLocalImages, buildLocalImageContext, getEventFolder } from '../services/localImageService';
import { ReplaceInvitationModal } from './ReplaceInvitationModal';
import { InvitationFile } from '../types';

export const EditorView: React.FC = () => {
  const { filename } = useParams<{ filename?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser, token } = useAuth();
  const userId = authUser?.id.toString() || '';
  const purchaseId = searchParams.get('purchaseId') || '';
  
  const [hasStarted, setHasStarted] = useState(false);
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('Generando Invitación...');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    eventType: '',
    theme: '',
    primaryColor: '#f472b6',
    secondaryColor: '#fb7185',
    eventDetails: ''
  });
  
  const [existingMetadata, setExistingMetadata] = useState<InvitationMetadata | null>(null);
  const [replaceModalData, setReplaceModalData] = useState<{ invitations: InvitationFile[]; maxInvitations: number } | null>(null);
  const [replaceFilename, setReplaceFilename] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const activePage = pages.find(p => p.id === activePageId);
  const code = activePage?.code || '';

  useEffect(() => {
    const replaceParam = searchParams.get('replace');
    if (replaceParam) {
      setReplaceFilename(decodeURIComponent(replaceParam));
    } else if (filename) {
      loadExistingInvitation(filename);
    }
    
    // Verificar si viene del catálogo
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fromCatalogo') === 'true') {
      const catalogoHtml = localStorage.getItem('catalogo_html');
      if (catalogoHtml) {
        loadFromCatalogo(catalogoHtml);
        // Limpiar
        localStorage.removeItem('catalogo_html');
        localStorage.removeItem('catalogo_filename');
      }
    }
  }, [filename]);

  const loadFromCatalogo = (htmlContent: string) => {
    const metadata = extractMetadata(htmlContent);
    if (metadata) {
      setExistingMetadata(metadata);
      setEditorConfig({
        eventType: metadata.eventType || '',
        theme: metadata.theme || '',
        primaryColor: metadata.primaryColor || '#f472b6',
        secondaryColor: metadata.secondaryColor || '#fb7185',
        eventDetails: ''
      });
    }
    
    const newPage: ProjectPage = {
      id: 'home-' + Date.now(),
      name: 'Inicio',
      path: 'index.html',
      code: htmlContent,
      isCreated: true
    };
    setPages([newPage]);
    setActivePageId(newPage.id);
    setHasStarted(true);
  };

  const loadExistingInvitation = async (filename: string) => {
    setIsLoadingFile(true);
    try {
      const decodedFilename = decodeURIComponent(filename);
      const htmlContent = await getInvitationContent(decodedFilename, userId, token);
      
      const metadata = extractMetadata(htmlContent);
      if (metadata) {
        setExistingMetadata(metadata);
        setEditorConfig({
          eventType: metadata.eventType || '',
          theme: metadata.theme || '',
          primaryColor: metadata.primaryColor || '#f472b6',
          secondaryColor: metadata.secondaryColor || '#fb7185',
          eventDetails: ''
        });
      }
      
      const newPage: ProjectPage = {
        id: 'home-' + Date.now(),
        name: 'Inicio',
        path: 'index.html',
        code: htmlContent,
        isCreated: true
      };
      setPages([newPage]);
      setActivePageId(newPage.id);
      setHasStarted(true);
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      alert(`Error al cargar la invitación: ${error.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleGenerate = async (prompt: string, attachments: Attachment[] = [], config?: EditorConfig) => {
    setIsGenerating(true);
    setGeneratingMessage('Generando Invitación...');

    setHasStarted(true);

    if (config) {
      setEditorConfig(config);
    }

    const eventType = config?.eventType || '';
    let imageSource = IMAGE_SOURCES.find(s => s.id === 'loremflickr') || IMAGE_SOURCES[0];
    let enhancedPrompt = prompt;
    let localImages: LocalImageFile[] = [];

    if (eventType && hasLocalImages(eventType)) {
      setGeneratingMessage('Obteniendo imágenes del evento...');
      localImages = await getLocalImages(eventType);
      
      if (localImages.length > 0) {
        imageSource = IMAGE_SOURCES.find(s => s.id === 'local') || IMAGE_SOURCES[0];
        imageSource = {
          ...imageSource,
          promptInstruction: buildLocalImageContext(eventType, localImages)
        };

      }
    }

    const editorConfigForApi = config ? {
      eventType: config.eventType,
      theme: config.theme,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      visualStyle: config.visualStyle,
      mood: config.mood
    } : undefined;

    const folder = getEventFolder(eventType);
    const imageFilesForApi = localImages.length > 0 && folder
      ? localImages.map(img => ({ folder: folder, filename: img.filename }))
      : undefined;

    try {
      const generatedCode = await generateWebProject(enhancedPrompt, imageSource, attachments, editorConfigForApi, imageFilesForApi, purchaseId);
      const newPage: ProjectPage = {
        id: 'home-' + Date.now(),
        name: 'Inicio',
        path: 'index.html',
        code: generatedCode,
        isCreated: true
      };
      setPages([newPage]);
      setActivePageId(newPage.id);
      setExistingMetadata(null);
    } catch (error: any) {
      console.error(error);
      alert(`Error al generar la invitación: ${error.message}`);
      setHasStarted(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddModule = async (insertAfterModule: string, moduleDescription: string) => {
    if (!activePage) return;
    
    try {
      await consumeCredit(userId, token, purchaseId);
    } catch (error: any) {
      alert(`Sin créditos: ${error.message}`);
      return;
    }
    
    setIsGenerating(true);
    setGeneratingMessage('Agregando Módulo...');
    const loremFlickrSource = IMAGE_SOURCES.find(s => s.id === 'loremflickr') || IMAGE_SOURCES[0];

    try {
      const updatedCode = await addModuleToProject(activePage.code, insertAfterModule, moduleDescription, loremFlickrSource, purchaseId);
      setPages(prev => prev.map(p => p.id === activePageId ? { ...p, code: updatedCode } : p));
    } catch (error: any) {
      console.error(error);
      alert(`Error al agregar el módulo: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModifyDesign = async (designDescription: string) => {
    if (!activePage) return;
    
    try {
      await consumeCredit(userId, token, purchaseId);
    } catch (error: any) {
      alert(`Sin créditos: ${error.message}`);
      return;
    }
    
    setIsGenerating(true);
    setGeneratingMessage('Modificando Diseño...');
    const loremFlickrSource = IMAGE_SOURCES.find(s => s.id === 'loremflickr') || IMAGE_SOURCES[0];

    try {
      const updatedCode = await modifyProjectDesign(activePage.code, designDescription, loremFlickrSource, purchaseId);
      setPages(prev => prev.map(p => p.id === activePageId ? { ...p, code: updatedCode } : p));
    } catch (error: any) {
      console.error(error);
      alert(`Error al modificar el diseño: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateElement = (geminiId: string, newContent?: string, newAttributes?: Record<string, string>, newStyles?: Record<string, string>) => {
    if (!activePage) return;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(activePage.code, 'text/html');
    const el = doc.querySelector(`[data-gemini-id="${geminiId}"]`) as HTMLElement;
    
    if (el) {
      if (newContent !== undefined && el.tagName !== 'IMG' && el.tagName !== 'IFRAME') {
        el.innerHTML = newContent;
      }
      if (newAttributes) {
        Object.entries(newAttributes).forEach(([k, v]) => {
          if (k === 'animationClass') {
            el.classList.remove('animate-none', 'animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce', 'animate-fade-in', 'animate-slide-up');
            if (v && v !== 'none') {
              el.classList.add(v);
            }
          } else if (v) {
            el.setAttribute(k, v);
          } else {
            el.removeAttribute(k);
          }
        });
      }
      if (newStyles) {
        Object.entries(newStyles).forEach(([k, v]) => {
          if (v) el.style[k as any] = v;
          else el.style.removeProperty(k.replace(/([A-Z])/g, "-$1").toLowerCase());
        });
      }
      
      const updatedCode = doc.documentElement.outerHTML;
      setPages(prev => prev.map(p => p.id === activePageId ? { ...p, code: updatedCode } : p));
      
      setSelectedElement(prev => prev ? {
        ...prev,
        content: newContent !== undefined ? newContent : prev.content,
        src: newAttributes?.src !== undefined ? newAttributes.src : prev.src,
        href: newAttributes?.href !== undefined ? newAttributes.href : prev.href,
      } : null);
    }
  };

  const handleToggleModuleVisibility = (moduleName: string) => {
    if (!activePage) return;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(activePage.code, 'text/html');
    
    const elements = Array.from(doc.querySelectorAll('[data-gemini-id]')).filter(el => {
      const geminiId = el.getAttribute('data-gemini-id');
      if (!geminiId) return false;
      let elModuleName = '';
      if (geminiId && !geminiId.startsWith('edit-') && geminiId.length < 30) {
        const parts = geminiId.split('-');
        if (parts.length > 1) {
          elModuleName = parts[0].replace(/\b\w/g, l => l.toUpperCase());
        }
      }
      const group = elModuleName || 'Otros Elementos';
      return group === moduleName;
    });

    if (elements.length === 0) return;

    let lca = elements[0] as HTMLElement;
    for (let i = 1; i < elements.length; i++) {
      let node = elements[i] as HTMLElement;
      while (lca && !lca.contains(node)) {
        lca = lca.parentElement as HTMLElement;
      }
    }

    if (lca && lca.tagName !== 'BODY' && lca.tagName !== 'HTML') {
      const isHidden = lca.getAttribute('data-gemini-hidden') === 'true';
      if (isHidden) {
        lca.removeAttribute('data-gemini-hidden');
        lca.style.removeProperty('display');
      } else {
        lca.setAttribute('data-gemini-hidden', 'true');
        lca.style.setProperty('display', 'none', 'important');
      }
    } else {
      elements.forEach(el => {
        const htmlEl = el as HTMLElement;
        const isHidden = htmlEl.getAttribute('data-gemini-hidden') === 'true';
        if (isHidden) {
          htmlEl.removeAttribute('data-gemini-hidden');
          htmlEl.style.removeProperty('display');
        } else {
          htmlEl.setAttribute('data-gemini-hidden', 'true');
          htmlEl.style.setProperty('display', 'none', 'important');
        }
      });
    }
    
    const updatedCode = doc.documentElement.outerHTML;
    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, code: updatedCode } : p));
  };

  const handleSaveInvitation = async (replaceFilenameArg?: string) => {
    if (code.length === 0) return;
    if (!purchaseId) {
      alert('Error: No se encontró el plan seleccionado. Vuelve al dashboard e intenta de nuevo.');
      return;
    }

    const effectiveReplace = replaceFilenameArg || replaceFilename || undefined;

    if (effectiveReplace && !replaceFilenameArg) {
      setShowReplaceConfirm(true);
      return;
    }

    setIsGenerating(true);
    setGeneratingMessage('Guardando Invitación...');
    
    try {
      const metadata = buildMetadataFromHTML(code, existingMetadata, editorConfig);
      const htmlWithMetadata = injectMetadata(code, metadata);
      
      if (filename && !effectiveReplace) {
        await updateInvitationContent(userId, filename, htmlWithMetadata, token);
        setSuccessMessage('Invitación actualizada correctamente');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else if (effectiveReplace) {
        await replaceInvitation(userId, effectiveReplace, htmlWithMetadata, editorConfig.eventType, purchaseId, token);
        setReplaceFilename(null);
        setSuccessMessage('Invitación reemplazada correctamente');
        setTimeout(() => setSuccessMessage(null), 3000);
        navigate('/');
      } else {
        await saveInvitation(htmlWithMetadata, editorConfig.eventType, purchaseId, undefined, token);
        navigate('/');
      }
      setReplaceModalData(null);
      setShowReplaceConfirm(false);
    } catch (error: any) {
      console.error('Error al guardar invitación:', error?.message || error);
      if (error?.isPlanHasInvitation) {
        alert('Este plan ya tiene una invitación. Usa la opción de reemplazar desde el dashboard.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingFile) {
    return (
      <div className="flex flex-col md:flex-row h-screen w-full bg-pink-50 text-gray-800 overflow-hidden font-sans relative">
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-4" />
          <p className="text-pink-600 font-medium text-lg animate-pulse">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <InitialView 
        onGenerate={handleGenerate}
        onSaveInvitation={handleSaveInvitation}
        hasCode={code.length > 0}
        isReplace={!!replaceFilename}
        initialEventType={editorConfig.eventType}
        initialTheme={editorConfig.theme}
        initialPrimaryColor={editorConfig.primaryColor}
        initialSecondaryColor={editorConfig.secondaryColor}
        initialEventDetails={editorConfig.eventDetails}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-pink-50 text-gray-800 overflow-hidden font-sans relative">
      
      {isGenerating && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-4" />
          <p className="text-pink-600 font-medium text-lg animate-pulse">{generatingMessage}</p>
        </div>
      )}

      {!isFullscreen && (
        <EditorSidebar
          code={code}
          selectedElementId={selectedElement?.geminiId || null}
          onUpdateElement={handleUpdateElement}
          onClearSelection={() => setSelectedElement(null)}
          isSelectionMode={isSelectionMode}
          onToggleSelectionMode={() => setIsSelectionMode(!isSelectionMode)}
          // AI ITERATIONS: Props conditionally passed (feature flag in EditorSidebar)
          onAddModule={handleAddModule}
          onModifyDesign={handleModifyDesign}
          onToggleModuleVisibility={handleToggleModuleVisibility}
          onSaveInvitation={handleSaveInvitation}
          hasCode={code.length > 0}
          isReplace={!!replaceFilename}
        />
      )}

      <PreviewPane 
        code={code} 
        onElementClick={(el) => {
          setSelectedElement(el);
          setIsSelectionMode(false);
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        isSelectionMode={isSelectionMode}
      />

      {replaceModalData && (
        <ReplaceInvitationModal
          invitations={replaceModalData.invitations}
          maxInvitations={replaceModalData.maxInvitations}
          onSelect={(filename) => handleSaveInvitation(filename)}
          onCancel={() => setReplaceModalData(null)}
        />
      )}

      {showReplaceConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Reemplazar invitación</h2>
                  <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                ¿Estás seguro de que deseas <strong>reemplazar</strong> la invitación existente? La invitación anterior se eliminará permanentemente y la nueva ocupará su lugar.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowReplaceConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowReplaceConfirm(false);
                  handleSaveInvitation(replaceFilename || undefined);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors text-sm shadow-sm"
              >
                Sí, reemplazar
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-4 right-4 z-[100]">
          <div className="bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}
    </div>
  );
};
