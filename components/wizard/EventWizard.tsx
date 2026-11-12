import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, Home, Loader2, Palette, Sparkles, X, AlertCircle, Wand2, Image as ImagePlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ComposeReport,
  EventFormData,
  EventPack,
  EventTypeSummary,
  fillProvidedInvitation,
  getEventPack,
  getEventTypes
} from '../../services/composeService';
import { generateWebProject } from '../../services/aiService';
import { IMAGE_SOURCES } from '../../constants';
import { DynamicEventForm, initialFormData } from './DynamicEventForm';

/** Comprime una imagen del cliente (máx 800px de ancho, JPEG q=0.82) y
 *  devuelve un data URI listo para incrustar en la invitación. */
const optimizarImagen = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  const maxW = 800;
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
};

/** Etiqueta legible de cada módulo para mostrar al usuario. */
const ETIQUETAS_MODULO: Record<string, string> = {
  portada: 'Portada', padres: 'Papás y familia', padrinos: 'Padrinos', corte: 'Corte de honor',
  ubicacion: 'Ubicación', itinerario: 'Programa', vestimenta: 'Vestimenta', regalos: 'Regalos',
  galeria: 'Galería', confirmacion: 'Confirmación', countdown: 'Cuenta regresiva', detalles: 'Detalles'
};

/** Detecta los espacios de imagen de la invitación: recorre el HTML base,
 *  encuentra cada placeholder loremflickr y lo asocia a su módulo (por el
 *  data-gemini-id de la sección contenedora). Devuelve la lista en orden. */
interface FotoSlot {
  idx: number;
  etiqueta: string;
  url: string;
}
const detectarSlots = (html: string): FotoSlot[] => {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const slots: FotoSlot[] = [];
    const secciones = Array.from(doc.querySelectorAll('section[data-gemini-id]'));
    let idx = 0;
    for (const sec of secciones) {
      const gid = sec.getAttribute('data-gemini-id') || '';
      const tipo = gid.split('-')[0];
      const etiqueta = ETIQUETAS_MODULO[tipo] || tipo;
      // <img src="loremflickr...">
      sec.querySelectorAll('img[src*="loremflickr"]').forEach((img) => {
        slots.push({ idx: idx++, etiqueta, url: img.getAttribute('src') || '' });
      });
      // background-image: url('loremflickr...')
      sec.querySelectorAll<HTMLElement>('[style*="loremflickr"]').forEach((el) => {
        const style = el.getAttribute('style') || '';
        if (/loremflickr/.test(style)) slots.push({ idx: idx++, etiqueta: etiqueta + ' (fondo)', url: '' });
      });
    }
    // también en <style> (background-image en CSS)
    const styleTags = doc.querySelectorAll('style');
    styleTags.forEach((st) => {
      const css = st.textContent || '';
      const matches = css.match(/loremflickr\.com[^'"')]+/g) || [];
      matches.forEach(() => slots.push({ idx: idx++, etiqueta: 'Fondo de sección', url: '' }));
    });
    return slots;
  } catch {
    return [];
  }
};

/** Reemplaza las URLs loremflickr por fotos del cliente EN ORDEN de slot. */
const reemplazarSlots = (html: string, fotos: { dataUri: string }[]): string => {
  if (!fotos.length) return html;
  let i = 0;
  return html.replace(/https:\/\/loremflickr\.com\/[^"')\s]+/g, (url) => {
    if (i < fotos.length) { i++; return fotos[i - 1].dataUri; }
    return url;
  });
};

/**
 * Creación combinada, generación en paralelo:
 *   1. Elige el evento (paquete de conocimiento).
 *   2. "Tu estilo": describe lo que quiere + colores → CONTINUAR (sin loading).
 *   3. "Datos y vista previa": el usuario llena el formulario MIENTRAS la
 *      generación agéntica corre en background. El preview muestra el
 *      progreso y en cuanto la base está lista se rellena con los datos ya
 *      escritos. Si el usuario termina antes, "Abrir en el editor" espera
 *      a que la generación concluya y entra directo.
 */

