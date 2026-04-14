import React, { useState } from 'react';
import { EditorSidebar } from './components/EditorSidebar';
import { PreviewPane } from './components/PreviewPane';
import { InitialView } from './components/InitialView';
import { SelectedElement, Attachment, ProjectPage, ImageSource } from './types';
import { IMAGE_SOURCES } from './constants';
import { generateWebProject, addModuleToProject, modifyProjectDesign } from './services/geminiService';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('Generando Invitación...');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  
  // UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const activePage = pages.find(p => p.id === activePageId);
  const code = activePage?.code || '';

  const handleGenerate = async (prompt: string, attachments: Attachment[] = []) => {
    setHasStarted(true);
    setIsGenerating(true);
    setGeneratingMessage('Generando Invitación...');

    const loremFlickrSource = IMAGE_SOURCES.find(s => s.id === 'loremflickr') || IMAGE_SOURCES[0];

    try {
      const generatedCode = await generateWebProject(prompt, loremFlickrSource, attachments);
      const newPage: ProjectPage = {
        id: 'home-' + Date.now(),
        name: 'Inicio',
        path: 'index.html',
        code: generatedCode,
        isCreated: true
      };
      setPages([newPage]);
      setActivePageId(newPage.id);
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
            // Remove existing animation classes
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
      
      // Update selected element state to reflect changes
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

  if (!hasStarted) {
    return (
      <InitialView 
        onGenerate={handleGenerate}
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
          onAddModule={handleAddModule}
          onModifyDesign={handleModifyDesign}
          onToggleModuleVisibility={handleToggleModuleVisibility}
        />
      )}

      <PreviewPane 
        code={code} 
        onElementClick={(el) => {
          setSelectedElement(el);
          setIsSelectionMode(false); // Auto-disable selection mode after clicking
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        isSelectionMode={isSelectionMode}
      />
    </div>
  );
};

export default App;
