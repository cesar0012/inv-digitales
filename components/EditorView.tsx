import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { EditorSidebar } from './EditorSidebar';
import { PreviewPane } from './PreviewPane';
import { InitialView } from './InitialView';
import { SelectedElement, Attachment, ProjectPage, InvitationMetadata, EditorConfig, LocalImageFile } from '../types';
import { IMAGE_SOURCES } from '../constants';
import { generateWebProject, addModuleToProject, modifyProjectDesign } from '../services/aiService';
import { consumeCredit, consumeGenerationCredit, saveInvitation, replaceInvitation, getInvitationContent } from '../services/apiService';
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

  const activePage = pages.find(p => p.id === activePageId);
  const code = activePage?.code || '';

  useEffect(() => {
    if (filename) {
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
      secondaryColor: config.secondaryColor
    } : undefined;

    const folder = getEventFolder(eventType);
    const imageFilesForApi = localImages.length > 0 && folder
      ? localImages.map(img => ({ folder: folder, filename: img.filename }))
      : undefined;

    try {
      const generatedCode = await generateWebProject(enhancedPrompt, imageSource, attachments, editorConfigForApi, imageFilesForApi);
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
      const updatedCode = await addModuleToProject(activePage.code, insertAfterModule, moduleDescription, loremFlickrSource);
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
      const updatedCode = await modifyProjectDesign(activePage.code, designDescription, loremFlickrSource);
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

  const handleSaveInvitation = async (replaceFilename?: string) => {
    if (code.length === 0) return;
    if (!purchaseId) {
      alert('Error: No se encontró el plan seleccionado. Vuelve al dashboard e intenta de nuevo.');
      return;
    }
    const safeReplace = (typeof replaceFilename === 'string') ? replaceFilename : undefined;
    setIsGenerating(true);
    setGeneratingMessage('Guardando Invitación...');
    
    try {
      const metadata = buildMetadataFromHTML(code, existingMetadata, editorConfig);
      const htmlWithMetadata = injectMetadata(code, metadata);
      
      let result;
      if (safeReplace) {
        result = await replaceInvitation(userId, safeReplace, htmlWithMetadata, editorConfig.eventType, purchaseId, token);
      } else {
        result = await saveInvitation(htmlWithMetadata, editorConfig.eventType, purchaseId, undefined, token);
      }
      setReplaceModalData(null);
      console.log('Invitación guardada:', result.filename, '| URL:', result.publicUrl);
      navigate('/');
    } catch (error: any) {
      console.error('Error al guardar invitación:', error?.message || error);
      if (error?.isPlanHasInvitation) {
        alert('Este plan ya tiene una invitación. Usa la opción de reemplazar desde el dashboard.');
        setIsGenerating(false);
        return;
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
    </div>
  );
};