export interface WizardResult {
  html: string;
  eventLabel: string;
  designLabel: string;
  primaryColor: string;
  secondaryColor: string;
}

interface Props {
  token: string;
  purchaseId: string;
  generationAvailable: number | null;
  onCreated: (result: WizardResult) => void;
  onUseClassic: () => void;
}

type Step = 'event' | 'brief' | 'details';

interface Saved {
  savedAt?: number;
  step: Step;
  eventType: string;
  brief: string;
  data: EventFormData;
  colors: { custom: boolean; primary: string; secondary: string };
}

const storageKey = (purchaseId: string) => `im_wizard_${purchaseId || 'nuevo'}`;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const load = (key: string): Saved | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Saved;
    if (!value.savedAt || Date.now() - value.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
};
const save = (key: string, value: Saved | null) => {
  try {
    if (value) localStorage.setItem(key, JSON.stringify({ ...value, savedAt: Date.now() }));
    else localStorage.removeItem(key);
  } catch { /* noop */ }
};

const LEGACY_EVENT: Record<string, string> = {
  quinceanera: 'XV Años', boda: 'Boda', bautizo: 'Bautizo', comunion: 'Primera Comunión',
  confirmacion: 'Confirmación', cumpleanos: 'Cumpleaños', baby_shower: 'Baby Shower', otro: 'Otro'
};

const MODULE_NAMES: Record<string, string> = {
  portada: 'Portada', countdown: 'Cuenta regresiva', padres: 'Papás y familia', padrinos: 'Padrinos', corte: 'Corte / cortejo',
  ubicacion: 'Ubicación', itinerario: 'Programa', vestimenta: 'Vestimenta', regalos: 'Regalos', galeria: 'Galería', confirmacion: 'Confirmación'
};

