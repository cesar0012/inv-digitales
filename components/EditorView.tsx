import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ClipboardList, Palette, X, Send, SkipForward } from 'lucide-react';
import { EditorSidebar, describirElemento, type EditableElement } from './EditorSidebar';
import { EditorOnboarding } from './EditorOnboarding';
import { PreviewPane, PreviewPaneHandle } from './PreviewPane';
import { InitialView } from './InitialView';
import { EventWizard, WizardResult } from './wizard/EventWizard';
import { SelectedElement, Attachment, ProjectPage, InvitationMetadata, EditorConfig, LocalImageFile } from '../types';
import { IMAGE_SOURCES } from '../constants';
import { generateWebProject, addModuleToProject, modifyProjectDesign, iterateModule, aiFillEventData } from '../services/aiService';
import { resolveSchema, missingRequired, applyDeterministicData, adaptContextoEvento, adaptarVocabularioEvento, collectTextTargets, applyTextByIndex } from '../server/eventDataSchema.js';
import type { MetricasElemento } from './editor/friendlyStyles';
import {
  aplicarEdicionEnElemento, alternarOculto, buscarElemento, cambiarElementoEnCodigo,
  nodoEnRuta, nodosAAlternar, rutaDelTexto,
  type EdicionElemento, type Visibilidad
} from './editor/elementEdit';
import { consumeCredit, saveInvitation, updateInvitationContent, getInvitationContent, getDefaultFonts, applyInvitationFonts, CODIGO_PLANTILLA_CATALOGO } from '../services/apiService';
import { injectMetadata, extractMetadata, buildMetadataFromHTML } from '../services/metadataService';
import { useAuth } from '../contexts/AuthContext';
import { getLocalImages, hasLocalImages, buildLocalImageContext, getEventFolder } from '../services/localImageService';
import { InvitationFile } from '../types';
import { normalizeEditableIds } from '../services/editableElementsService';
import { replaceBase64WithPlaceholders, extractModuleHtml, reinsertModuleHtml, insertModuleAtPosition } from '../services/moduleService';

const GENERATING_TEXTS = [
  'Generando Invitación...',
  'Agregando colores...',
  'Seleccionando fotos...',
  'Eligiendo la fuente ideal...',
  'Aplicando estilos...',
  'Creando diseño único...',
  'Optimizando elementos...',
  'Finalizando invitación...',
];

// Fallback local (solo si el re-theming server-side falla): actualiza el
// <link> de Google Fonts y las variables :root --font-base/--font-heading.
// No unifica font-family literales (eso lo hace el subsistema Post-RAG en el
// servidor), pero mantiene la selección funcional ante errores de red.
const applyFontsFallbackLocal = (html: string, fontBase: string, fontHeading: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const head = doc.head || doc.documentElement;

  const baseStack = `'${fontBase}', sans-serif`;
  const headingStack = fontHeading ? `'${fontHeading}', serif` : null;

  const families = [fontBase, ...(fontHeading && fontHeading !== fontBase ? [fontHeading] : [])];
  const href = `https://fonts.googleapis.com/css2?family=${families.map(f => encodeURIComponent(f).replace(/%20/g, '+')).join('&family=')}&display=swap`;

  let link = head.querySelector('link[data-editor-fonts]') as HTMLLinkElement | null;
  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('data-editor-fonts', 'true');
    link.setAttribute('rel', 'stylesheet');
    head.appendChild(link);
  }
  link.setAttribute('href', href);

  let styleEl = head.querySelector('style[data-editor-font-vars]') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.setAttribute('data-editor-font-vars', 'true');
    head.appendChild(styleEl);
  }
  styleEl.textContent = `:root { --font-base: ${baseStack}; ${headingStack ? `--font-heading: ${headingStack};` : ''} }`;

  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
};