const Steps: React.FC<{ step: Step }> = ({ step }) => {
  const items: [Step, string][] = [['event', 'Evento'], ['brief', 'Tu estilo'], ['details', 'Datos y vista previa']];
  const idx = items.findIndex(([s]) => s === step);
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Pasos">
      {items.map(([s, label], i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold ${i < idx ? 'bg-pink-500 text-white' : i === idx ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-400' : 'bg-gray-100 text-gray-400'}`} aria-current={i === idx ? 'step' : undefined}>
            {i < idx ? <Check className="w-4 h-4" /> : i + 1}
          </span>
          <span className={i === idx ? 'text-gray-800 font-medium' : 'text-gray-400 hidden sm:inline'}>{label}</span>
          {i < items.length - 1 && <span className="w-6 h-px bg-gray-300" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
};

const SUGERENCIAS = [
  'Elegante y romántico, con flores doradas y tonos pastel',
  'Moderno y minimalista, mucho espacio en blanco y tipografía fina',
  'Boho con terracota, hojas de palma y madera',
  'Clásico con azul marino, dorado y detalles de lazo'
];

export const EventWizard: React.FC<Props> = ({ token, purchaseId, generationAvailable, onCreated, onUseClassic }) => {
  const navigate = useNavigate();
  const key = storageKey(purchaseId);
  const saved = useMemo(() => load(key), [key]);

  const [step, setStep] = useState<Step>(saved?.step === 'details' ? 'brief' : (saved?.step || 'event'));
  const [eventTypes, setEventTypes] = useState<EventTypeSummary[]>([]);
  const [eventType, setEventType] = useState(saved?.eventType || '');
  const [pack, setPack] = useState<EventPack | null>(null);
  const [brief, setBrief] = useState(saved?.brief || '');
  const [data, setData] = useState<EventFormData>(saved?.data || {});
  const [colors, setColors] = useState(saved?.colors || { custom: false, primary: '#d16a8a', secondary: '#eda7bc' });
  const [baseHtml, setBaseHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ html: string; missing: { key: string; label: string }[]; report: ComposeReport } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [fotos, setFotos] = useState<(string | null)[]>([]);
  const [fotoLoading, setFotoLoading] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fotosInputRef = useRef<HTMLInputElement | null>(null);
  const fotosTargetSlot = useRef<number | null>(null);
  const [slots, setSlots] = useState<FotoSlot[]>([]);
  // La generación corre en background: el promise y el resultado viven en
  // refs para que finish() pueda esperarlos sin depender del estado React.
  const genPromiseRef = useRef<Promise<string | null> | null>(null);
  const genResultRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showPreviewMobile) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPreviewMobile(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPreviewMobile]);

  useEffect(() => {
    save(key, { step: step === 'details' ? 'brief' : step, eventType, brief, data, colors });
  }, [key, step, eventType, brief, data, colors]);

  useEffect(() => {
    getEventTypes(token).then(setEventTypes).catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    if (!eventType) return;
    let current = true;
    setLoading(true);
    getEventPack(eventType, token)
      .then((p) => {
        if (!current) return;
        setPack(p);
        const inicial = initialFormData(p);
        setData((prev) => {
          const fusion: EventFormData = { ...inicial };
          for (const k of Object.keys(prev)) {
            const v = prev[k];
            if (Array.isArray(inicial[k])) fusion[k] = Array.isArray(v) ? v : inicial[k];
            else if (typeof v === typeof inicial[k]) fusion[k] = v;
          }
          return fusion;
        });
      })
      .catch((e) => { if (current) setError(e.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [eventType, token]);

  const preferences = colors.custom ? { primaryColor: colors.primary, secondaryColor: colors.secondary } : {};

  /** HTML con las fotos del cliente aplicadas — se usa en el preview Y al finalizar. */
  const htmlConFotos = useMemo(() => {
    if (!baseHtml) return null;
    const activas = fotos.map(f => f ? { dataUri: f } : null).filter(Boolean) as { dataUri: string }[];
    if (!activas.length) return baseHtml;
    return reemplazarSlots(baseHtml, activas);
  }, [baseHtml, fotos]);

  // Vista previa en vivo: usa el HTML CON las fotos del cliente aplicadas
  // para que se vean en tiempo real, no solo al finalizar.
  useEffect(() => {
    if (step !== 'details' || !htmlConFotos || !eventType) return;
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPreviewLoading(true);
      fillProvidedInvitation({ html: htmlConFotos, eventType, data, preferences, purchaseId }, token, ctrl.signal)
        .then((r) => setPreview({ html: r.html, missing: r.missing, report: r.report }))
        .catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
        .finally(() => { if (abortRef.current === ctrl) setPreviewLoading(false); });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, htmlConFotos, eventType, data, colors, purchaseId, token]);

  const missingKeys = useMemo(() => new Set((preview?.missing || []).map((m) => m.key)), [preview]);

  const chooseEvent = (id: string) => {
    if (id !== eventType) {
      setEventType(id);
      setPack(null);
      setData({});
      setBaseHtml(null);
      setPreview(null);
      setGenError(null);
      genPromiseRef.current = null;
      genResultRef.current = null;
    }
    setStep('brief');
  };

  const startOver = () => {
    save(key, null);
    setStep('event');
    setEventType('');
    setBrief('');
    setBaseHtml(null);
    setData({});
    setPreview(null);
    setGenError(null);
    genPromiseRef.current = null;
    genResultRef.current = null;
  };

  /**
   * "Continuar" del paso 2: arranca la generación agéntica EN BACKGROUND y
   * pasa inmediatamente al paso 3. El usuario llena datos mientras tanto;
   * el preview aparece en cuanto la base esté lista.
   */
  const startGeneration = () => {
    if (!brief.trim() || !eventType || !pack) return;
    if (generationAvailable !== null && generationAvailable < 1) {
      setError('No tienes créditos de generación disponibles en este plan.');
      return;
    }
    setGenerating(true);
    setGenError(null);
    setError(null);
    setBaseHtml(null);
    setPreview(null);
    genResultRef.current = null;

    // Cambiar de paso INMEDIATAMENTE — sin pantalla de carga.
    setStep('details');

    const imageSource = IMAGE_SOURCES.find((s) => s.id === 'loremflickr') || IMAGE_SOURCES[0];
    const prompt = `Invitación de ${pack.label}. Estilo y deseos del cliente: ${brief.trim()}`;
    const editorConfig = {
      eventType: LEGACY_EVENT[eventType] || pack.label,
      theme: '',
      primaryColor: colors.custom ? colors.primary : '',
      secondaryColor: colors.custom ? colors.secondary : '',
      visualStyle: '',
      mood: ''
    };

    genPromiseRef.current = (async () => {
      try {
        const html = await generateWebProject(prompt, imageSource, [], editorConfig, undefined, purchaseId || undefined);
        if (!html || html.length < 200) throw new Error('La generación devolvió una invitación vacía.');
        genResultRef.current = html;
        setBaseHtml(html); // dispara el preview automáticamente
        return html;
      } catch (e) {
        const msg = (e as Error).message || 'No se pudo generar el diseño base.';
        setGenError(msg);
        return null;
      } finally {
        setGenerating(false);
      }
    })();
  };

  /** Detecta los slots cuando la base llega. */
  useEffect(() => {
    if (!baseHtml) { setSlots([]); setFotos([]); return; }
    const detectados = detectarSlots(baseHtml);
    setSlots(detectados);
    setFotos(new Array(detectados.length).fill(null));
  }, [baseHtml]);

  /** Sube una foto para un slot específico (o el primero vacío si no se indica). */
  const subirFoto = async (file: File, slotIdx?: number) => {
    if (!/^image\//.test(file.type)) return;
    const target = slotIdx ?? fotos.findIndex((f) => f === null);
    if (target === -1 || target >= slots.length) return;
    setFotoLoading(target);
    try {
      const dataUri = await optimizarImagen(file);
      setFotos(prev => { const next = [...prev]; next[target] = dataUri; return next; });
    } catch { /* noop */ } finally { setFotoLoading(null); }
  };

  /** Sube varias fotos: se asignan a los slots vacíos en orden. */
  const subirVarias = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => /^image\//.test(f.type));
    for (let i = 0; i < imgs.length; i++) {
      const vacio = fotos.findIndex((f) => f === null);
      if (vacio === -1) break;
      await subirFoto(imgs[i], vacio);
    }
  };

  const quitarFoto = (slotIdx: number) => {
    setFotos(prev => { const next = [...prev]; next[slotIdx] = null; return next; });
  };

  /** Cierre: espera la generación si sigue corriendo, luego llena y abre editor. */
  const finish = async () => {
    if (!eventType || !pack) return;
    setFinishing(true);
    setError(null);
    try {
      let html = htmlConFotos ?? genResultRef.current;
      // El usuario fue más rápido que la generación: esperarla.
      if (!html && genPromiseRef.current) {
        html = await genPromiseRef.current;
        if (html) {
          const activas = fotos.map(f => f ? { dataUri: f } : null).filter(Boolean) as { dataUri: string }[];
          if (activas.length) html = reemplazarSlots(html, activas);
        }
      }
      if (!html) {
        throw new Error(genError || 'El diseño no pudo generarse. Vuelve a "Tu estilo" e intenta de nuevo.');
      }
      const r = await fillProvidedInvitation({ html, eventType, data, preferences, purchaseId }, token);
      save(key, null);
      onCreated({
        html: r.html,
        eventLabel: pack.label,
        designLabel: 'Diseño personalizado',
        primaryColor: colors.custom ? colors.primary : '#f472b6',
        secondaryColor: colors.custom ? colors.secondary : '#fb7185'
      });
    } catch (e) {
      const err = e as Error & { missing?: { key: string; label: string }[] };
      setError(err.missing?.length ? `Faltan datos: ${err.missing.map((m) => m.label).join(', ')}` : err.message);
    } finally {
      setFinishing(false);
    }
  };

  const colorPicker = (
    <section className="bg-white/80 rounded-3xl border border-pink-200 shadow-sm p-5 flex flex-col gap-3" aria-labelledby="t-colors">
      <h3 id="t-colors" className="text-lg font-bold text-gray-800 flex items-center gap-2"><Palette className="w-5 h-5 text-pink-500" /> Colores</h3>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name="colors" checked={!colors.custom} onChange={() => setColors({ ...colors, custom: false })} className="accent-pink-500" /> Que el diseño los elija</label>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name="colors" checked={colors.custom} onChange={() => setColors({ ...colors, custom: true })} className="accent-pink-500" /> Personalizar</label>
      {colors.custom && (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">Principal <input type="color" value={colors.primary} onChange={(e) => setColors({ ...colors, primary: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">Acento <input type="color" value={colors.secondary} onChange={(e) => setColors({ ...colors, secondary: e.target.value })} /></label>
        </div>
      )}
    </section>
  );

  // El preview tiene 3 estados: generando la base → preview vivo → error de generación
  const previewPanel = (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-pink-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-pink-100 text-sm">
        <span className="font-semibold text-gray-700">
          {generating ? 'Diseñando…' : 'Vista previa · tu diseño'}
        </span>
        {(generating || previewLoading) && <Loader2 className="w-4 h-4 animate-spin text-pink-500" aria-label="Trabajando" />}
      </div>

      {generating ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 min-h-[380px]">
          <div className="w-14 h-14 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-pink-600 font-medium">Tu invitación se está diseñando</p>
          <p className="text-xs text-gray-500 max-w-[220px] text-center leading-relaxed">
            Ve llenando tus datos — en cuanto el diseño esté listo aparecerá aquí con todo lo que ya escribiste.
          </p>
          <div className="mt-2 w-32 h-1.5 bg-pink-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : genError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 min-h-[380px]">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-red-600 text-sm font-medium text-center">{genError}</p>
          <button type="button" onClick={() => { setStep('brief'); setGenError(null); }} className="px-4 py-2 bg-pink-50 border border-pink-200 rounded-xl text-sm text-pink-600 hover:bg-pink-100">
            Volver a intentarlo
          </button>
        </div>
      ) : preview ? (
        <iframe title="Vista previa de la invitación" srcDoc={preview.html} sandbox="allow-scripts" className="flex-1 w-full min-h-[480px] bg-white" />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-6">Preparando la vista previa…</div>
      )}

      {!generating && !genError && preview && (
        <div className="px-4 py-3 border-t border-pink-100 text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
          {(preview.missing || []).length > 0 && <p className="text-red-600"><b>Falta:</b> {(preview.missing || []).map((m) => m.label).join(' · ')}</p>}
          {(preview.report?.skipped || []).length > 0 && (
            <p><b>No aparecerán:</b> {(preview.report?.skipped || []).map((s) => `${MODULE_NAMES[s.type] || s.type} (${(s.reason || '').replace(/\.$/, '').toLowerCase()})`).join(' · ')}</p>
          )}
          {(preview.report?.warnings || []).length > 0 && <p className="text-amber-700"><b>Revisa:</b> {(preview.report?.warnings || []).map((w) => `${MODULE_NAMES[w.type] || w.type}: ${w.kind}`).join(' · ')}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-pink-50 text-gray-800">
      <header className="sticky top-0 z-30 bg-pink-50/90 backdrop-blur border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-2 bg-white border border-pink-200 rounded-xl text-sm text-gray-600 hover:text-pink-600"><Home className="w-4 h-4" /> Dashboard</button>
          <Steps step={step} />
          <button type="button" onClick={startOver} className="text-sm text-gray-500 hover:text-pink-600">Empezar de nuevo</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button type="button" onClick={() => setError(null)} className="ml-auto" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
          </div>
        )}

        {step === 'event' && (
          <section aria-labelledby="t-event">
            <h1 id="t-event" className="text-3xl font-bold text-gray-800 mb-1">¿Qué vas a celebrar?</h1>
            <p className="text-gray-500 mb-6">Elige el tipo de evento. Después nos cuentas el estilo y armamos tu invitación.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {eventTypes.map((t) => (
                <button key={t.id} type="button" onClick={() => chooseEvent(t.id)} className={`text-left rounded-2xl border-2 bg-white p-5 hover:border-pink-400 hover:shadow-md transition-all ${eventType === t.id ? 'border-pink-500' : 'border-pink-100'}`}>
                  <p className="text-lg font-bold text-gray-800">{t.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={onUseClassic} className="mt-8 text-sm text-gray-500 underline hover:text-pink-600">Prefiero el modo clásico completo</button>
          </section>
        )}

        {step === 'brief' && pack && (
          <section aria-labelledby="t-brief" className="max-w-3xl">
            <button type="button" onClick={() => setStep('event')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-pink-600 mb-3"><ArrowLeft className="w-4 h-4" /> Cambiar evento</button>
            <h1 id="t-brief" className="text-3xl font-bold text-gray-800 mb-1">Cuéntanos cómo la quieres</h1>
            <p className="text-gray-500 mb-6">Describe el estilo y continúa — el diseño se genera mientras llenas tus datos.</p>
            <div className="bg-white rounded-3xl border border-pink-200 shadow-sm p-5 flex flex-col gap-4">
              <label htmlFor="brief" className="text-sm font-semibold text-gray-700">Tu invitación de {pack.label}</label>
              <textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={5}
                maxLength={1200}
                placeholder="Ej. Elegante y romántico con toques dorados, flores suaves, tipografía fina…"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200 resize-y"
              />
              <div className="flex flex-wrap gap-2">
                {SUGERENCIAS.map((s) => (
                  <button key={s} type="button" onClick={() => setBrief(s)} className="px-3 py-1.5 text-xs bg-pink-50 border border-pink-200 rounded-full text-pink-700 hover:bg-pink-100 transition-colors">{s}</button>
                ))}
              </div>
              {generationAvailable !== null && <p className="text-xs text-gray-500">Créditos disponibles: {generationAvailable}</p>}
            </div>
            <div className="mt-4">{colorPicker}</div>
            <div className="sticky bottom-0 mt-6 py-4 bg-pink-50/95 flex justify-end">
              <button type="button" disabled={!brief.trim()} onClick={startGeneration} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-40 text-white rounded-xl font-semibold shadow-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5" /> Continuar con mis datos
              </button>
            </div>
          </section>
        )}

        {step === 'details' && pack && (
          <section aria-labelledby="t-details">
            <button type="button" onClick={() => { setStep('brief'); setGenError(null); if (genPromiseRef.current) { genPromiseRef.current = null; genResultRef.current = null; setGenerating(false); setBaseHtml(null); setPreview(null); } }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-pink-600 mb-3">
              <ArrowLeft className="w-4 h-4" /> Volver a describir el estilo
            </button>
            <h1 id="t-details" className="text-3xl font-bold text-gray-800 mb-1">
              Datos de tu {pack.label.split(' /')[0]}
              {generating && <span className="ml-3 text-sm font-normal text-pink-500 inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> diseño en curso</span>}
            </h1>
            <p className="text-gray-500 mb-6">Llena lo que aplique{generating ? ' — el diseño se está generando en paralelo' : ' — la vista previa se actualiza mientras escribes'}.</p>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
              <div className="flex flex-col gap-4">
                <DynamicEventForm pack={pack} data={data} onChange={setData} missingKeys={missingKeys} />
                {colorPicker}
                {/* Fotos personales: slots etiquetados por sección de la invitación */}
                <section className="bg-white/80 rounded-3xl border border-pink-200 shadow-sm p-5 flex flex-col gap-3" aria-labelledby="t-fotos">
                  <h3 id="t-fotos" className="text-lg font-bold text-gray-800 flex items-center gap-2"><ImagePlus className="w-5 h-5 text-pink-500" /> Fotos de tu invitación</h3>
                  {generating ? (
                    <p className="text-xs text-gray-400 italic">Los espacios aparecerán en cuanto el diseño esté listo.</p>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Este diseño no tiene espacios de foto reemplazables.</p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">Cada espacio muestra en qué parte de la invitación irá la foto. Sube una para un espacio específico o varias a la vez (se asignan en orden).</p>
                      <div className="flex flex-col gap-2">
                        {slots.map((slot) => {
                          const foto = fotos[slot.idx];
                          const cargando = fotoLoading === slot.idx;
                          return (
                            <div key={slot.idx} className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${foto ? 'border-emerald-200 bg-emerald-50/40' : 'border-dashed border-pink-200 bg-pink-50/20'}`}>
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                {cargando ? <Loader2 className="w-5 h-5 animate-spin text-pink-500" /> :
                                 foto ? <img src={foto} alt={`Foto ${slot.etiqueta}`} className="w-full h-full object-cover" /> :
                                 <ImagePlus className="w-4 h-4 text-gray-300" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-700 truncate">{slot.etiqueta}</p>
                                <p className="text-[10px] text-gray-400">{foto ? 'Foto lista — se ve en el preview' : 'Espacio de muestra (se reemplaza)'}</p>
                              </div>
                              {foto ? (
                                <button type="button" onClick={() => quitarFoto(slot.idx)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors" aria-label={`Quitar foto de ${slot.etiqueta}`} title="Quitar foto">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button type="button" onClick={() => { fotosTargetSlot.current = slot.idx; fotosInputRef.current?.click(); }}
                                  disabled={cargando} className="px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-pink-600 text-xs font-medium hover:bg-pink-100 transition-colors disabled:opacity-40">
                                  {cargando ? '...' : 'Subir'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => { fotosTargetSlot.current = null; fotosInputRef.current?.click(); }}
                        className="self-start flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-pink-300 text-pink-500 hover:bg-pink-50 text-sm font-medium transition-colors">
                        <ImagePlus className="w-4 h-4" /> Subir varias a la vez
                      </button>
                      <input ref={fotosInputRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || !files.length) return;
                          const target = fotosTargetSlot.current;
                          if (target !== null && files.length === 1) { subirFoto(files[0], target); }
                          else { subirVarias(files); }
                          fotosTargetSlot.current = null;
                          e.target.value = '';
                        }} />
                      {fotos.filter(Boolean).length > 0 && (
                        <p className="text-[11px] text-emerald-600 font-medium">{fotos.filter(Boolean).length} de {slots.length} fotos asignadas — mira el preview.</p>
                      )}
                    </>
                  )}
                </section>
              </div>
              <div className="hidden lg:block sticky top-20 h-[calc(100vh-7rem)]">{previewPanel}</div>
            </div>

            <div className="sticky bottom-0 mt-6 py-4 bg-pink-50/95 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button type="button" onClick={() => setShowPreviewMobile(true)} className="lg:hidden w-full sm:w-auto px-5 py-3 border border-pink-300 rounded-xl text-pink-600 font-semibold flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> {generating ? 'Ver progreso' : 'Ver vista previa'}</button>
              <button
                type="button"
                onClick={finish}
                disabled={finishing || (!generating && !preview) || (!!genError)}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-40 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              >
                {finishing ? <Loader2 className="w-5 h-5 animate-spin" /> : generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {finishing ? 'Abriendo…' : generating ? 'Esperando el diseño…' : 'Abrir en el editor'}
              </button>
            </div>
          </section>
        )}
      </main>

      {showPreviewMobile && (
        <div className="fixed inset-0 z-50 bg-black/40 p-3 flex flex-col lg:hidden" role="dialog" aria-modal="true" aria-label="Vista previa">
          <button type="button" autoFocus onClick={() => setShowPreviewMobile(false)} className="self-end mb-2 bg-white rounded-full p-2" aria-label="Cerrar vista previa"><X className="w-5 h-5" /></button>
          <div className="flex-1 min-h-0">{previewPanel}</div>
        </div>
      )}
    </div>
  );
};