export const EditorView: React.FC = () => {
  const { filename } = useParams<{ filename?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser, token } = useAuth();
  const userId = authUser?.id.toString() || '';
  const purchaseId = searchParams.get('purchaseId') || '';
  const activePlan = authUser?.plans?.find(p => p.purchase_id === purchaseId)
    || authUser?.plans?.find(p => (p.iteration_credits - p.iteration_used) > 0)
    || authUser?.plans?.[0];
  const iterationAvailable = activePlan ? Math.max(0, activePlan.iteration_credits - activePlan.iteration_used) : 0;
  const effectivePurchaseId = activePlan?.purchase_id || purchaseId;
  
  const [hasStarted, setHasStarted] = useState(false);
  // New event-first flow by default; ?modo=clasico keeps the previous free-text generator.
  const [classicMode, setClassicMode] = useState(searchParams.get('modo') === 'clasico');
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('Generando Invitación...');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  // === Datos específicos del evento (se piden durante la generación) ===
  // Mientras corre la generación el overlay de loading muestra un formulario
  // con los campos que requiere el tipo de evento. Si al terminar la
  // generación ya están todos los campos requeridos, se aplican y se entra;
  // si falta alguno, el overlay permanece avisando que la invitación ya está
  // generada pero necesita esos datos. La inyección es un proceso agéntico:
  // pase determinista (placeholders canónicos del 00-PROMPT-BASE + atributos
  // memory_*) + pase IA (Gemini indexa nodos compactos, sin base64).
  const [eventData, setEventData] = useState<Record<string, string>>({});
  const eventDataRef = useRef<Record<string, string>>({}); // espejo fresco (closures de generación)
  const [generationFinished, setGenerationFinished] = useState(false);
  const [applyingData, setApplyingData] = useState(false);
  const pendingCodeRef = useRef<string>('');
  const autoApplyRef = useRef(false);
  // El formulario de datos SOLO existe durante la generación de una invitación.
  // isGenInvitation distingue ese loading de los demás (guardar, tipografía,
  // iterar módulos), que muestran el spinner pero jamás el formulario.
  const [isGenInvitation, setIsGenInvitation] = useState(false);
  // El usuario saltó o envió el formulario mientras la generación corría:
  // el formulario desaparece, la generación sigue y al terminar entra directo.
  const [formHidden, setFormHidden] = useState(false);
  const formHiddenRef = useRef(false);
  const eventDataKey = `event_data_${purchaseId || 'nuevo'}`;
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const pencilBtnRef = useRef<HTMLElement>(null);
  const [isModuleSelectionMode, setIsModuleSelectionMode] = useState(false);
  const [selectedModuleName, setSelectedModuleName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    eventType: '',
    theme: '',
    primaryColor: '#f472b6',
    secondaryColor: '#fb7185',
    eventDetails: '',
    eventDate: '',
    eventTime: ''
  });
  const dataSchema = resolveSchema(editorConfig.eventType || 'Otro');
  const missingFields = missingRequired(dataSchema, eventData);
  const [showEventDataModal, setShowEventDataModal] = useState(false);
  const [applyingModalData, setApplyingModalData] = useState(false);
  const [colorVars, setColorVars] = useState<Record<string, string>>({});
  
  const [existingMetadata, setExistingMetadata] = useState<InvitationMetadata | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [rotatingTextIndex, setRotatingTextIndex] = useState(0);
  const rotatingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<PreviewPaneHandle>(null);

  // Tipografía global configurada por el admin (Google Fonts para textos y
  // títulos). Es la que usa la generación y el default del selector del editor.
  const [globalFonts, setGlobalFonts] = useState<{ fontBase: string; fontHeading: string }>({
    fontBase: 'Playfair Display',
    fontHeading: ''
  });
  const globalFontsRef = useRef(globalFonts);

  useEffect(() => {
    getDefaultFonts()
      .then(f => {
        const next = { fontBase: f.fontBase || 'Playfair Display', fontHeading: f.fontHeading || '' };
        setGlobalFonts(next);
        globalFontsRef.current = next;
      })
      .catch(err => console.warn('[FONTS] No se pudo cargar la tipografía global:', err));
  }, []);

  // Restaurar datos del evento tecleados antes de un refresh (por si el
  // usuario recarga durante una generación larga).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(eventDataKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setEventData(parsed);
        eventDataRef.current = parsed || {};
      }
    } catch { /* storage no disponible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDataKey]);

  const activePage = pages.find(p => p.id === activePageId);
  const code = activePage?.code || '';

  // Código de la página activa y su documento ya interpretado. Se conservan
  // entre ediciones: las invitaciones pesan varios MB y reinterpretarlas en
  // cada cambio (o en cada letra) trabaría el navegador.
  const codigoRef = useRef(code);
  const docCacheRef = useRef<{ fuente: string; doc: Document } | null>(null);
  // Texto que se está editando y su posición dentro del elemento. La posición
  // se fija al primer cambio y se conserva aunque el texto quede vacío: así
  // cada letra va siempre al mismo lugar.
  const textoEditadoRef = useRef<{ geminiId: string; ruta: number[] } | null>(null);
  // Elementos que acaba de cambiar el panel: la barra lateral actualiza solo
  // esos en vez de volver a interpretar la invitación completa.
  const [listaEditada, setListaEditada] = useState<{ codigo: string; elementos: EditableElement[] } | null>(null);

  // Si el código cambió por fuera de fijarCodigo, el documento guardado ya no sirve.
  useEffect(() => {
    if (activePage && activePage.code !== codigoRef.current) {
      codigoRef.current = activePage.code;
      docCacheRef.current = null;
    }
  }, [activePage]);

  /** El documento de la página activa, interpretado una sola vez. */
  const documentoActual = (): Document | null => {
    const fuente = codigoRef.current;
    if (!fuente) return null;
    if (docCacheRef.current?.fuente === fuente) return docCacheRef.current.doc;
    const doc = new DOMParser().parseFromString(fuente, 'text/html');
    docCacheRef.current = { fuente, doc };
    return doc;
  };

  /** Deja al día el código de la página activa. "doc" es ese código ya interpretado, si se tiene. */
  const fijarCodigo = (nuevo: string, doc?: Document) => {
    codigoRef.current = nuevo;
    docCacheRef.current = doc ? { fuente: nuevo, doc } : null;
    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, code: nuevo } : p));
  };

  /** Cuando la invitación cambia por completo se carga otra en el editor. */
  const cargarPagina = (newPage: ProjectPage) => {
    codigoRef.current = newPage.code;
    docCacheRef.current = null;
    textoEditadoRef.current = null;
    setPages([newPage]);
    setActivePageId(newPage.id);
    // Se interpreta el documento en cuanto el navegador esté desocupado: así el
    // primer cambio (y la primera letra) no esperan.
    const interpretar = () => documentoActual();
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(interpretar, { timeout: 4000 });
    else window.setTimeout(interpretar, 300);
  };

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (isGenerating) {
      setRotatingTextIndex(0);
      rotatingIntervalRef.current = setInterval(() => {
        setRotatingTextIndex(prev => (prev + 1) % GENERATING_TEXTS.length);
      }, 2500);
    } else {
      if (rotatingIntervalRef.current) {
        clearInterval(rotatingIntervalRef.current);
        rotatingIntervalRef.current = null;
      }
    }
    return () => {
      if (rotatingIntervalRef.current) {
        clearInterval(rotatingIntervalRef.current);
        rotatingIntervalRef.current = null;
      }
    };
  }, [isGenerating]);

  const loadFromCatalogo = (htmlContent: string) => {
    const metadata = extractMetadata(htmlContent);
    if (metadata) {
      setExistingMetadata(metadata);
      setEditorConfig({
        eventType: metadata.eventType || '',
        theme: metadata.theme || '',
        primaryColor: metadata.primaryColor || '#f472b6',
        secondaryColor: metadata.secondaryColor || '#fb7185',
        eventDetails: '',
        eventDate: '',
        eventTime: '',
        fontBase: metadata.fontBase || globalFontsRef.current.fontBase,
        fontHeading: metadata.fontHeading || ''
      });
    }
    
    const newPage: ProjectPage = {
      id: 'home-' + Date.now(),
      name: 'Inicio',
      path: 'index.html',
      code: normalizeEditableIds(htmlContent),
      isCreated: true
    };
    cargarPagina(newPage);
    setHasStarted(true);
  };

  const loadExistingInvitation = async (filename: string) => {
    setIsLoadingFile(true);
    try {
      const decodedFilename = decodeURIComponent(filename);
      const htmlContent = await getInvitationContent(decodedFilename, userId, token);
      
      // recuperar paleta previa si el archivo trae el bloque de overrides
      try {
        const dd = new DOMParser().parseFromString(htmlContent, 'text/html');
        const ov = dd.querySelector('style[data-editor-color-vars]');
        if (ov) {
          const vars: Record<string, string> = {};
          const re = /--([a-z-]+)-color:\s*([^;!]+)!?important?;/gi;
          let mm; while ((mm = re.exec(ov.textContent || ''))) vars[mm[1].replace(/-color$/, '').replace(/-color$/, '')] = mm[2].trim();
          setColorVars(vars);
        }
      } catch { /* noop */ }
      const metadata = extractMetadata(htmlContent);
      if (metadata) {
        setExistingMetadata(metadata);
        setEditorConfig({
          eventType: metadata.eventType || '',
          theme: metadata.theme || '',
          primaryColor: metadata.primaryColor || '#f472b6',
          secondaryColor: metadata.secondaryColor || '#fb7185',
          eventDetails: '',
          eventDate: '',
          eventTime: '',
          fontBase: metadata.fontBase || globalFontsRef.current.fontBase,
          fontHeading: metadata.fontHeading || ''
        });
      } else {
        // Invitación sin metadatos de fuentes: usar la tipografía global
        setEditorConfig(prev => ({ ...prev, fontBase: globalFontsRef.current.fontBase, fontHeading: globalFontsRef.current.fontHeading }));
      }
      
      const newPage: ProjectPage = {
        id: 'home-' + Date.now(),
        name: 'Inicio',
        path: 'index.html',
        code: normalizeEditableIds(htmlContent),
        isCreated: true
      };
      cargarPagina(newPage);
      setHasStarted(true);
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      alert(`Error al cargar la invitación: ${error.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // === Pipeline de datos específicos ===
  const handleEventDataChange = (key: string, value: string) => {
    setEventData(prev => {
      const next = { ...prev, [key]: value };
      eventDataRef.current = next;
      try { sessionStorage.setItem(eventDataKey, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  /**
   * Proceso agéntico de inyección de datos en la invitación YA generada:
   * 1) pase determinista: localiza placeholders canónicos (00-PROMPT-BASE)
   *    vía memory_key / data-gemini-id dentro de cada módulo;
   * 2) pase IA (Gemini vía /api/event-data/ai-fill): un índice compacto de
   *    nodos editables viaja al servidor (nunca el HTML ni base64) y vuelve
   *    una lista de colocaciones que se aplican localmente.
   * Cualquier fallo se degrada con elegancia: se continúa con lo aplicado.
   */
  const applyEventDataPipeline = async (rawCode: string, opts?: { force?: boolean }): Promise<string> => {
    try {
      const currentData = eventDataRef.current;
      const hasAny = Object.values(currentData).some(v => (v || '').toString().trim());
      if (!hasAny) return rawCode;

      const schema = resolveSchema(editorConfig.eventType);
      const doc = new DOMParser().parseFromString(rawCode, 'text/html');
      // Vocabulario por evento: los módulos del rack nacieron como diseños de
      // XV ("Mis XV años", "la quinceañera", "Chambelanes"…). Se adapta al
      // evento elegido ANTES de escribir los datos. Determinista, sin IA.
      try {
        const vocabCambios = adaptarVocabularioEvento(doc, editorConfig.eventType);
        if (vocabCambios.length) console.log('[VOCAB]', vocabCambios.length, 'textos adaptados al evento');
      } catch (err: any) {
        console.warn('[VOCAB] adaptación de vocabulario omitida:', err?.message);
      }
      // force=true: al terminar la generación los datos del formulario son la
      // verdad del usuario y GANAN sobre el texto (placeholder o inventado por
      // el adaptador IA). En el modal del editor se respeta lo ya escrito.
      const deterministicApplied = applyDeterministicData(doc, schema, currentData, opts);

      // Adaptación contextual por tipo de evento (XV/bautizo/cumpleaños = un
      // festejado): quita el slot del segundo nombre, oculta la segunda familia
      // de padres, ajusta rótulos ("Nuestros padres" → "Mis papás") y limpia
      // pares de padrinos vacíos. Determinista — no consume IA.
      let contextoCambios: string[] = [];
      try {
        contextoCambios = adaptContextoEvento(doc, schema, currentData);
      } catch (err: any) {
        console.warn('[EVENT-DATA] adaptación contextual omitida:', err?.message);
      }

      let ops: { i: number; t: string }[] = [];
      try {
        const targets = collectTextTargets(doc);
        if (targets.length > 0) {
          const res = await aiFillEventData(editorConfig.eventType, currentData, targets);
          ops = res.items || [];
        }
      } catch (err: any) {
        console.warn('[EVENT-DATA] pase IA no disponible, continúo con determinista:', err?.message);
      }

      for (const op of ops) applyTextByIndex(doc, op);
      console.log('[EVENT-DATA] determinista:', deterministicApplied, '| contexto:', contextoCambios.length, contextoCambios, '| colocaciones IA:', ops.length);
      return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
    } catch (err: any) {
      console.warn('[EVENT-DATA] inyección falló, la invitación continúa sin datos:', err?.message);
      return rawCode;
    }
  };

  /** Carga el HTML tal cual en el editor (sin inyección de datos). */
  const loadRawIntoEditor = (rawCode: string) => {
    const newPage: ProjectPage = {
      id: 'home-' + Date.now(),
      name: 'Inicio',
      path: 'index.html',
      code: normalizeEditableIds(rawCode),
      isCreated: true
    };
    cargarPagina(newPage);
    setExistingMetadata(null);
    setHasUnsavedChanges(true);
    setEditorConfig(prev => ({
      ...prev,
      fontBase: prev.fontBase || globalFontsRef.current.fontBase,
      fontHeading: prev.fontHeading || ''
    }));
  };

  /** Termina la generación: inyecta datos y carga la invitación en el editor. */
  const finishGeneration = async (rawCode: string) => {
    setApplyingData(true);
    setGeneratingMessage('Colocando tus datos en la invitación...');
    let finalCode = rawCode;
    try {
      finalCode = await applyEventDataPipeline(rawCode, { force: true });
    } finally {
      loadRawIntoEditor(finalCode);
      setGenerationFinished(false);
      setApplyingData(false);
      setGeneratingMessage('');
      try { sessionStorage.removeItem(eventDataKey); } catch { /* noop */ }
      pendingCodeRef.current = '';
      setIsGenInvitation(false);
      setIsGenerating(false);
    }
  };

  /** Omite el gate: entra al editor sin datos (podrá llenarlos después).
   *  Si la generación aún corre, solo oculta el formulario y espera: al
   *  terminar entrará directamente a la invitación sin aplicar datos. */
  const skipEventData = () => {
    if (pendingCodeRef.current) {
      loadRawIntoEditor(pendingCodeRef.current);
      setGenerationFinished(false);
      pendingCodeRef.current = '';
      setIsGenInvitation(false);
      setIsGenerating(false);
    } else {
      // Generación en curso: fuera formulario, el loading sigue su curso.
      formHiddenRef.current = true;
      setFormHidden(true);
      setGeneratingMessage('');
    }
  };

  /** Modal del editor: aplica los datos sobre el código actual. */
  const handleApplyModalData = async () => {
    if (!activePage || applyingModalData) return;
    setApplyingModalData(true);
    try {
      const injected = await applyEventDataPipeline(activePage.code);
      fijarCodigo(normalizeEditableIds(injected));
      setHasUnsavedChanges(true);
      setShowEventDataModal(false);
    } finally {
      setApplyingModalData(false);
    }
  };

  /** Paleta global: inyecta/reemplaza el bloque de overrides de variables. */
  // El color se ve al instante: se aplica directo en el documento de la vista
  // previa. El código de la invitación se actualiza un momento después, porque
  // el selector dispara un cambio por cada movimiento y no hace falta
  // reescribirlo en cada uno.
  const colorVarsRef = useRef(colorVars);
  const colorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cssDePaleta = (vars: Record<string, string>): string => {
    const entradas = Object.entries(vars).filter(([, v]) => v);
    return `/* Paleta del editor */\n:root, [data-gemini-id] {\n${entradas.map(([k, v]) => `  --${k}-color: ${v} !important;`).join('\n')}\n}`;
  };
  const aplicarPaletaAlCodigo = () => {
    colorDebounceRef.current = null;
    const base = codigoRef.current;
    const doc = documentoActual();
    if (!doc) return;
    let styleEl = doc.querySelector('style[data-editor-color-vars]') as HTMLStyleElement | null;
    const yaEstaba = !!styleEl;
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.setAttribute('data-editor-color-vars', 'true');
      doc.head.appendChild(styleEl);
    }
    const antes = yaEstaba ? styleEl.outerHTML : null;
    const css = cssDePaleta(colorVarsRef.current);
    styleEl.textContent = css;
    const nuevo = (antes ? cambiarElementoEnCodigo(base, antes, styleEl.outerHTML) : null)
      ?? '<!DOCTYPE html>' + doc.documentElement.outerHTML;
    fijarCodigo(nuevo, doc);
    previewRef.current?.aplicarEstilosDePaleta(css, base, nuevo);
  };
  const handleUpdateColorVars = (key: string, value: string) => {
    if (!activePage) return;
    const next = { ...colorVars, [key]: value };
    colorVarsRef.current = next;
    setColorVars(next);
    setHasUnsavedChanges(true);
    previewRef.current?.aplicarEstilosDePaleta(cssDePaleta(next), codigoRef.current, null);
    if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
    colorDebounceRef.current = setTimeout(aplicarPaletaAlCodigo, 180);
  };
  const handleResetColorVars = () => {
    if (!activePage) return;
    colorVarsRef.current = {};
    setColorVars({});
    setHasUnsavedChanges(true);
    previewRef.current?.aplicarEstilosDePaleta(cssDePaleta({}), codigoRef.current, null);
    if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
    colorDebounceRef.current = setTimeout(aplicarPaletaAlCodigo, 180);
  };

  /** Botón del formulario de datos (visible durante Y después de generar). */
  const handleSubmitEventData = async () => {
    if (missingFields.length > 0 || applyingData) return;
    if (!pendingCodeRef.current) {
      // La generación aún corre: el formulario desaparece, los datos se
      // aplicarán automáticamente en cuanto termine.
      autoApplyRef.current = true;
      formHiddenRef.current = true;
      setFormHidden(true);
      setGeneratingMessage('Datos listos. Se aplicarán al terminar la generación...');
      return;
    }
    await finishGeneration(pendingCodeRef.current);
  };

  const handleGenerate = async (prompt: string, attachments: Attachment[] = [], config?: EditorConfig) => {
    setIsGenerating(true);
    setGeneratingMessage('Generando Invitación...');
    setGenerationFinished(false);
    autoApplyRef.current = false;
    pendingCodeRef.current = '';
    setIsGenInvitation(true);
    formHiddenRef.current = false;
    setFormHidden(false);

    setHasStarted(true);

    if (config) {
      setEditorConfig(config);
      // Prefill: fecha/hora ya pedidas por el generador cuentan como datos.
      setEventData(prev => {
        const next = {
          ...prev,
          fecha: prev.fecha || config.eventDate || '',
          hora: prev.hora || config.eventTime || ''
        };
        eventDataRef.current = next;
        try { sessionStorage.setItem(eventDataKey, JSON.stringify(next)); } catch { /* noop */ }
        return next;
      });
    }

    const eventType = config?.eventType || '';
    let imageSource = IMAGE_SOURCES.find(s => s.id === 'loremflickr') || IMAGE_SOURCES[0];
    let enhancedPrompt = prompt;
    let localImages: LocalImageFile[] = [];

    if (eventType && hasLocalImages(eventType)) {
      setGeneratingMessage('Obteniendo imágenes del evento...');
      localImages = await getLocalImages(eventType);
      setGeneratingMessage('');
      
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
      eventDate: config.eventDate,
      eventTime: config.eventTime,
      eventDetails: config.eventDetails,
      visualStyle: config.visualStyle,
      mood: config.mood,
      // RAG Visual: id de la imagen de referencia elegida (si el método está activo).
      visualReferenceId: config.visualReferenceId ?? null
    } : undefined;

    const folder = getEventFolder(eventType);
    const imageFilesForApi = localImages.length > 0 && folder
      ? localImages.map(img => ({ folder: folder, filename: img.filename }))
      : undefined;

    setGeneratingMessage('');

    try {
      const generatedCode = await generateWebProject(enhancedPrompt, imageSource, attachments, editorConfigForApi, imageFilesForApi, purchaseId);
      pendingCodeRef.current = generatedCode;

      // GATE: al terminar la generación NUNCA se interrumpe al usuario mientras
      // escribe. Se le avisa que la invitación está lista y se le dejan dos
      // opciones: ENVIAR (procesa los datos que llenó) o SALTAR (entra tal
      // cual, los datos de la invitación se quedan como están). Solo se aplica
      // automáticamente si el propio usuario pulsó "aplicar al terminar"
      // mientras esperaba (autoApplyRef).
      if (autoApplyRef.current) {
        await finishGeneration(generatedCode);
      } else if (formHiddenRef.current) {
        // El usuario saltó (o envió y ya se aplicó) mientras generaba:
        // entra directo, sin gate.
        loadRawIntoEditor(generatedCode);
        pendingCodeRef.current = '';
        setIsGenInvitation(false);
        setIsGenerating(false);
      } else {
        setGenerationFinished(true);
        setGeneratingMessage('');
        // isGenerating permanece en true: el overlay muestra el formulario.
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error al generar la invitación: ${error.message}`);
      setHasStarted(false);
      setIsGenInvitation(false);
      formHiddenRef.current = false;
      setFormHidden(false);
      setIsGenerating(false);
    }
  };

  // Cambio de tipografía desde el editor: re-tematiza TODO el HTML con las
  // nuevas Google Fonts (textos/títulos) vía el subsistema Post-RAG en el
  // servidor. Ante fallo, aplica un fallback local (link + variables :root).
  const handleUpdateFont = async (which: 'base' | 'heading', value: string) => {
    if (!activePage) return;

    const nextBase = which === 'base' ? value : (editorConfig.fontBase || globalFontsRef.current.fontBase || 'Playfair Display');
    const nextHeading = which === 'heading' ? value : (editorConfig.fontHeading || '');

    if (nextBase === editorConfig.fontBase && nextHeading === (editorConfig.fontHeading || '')) {
      return;
    }

    setIsGenerating(true);
    setGeneratingMessage('Aplicando tipografía...');

    try {
      const result = await applyInvitationFonts(activePage.code, nextBase, nextHeading, token);
      fijarCodigo(result.html);
    } catch (error: any) {
      console.warn('[FONTS] Re-theming server falló, aplicando fallback local:', error?.message);
      try {
        const updatedCode = applyFontsFallbackLocal(activePage.code, nextBase, nextHeading);
        fijarCodigo(updatedCode);
      } catch (fallbackError) {
        console.error('[FONTS] Fallback local también falló:', fallbackError);
        alert('No se pudo cambiar la tipografía. Intenta de nuevo.');
      }
    } finally {
      setEditorConfig(prev => ({ ...prev, fontBase: nextBase, fontHeading: nextHeading }));
      setHasUnsavedChanges(true);
      setIsGenerating(false);
    }
  };

  const handleIterateModule = async (
    mode: 'add' | 'modify',
    description: string,
    targetModuleName?: string
  ) => {
    if (!activePage) return;

    if (iterationAvailable < 1) {
      alert('No tienes créditos de iteración disponibles en este plan.');
      return;
    }

    setIsGenerating(true);
    setGeneratingMessage(mode === 'add' ? 'Agregando Módulo...' : 'Modificando Módulo...');

    const editorConfigForApi = editorConfig ? {
      eventType: editorConfig.eventType,
      theme: editorConfig.theme,
      primaryColor: editorConfig.primaryColor,
      secondaryColor: editorConfig.secondaryColor,
      visualStyle: editorConfig.visualStyle,
      mood: editorConfig.mood,
      fontBase: editorConfig.fontBase,
      fontHeading: editorConfig.fontHeading
    } : undefined;

    let moduleHtml = '';
    let imageMap: Record<string, string> = {};

    try {
      if (mode === 'modify') {
        if (!targetModuleName) {
          throw new Error('Debes seleccionar un módulo para modificar.');
        }
        const rawModuleHtml = extractModuleHtml(activePage.code, targetModuleName);
        if (!rawModuleHtml) {
          throw new Error('No se pudo extraer el HTML del módulo seleccionado.');
        }
        const replaced = replaceBase64WithPlaceholders(rawModuleHtml);
        moduleHtml = replaced.html;
        imageMap = replaced.imageMap;
      }

      const generatedModuleHtml = await iterateModule(
        mode,
        moduleHtml,
        description,
        editorConfigForApi,
        effectivePurchaseId,
        imageMap
      );

      let updatedCode: string;
      if (mode === 'modify' && targetModuleName) {
        updatedCode = reinsertModuleHtml(activePage.code, targetModuleName, generatedModuleHtml);
      } else {
        const insertAfter = targetModuleName || 'Al final';
        updatedCode = insertModuleAtPosition(activePage.code, insertAfter, generatedModuleHtml);
      }

      updatedCode = normalizeEditableIds(updatedCode);
      fijarCodigo(updatedCode);
      setHasUnsavedChanges(true);
      setSelectedModuleName(null);
      setIsModuleSelectionMode(false);
    } catch (error: any) {
      console.error(error);
      alert(`Error al iterar módulo: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Mide un elemento tal como se ve en la vista previa: los controles en
  // palabras del editor calculan sus opciones a partir del diseño real.
  const measureElement = useCallback((geminiId: string): MetricasElemento | null => previewRef.current?.measureElement(geminiId) ?? null, []);

  // Un cambio hecho en el panel. Se aplica en dos documentos: el que se guarda
  // (el código de la invitación) y el que la persona está viendo. En los dos se
  // cambia solo ese elemento: reinterpretar la invitación completa en cada
  // cambio, o en cada letra, trabaría el navegador con archivos de varios MB.
  const handleUpdateElement = (geminiId: string, newContent?: string, newAttributes?: Record<string, string>, newStyles?: Record<string, string>) => {
    if (!activePage || !geminiId) return;

    const base = codigoRef.current;
    const doc = documentoActual();
    const el = doc ? buscarElemento(doc, geminiId) : null;
    if (!doc || !el) return;

    // La posición del texto se fija la primera vez que se edita este elemento.
    if (newContent !== undefined) {
      const fijado = textoEditadoRef.current;
      if (!fijado || fijado.geminiId !== geminiId || !nodoEnRuta(el, fijado.ruta)) {
        const ruta = rutaDelTexto(el);
        textoEditadoRef.current = ruta ? { geminiId, ruta } : null;
      }
    }
    const edicion: EdicionElemento = {
      content: newContent,
      attributes: newAttributes,
      styles: newStyles,
      rutaTexto: textoEditadoRef.current?.geminiId === geminiId ? textoEditadoRef.current.ruta : undefined
    };

    const antes = el.outerHTML;
    aplicarEdicionEnElemento(el, edicion);
    const despues = el.outerHTML;

    if (antes !== despues) {
      // En el código se sustituye el elemento; si no se localiza con seguridad
      // (p. ej. la invitación acaba de llegar del servidor), se reescribe completo.
      const nuevo = cambiarElementoEnCodigo(base, antes, despues) ?? doc.documentElement.outerHTML;
      fijarCodigo(nuevo, doc);
      // La vista previa cambia al instante, sin recargar: no se pierde el scroll.
      previewRef.current?.aplicarEdicion(geminiId, edicion, base, nuevo);
      // La barra lateral vuelve a leer solo este elemento. Si en el mismo
      // instante cambió más de uno, se juntan (y manda el último de cada uno).
      setListaEditada((prev) => {
        const registro = describirElemento(el, edicion.rutaTexto);
        const anteriores = prev && prev.codigo === base
          ? prev.elementos.filter((otro) => otro.geminiId !== registro.geminiId)
          : [];
        return { codigo: nuevo, elementos: [...anteriores, registro] };
      });
      setHasUnsavedChanges(true);
    }

    setSelectedElement(prev => prev ? {
      ...prev,
      content: newContent !== undefined ? newContent : prev.content,
      src: newAttributes?.src !== undefined ? newAttributes.src : prev.src,
      href: newAttributes?.href !== undefined ? newAttributes.href : prev.href,
    } : null);
  };

  // Ocultar o volver a mostrar. El cambio se hace en los dos documentos (el que
  // se guarda y el que la persona ve) con la misma regla, así la vista previa no
  // se recarga y no se pierde la posición.
  const alternarVisibilidad = (objetivo: Visibilidad) => {
    if (!activePage) return;
    const base = codigoRef.current;
    const doc = documentoActual();
    if (!doc) return;

    const nodos = nodosAAlternar(doc, objetivo);
    if (nodos.length === 0) return;
    const antes = nodos.map((nodo) => nodo.outerHTML);
    nodos.forEach(alternarOculto);

    let nuevo: string | null = base;
    for (let i = 0; i < nodos.length && nuevo !== null; i++) {
      nuevo = cambiarElementoEnCodigo(nuevo, antes[i], nodos[i].outerHTML);
    }
    // Si algún cambio no se pudo hacer punto por punto, se reescribe completo.
    if (nuevo === null) nuevo = doc.documentElement.outerHTML;
    fijarCodigo(nuevo, doc);

    previewRef.current?.aplicarCambio(
      (vivo) => nodosAAlternar(vivo, objetivo).forEach(alternarOculto),
      base,
      nuevo
    );

    // En la lista se vuelven a leer los elementos afectados: los del módulo y
    // todos los que estén dentro de lo que se ocultó o mostró.
    const afectados = new Set<Element>();
    doc.querySelectorAll('[data-gemini-id]').forEach((el) => {
      if (nodos.some((nodo) => nodo === el || nodo.contains(el))) afectados.add(el);
    });
    setListaEditada({ codigo: nuevo, elementos: Array.from(afectados).map((el) => describirElemento(el as HTMLElement)) });
    setHasUnsavedChanges(true);
  };

  const handleToggleModuleVisibility = (moduleName: string) => alternarVisibilidad({ modulo: moduleName });

  const handleToggleElementVisibility = (geminiId: string) => alternarVisibilidad({ geminiId });

  const handleUpdateCountdown = (targetDate: string) => {
    if (!activePage) return;
    const base = codigoRef.current;
    const doc = documentoActual();
    if (!doc) return;

    const ponerFecha = (en: Document) => {
      en.querySelectorAll('[data-gemini-id^="countdown"]').forEach((el) => el.setAttribute('data-countdown-target', targetDate));
    };
    ponerFecha(doc);

    let updatedCode = doc.documentElement.outerHTML;

    const dateInNewDate = /(new\s+Date\s*\(\s*['"])(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?[^'"]*?)(['"]\s*\))/gi;
    updatedCode = updatedCode.replace(dateInNewDate, `$1${targetDate}$3`);

    const varAssignment = /(countdown[_-]?target\s*[:=]\s*['"]?)(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?)/gi;
    updatedCode = updatedCode.replace(varAssignment, `$1${targetDate}`);

    const monthFormat = /(new\s+Date\s*\(\s*["'])([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+\d{2}:\d{2}:\d{2})(["']\s*\))/gi;
    updatedCode = updatedCode.replace(monthFormat, (match, prefix, _oldDate, suffix) => {
      const d = new Date(targetDate);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const formatted = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      return `${prefix}${formatted}${suffix}`;
    });

    // Los reemplazos de arriba cambian también los scripts, así que el documento
    // guardado ya no corresponde al código: se volverá a interpretar cuando haga falta.
    fijarCodigo(updatedCode);

    // La vista previa no se recarga: la cuenta se actualiza en el documento que
    // la persona está viendo.
    previewRef.current?.aplicarCambio(ponerFecha, base, updatedCode);
    previewRef.current?.sendCountdownUpdate(targetDate);

    setHasUnsavedChanges(true);
  };

  const handleSaveInvitation = async () => {
    if (code.length === 0) return;
    // Same plan the wizard charged (effectivePurchaseId), so a paid creation can always be saved.
    if (!effectivePurchaseId) {
      alert('Para guardar esta invitación necesitas un plan activo.');
      return;
    }

    setIsGenerating(true);
    setGeneratingMessage('Guardando Invitación...');
    
    try {
      const metadata = buildMetadataFromHTML(code, existingMetadata, editorConfig);
      const htmlWithMetadata = injectMetadata(code, metadata);
      
      // Una plantilla abierta desde el catálogo ("Personalizar esta invitación")
      // todavía no es del usuario: no se actualiza, se guarda como nueva.
      const esPlantillaDelCatalogo = async (): Promise<boolean> => {
        if (!filename) return false;
        try {
          await updateInvitationContent(userId, filename, htmlWithMetadata, token);
          return false;
        } catch (error: any) {
          if (error?.code !== CODIGO_PLANTILLA_CATALOGO) throw error;
          return true;
        }
      };

      if (await esPlantillaDelCatalogo()) {
        await saveInvitation(htmlWithMetadata, editorConfig.eventType, effectivePurchaseId, token);
        navigate('/');
      } else if (filename) {
        setSuccessMessage('Invitación actualizada correctamente');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        await saveInvitation(htmlWithMetadata, editorConfig.eventType, effectivePurchaseId, token);
        navigate('/');
      }
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error al guardar invitación:', error?.message || error);
      alert(error?.message || 'Error al guardar la invitación');
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

  const handleWizardCreated = (result: WizardResult) => {
    setEditorConfig(prev => ({
      ...prev,
      eventType: result.eventLabel,
      theme: result.designLabel,
      primaryColor: result.primaryColor,
      secondaryColor: result.secondaryColor,
      eventDetails: ''
    }));
    loadRawIntoEditor(result.html);
    setHasStarted(true);
  };

  if (!hasStarted && !filename && !classicMode) {
    return (
      <EventWizard
        token={token || ''}
        purchaseId={effectivePurchaseId}
        generationAvailable={activePlan ? Math.max(0, activePlan.generation_credits - activePlan.generation_used) : null}
        onCreated={handleWizardCreated}
        onUseClassic={() => setClassicMode(true)}
      />
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
        initialEventDate={editorConfig.eventDate || ''}
        initialEventTime={editorConfig.eventTime || ''}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-pink-50 text-gray-800 overflow-hidden font-sans relative">
      
      {isGenerating && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex flex-col items-center py-8 px-4">

            {/* Estado del proceso */}
            {!generationFinished || applyingData ? (
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-4" />
                <p className="text-pink-600 font-medium text-lg mb-3 text-center transition-all duration-500">
                  {generatingMessage || GENERATING_TEXTS[rotatingTextIndex]}
                </p>
                <div className="w-64 h-2 bg-pink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full animate-loading-bar" style={{ width: '40%', animation: 'loading-bar 2s ease-in-out infinite' }} />
                </div>
                <style>{`
                  @keyframes loading-bar {
                    0% { width: 10%; margin-left: 0%; }
                    50% { width: 50%; margin-left: 25%; }
                    100% { width: 10%; margin-left: 90%; }
                  }
                `}</style>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center mb-5 mt-2">
                <CheckCircle2 className="w-14 h-14 text-green-500 mb-2" />
                <p className="text-2xl font-bold text-gray-800">¡Tu invitación ya está generada!</p>
                <p className="text-sm text-gray-600 mt-2 max-w-md">
                  Puedes seguir llenando tus datos con calma — <span className="font-semibold text-gray-800">nada se va a cortar</span>.
                  Cuando termines, pulsa <span className="font-semibold text-pink-600">Enviar</span> y los colocaremos automáticamente
                  en su lugar exacto, o <span className="font-semibold text-gray-700">Saltar</span> para entrar ahora y editarlos después.
                </p>
              </div>
            )}

            {/* Formulario de datos del evento: SOLO durante la generación de una
                invitación (nunca en guardar/iterar/tipografía) y mientras el
                usuario no lo haya enviado o saltado. */}
            {isGenInvitation && !formHidden && !applyingData && dataSchema && (
              <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-pink-100 p-5 md:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-5 h-5 text-pink-500" />
                  <h3 className="text-lg font-bold text-gray-800">Datos de tu {dataSchema.label}</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {generationFinished
                    ? 'Enviar: colocaremos estos datos automáticamente en su lugar dentro de la invitación. Saltar: la invitación se queda como está y podrás llenarlos en el editor.'
                    : 'Llénalos mientras generamos: nada se cortará. Al terminar te pediremos Enviar o Saltar. La fecha y hora vienen del paso anterior.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dataSchema.fields.map((f) => {
                    const value = eventData[f.key] || '';
                    const isMissing = missingFields.includes(f.key);
                    return (
                      <div key={f.key} className={`flex flex-col gap-1 ${f.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          {f.label} {f.required && <span className="text-red-400">*</span>}
                        </label>
                        {f.type === 'textarea' ? (
                          <textarea
                            value={value}
                            onChange={(e) => handleEventDataChange(f.key, e.target.value)}
                            placeholder={f.placeholder || ''}
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                              isMissing ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-pink-200'
                            }`}
                          />
                        ) : (
                          <input
                            type={f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                            value={value}
                            onChange={(e) => handleEventDataChange(f.key, e.target.value)}
                            placeholder={f.placeholder || ''}
                            className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                              isMissing ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-pink-200'
                            }`}
                          />
                        )}
                        {f.help && <span className="text-[11px] text-gray-400">{f.help}</span>}
                      </div>
                    );
                  })}
                </div>

                {generationFinished && missingFields.length > 0 && (
                  <p className="text-xs text-red-500 mt-3">
                    Faltan campos requeridos ({missingFields.length}) para enviar los datos. También puedes saltar este paso.
                  </p>
                )}

                <button
                  onClick={handleSubmitEventData}
                  disabled={applyingData || (generationFinished && missingFields.length > 0)}
                  className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {applyingData && <Loader2 className="w-4 h-4 animate-spin" />}
                  {!applyingData && generationFinished && missingFields.length === 0 && <Send className="w-4 h-4" />}
                  {applyingData
                    ? 'Colocando datos...'
                    : generationFinished
                      ? (missingFields.length > 0 ? 'Completa los campos requeridos para enviar' : 'Enviar datos y ver mi invitación')
                      : (missingFields.length === 0
                          ? 'Datos listos: aplicar automáticamente al terminar'
                          : 'Guardar datos (se aplicarán al terminar)')}
                </button>
                <button
                  onClick={skipEventData}
                  disabled={applyingData}
                  className="mt-2 w-full py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  {generationFinished
                    ? 'Saltar: entrar ahora (los datos se quedan como están)'
                    : 'Omitir: llenaré los datos después en el editor'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboarding primera visita: destaca el botón Editar textos */}
      <EditorOnboarding
        onActivate={() => setIsSelectionMode(true)}
        targetRef={pencilBtnRef}
      />

      {!isFullscreen && (
        <EditorSidebar
          code={code}
          listaEditada={listaEditada}
          onResetColorVars={handleResetColorVars}
          selectedElementId={selectedElement?.geminiId || null}
          onUpdateElement={handleUpdateElement}
          onClearSelection={() => setSelectedElement(null)}
          isSelectionMode={isSelectionMode}
          onToggleSelectionMode={() => setIsSelectionMode(!isSelectionMode)}
          pencilBtnRef={pencilBtnRef}
          measureElement={measureElement}
          onIterateModule={handleIterateModule}
          onToggleModuleVisibility={handleToggleModuleVisibility}
          onToggleElementVisibility={handleToggleElementVisibility}
          onSaveInvitation={handleSaveInvitation}
          onUpdateCountdown={handleUpdateCountdown}
          hasCode={code.length > 0}
          hasUnsavedChanges={hasUnsavedChanges}
          onNavigateHome={() => setShowUnsavedModal(true)}
          iterationAvailable={iterationAvailable}
          isModuleSelectionMode={isModuleSelectionMode}
          onToggleModuleSelectionMode={() => {
            setIsModuleSelectionMode(!isModuleSelectionMode);
            setSelectedModuleName(null);
          }}
          selectedModuleName={selectedModuleName}
          onClearModuleSelection={() => setSelectedModuleName(null)}
          fontBase={editorConfig.fontBase}
          fontHeading={editorConfig.fontHeading}
          onFontChange={handleUpdateFont}
          colorVars={colorVars}
          onUpdateColorVars={handleUpdateColorVars}
          onOpenEventData={() => setShowEventDataModal(true)}
        />
      )}

      {showEventDataModal && dataSchema && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm overflow-y-auto flex items-start justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8 p-6">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-pink-500" />
                <h3 className="text-lg font-bold text-gray-800">Completar datos del evento</h3>
              </div>
              <button onClick={() => setShowEventDataModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Estos datos se colocarán automáticamente en su lugar dentro de la invitación. Los campos vacíos se dejan como están.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dataSchema.fields.map((f) => {
                const value = eventData[f.key] || '';
                return (
                  <div key={f.key} className={`flex flex-col gap-1 ${f.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea value={value} onChange={(e) => handleEventDataChange(f.key, e.target.value)} placeholder={f.placeholder || ''} rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200" />
                    ) : (
                      <input type={f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'} value={value}
                        onChange={(e) => handleEventDataChange(f.key, e.target.value)} placeholder={f.placeholder || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200" />
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleApplyModalData}
              disabled={applyingModalData}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {applyingModalData && <Loader2 className="w-4 h-4 animate-spin" />}
              {applyingModalData ? 'Colocando datos...' : 'Aplicar datos a la invitación'}
            </button>
          </div>
        </div>
      )}

      <PreviewPane 
        ref={previewRef}
        code={code} 
        onElementClick={(el) => {
          // Un texto sin identificador (por ejemplo, una parte de un párrafo)
          // recibe uno al elegirlo en la vista previa. Aquí se anota también en el
          // código de la invitación: si no, lo que se escriba no se podría guardar.
          if (el.geminiId && el.geminiId.startsWith('edit-') && activePage) {
            try {
              const base = codigoRef.current;
              const doc = documentoActual();
              const nuevoId = el.geminiId;
              let elegido: HTMLElement | null = null;
              if (doc && !buscarElemento(doc, nuevoId)) {
                // Se localiza por su lugar en la página (la vista previa manda la
                // posición del elemento) y se confirma que es el mismo: misma
                // etiqueta, mismo texto y todavía sin identificador.
                if (el.camino) {
                  let nodo: Element | null = doc.body;
                  for (const paso of el.camino) nodo = nodo ? nodo.children[paso] : null;
                  if (nodo && !nodo.getAttribute('data-gemini-id')
                    && nodo.tagName === el.tagName
                    && (nodo.textContent || '').trim() === (el.texto || '').trim()) {
                    elegido = nodo as HTMLElement;
                  }
                }
                // Si no hay posición o no coincide, se busca por contenido y solo se
                // toma si hay uno exactamente igual.
                if (!elegido && el.fullHtml) {
                  const tempEl = new DOMParser().parseFromString(el.fullHtml, 'text/html').body.firstElementChild as HTMLElement | null;
                  if (tempEl) {
                    tempEl.removeAttribute('data-gemini-id');
                    const sinId = tempEl.outerHTML;
                    const iguales = Array.from(doc.querySelectorAll(tempEl.tagName.toLowerCase()))
                      .filter((c) => !c.getAttribute('data-gemini-id') && c.outerHTML === sinId) as HTMLElement[];
                    if (iguales.length === 1) elegido = iguales[0];
                  }
                }
              }
              if (doc && elegido) {
                const antes = elegido.outerHTML;
                elegido.setAttribute('data-gemini-id', nuevoId);
                const nuevo = cambiarElementoEnCodigo(base, antes, elegido.outerHTML) ?? doc.documentElement.outerHTML;
                fijarCodigo(nuevo, doc);
                // La vista previa ya tenía el identificador: no hace falta recargarla.
                previewRef.current?.marcarCodigoVivo(base, nuevo);
                // El elemento entra a la lista del panel para poder editarlo.
                setListaEditada({ codigo: nuevo, elementos: [describirElemento(elegido)] });
              }
            } catch (err) {
              console.error('Error anotando el identificador del elemento:', err);
            }
          }
          setSelectedElement(el);
          // Modo selección persistente: NO desactivar automáticamente.
          // El usuario lo desactiva manualmente con el botón del lápiz.
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        isSelectionMode={isSelectionMode}
        selectedElementId={selectedElement?.geminiId || null}
        isModuleSelectionMode={isModuleSelectionMode}
        onModuleClick={(moduleName) => setSelectedModuleName(moduleName)}
      />

      {showUnsavedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-red-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">¿Salir sin guardar?</h2>
                  <p className="text-sm text-gray-500">Tienes cambios sin guardar</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Si sales ahora perderás la invitación generada y el crédito consumido. ¿Estás seguro de que quieres salir?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-medium transition-colors text-sm shadow-sm"
              >
                Quedarse
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  setHasUnsavedChanges(false);
                  navigate('/');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors text-sm"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-green-500 text-white px-8 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-bounce">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-base font-semibold">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
