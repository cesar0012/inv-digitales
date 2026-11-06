import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, Home, Loader2, Palette, Sparkles, X, AlertCircle, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ComposeReport,
  createInvitation as _unusedCreate,
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
void _unusedCreate; // el cierre ya no usa /compose/create: la base ya gastó el crédito

/**
 * Creación combinada (evento → estilo → datos):
 *   1. Elige el evento (paquete de conocimiento).
 *   2. "Tu estilo": el cliente DESCRIBE lo que quiere y (opcional) sus
 *      colores; el PROCESO AGÉNTICO original elige los módulos del rack
 *      curado, los adapta y resuelve imágenes y tema (1 crédito).
 *   3. "Datos y vista previa": el formulario dinámico del pack con vista
 *      previa EN VIVO (los writers certificados rellenan la base; gratis),
 *      y al terminar se entra directo al editor.
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
// Progress holds names and addresses (often of minors): keep it on this device for 14 days at most.
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
  } catch {
    /* storage unavailable: progress just isn't kept */
  }
};

/** id del pack → nombre legacy que entienden el esquema y las carpetas de imágenes. */
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

  const [step, setStep] = useState<Step>(saved?.step === 'details' ? 'brief' : (saved?.step || 'event')); // sin baseHtml guardada no se puede volver directo a 'details'
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
  const [preview, setPreview] = useState<{ html: string; missing: { key: string; label: string }[]; report: ComposeReport } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Escape closes the mobile preview.
  useEffect(() => {
    if (!showPreviewMobile) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPreviewMobile(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPreviewMobile]);

  // Keep progress so the customer can come back later (sin la base: es pesada).
  useEffect(() => {
    save(key, { step: step === 'details' ? 'brief' : step, eventType, brief, data, colors });
  }, [key, step, eventType, brief, data, colors]);

  useEffect(() => {
    getEventTypes(token).then(setEventTypes).catch((e) => setError(e.message));
  }, [token]);

  // El pack del evento arma el formulario dinámico. La estructura SIEMPRE
  // se inicializa del pack (los repeat groups necesitan sus arrays aunque
  // haya datos guardados de una sesión previa con otro evento).
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
          // preservar lo que el usuario ya llenó, pero garantizar que los
          // repeat groups sean arrays (un valor que no sea array rompería
          // el formulario)
          const fusion: EventFormData = { ...inicial };
          for (const k of Object.keys(prev)) {
            const v = prev[k];
            if (Array.isArray(inicial[k])) {
              fusion[k] = Array.isArray(v) ? v : inicial[k];
            } else if (typeof v === typeof inicial[k]) {
              fusion[k] = v;
            }
          }
          return fusion;
        });
      })
      .catch((e) => { if (current) setError(e.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [eventType, token]);

  const preferences = colors.custom ? { primaryColor: colors.primary, secondaryColor: colors.secondary } : {};

  // Vista previa en vivo sobre la base agéntica: gratis, sin IA, con debounce.
  useEffect(() => {
    if (step !== 'details' || !baseHtml || !eventType) return;
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPreviewLoading(true);
      fillProvidedInvitation({ html: baseHtml, eventType, data, preferences, purchaseId }, token, ctrl.signal)
        .then((r) => setPreview({ html: r.html, missing: r.missing, report: r.report }))
        .catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
        .finally(() => { if (abortRef.current === ctrl) setPreviewLoading(false); });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, baseHtml, eventType, data, colors, purchaseId, token]);

  const missingKeys = useMemo(() => new Set((preview?.missing || []).map((m) => m.key)), [preview]);

  const chooseEvent = (id: string) => {
    if (id !== eventType) {
      setEventType(id);
      setPack(null);
      setData({});
      setBaseHtml(null);
      setPreview(null);
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
  };

  /** Paso 2 → 3: la generación agéntica construye la base (1 crédito). */
  const generateBase = async () => {
    if (!brief.trim() || !eventType || !pack) return;
    if (generationAvailable !== null && generationAvailable < 1) {
      setError('No tienes créditos de generación disponibles en este plan.');
      return;
    }
    setGenerating(true);
    setError(null);
    setBaseHtml(null);
    setPreview(null);
    try {
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
      const html = await generateWebProject(prompt, imageSource, [], editorConfig, undefined, purchaseId || undefined);
      if (!html || html.length < 200) throw new Error('La generación devolvió una invitación vacía. Intenta de nuevo.');
      setBaseHtml(html);
      setStep('details');
    } catch (e) {
      setError((e as Error).message || 'No se pudo generar el diseño base.');
    } finally {
      setGenerating(false);
    }
  };

  /** Cierre: relleno final sobre la base y entrada al editor. */
  const finish = async () => {
    if (!baseHtml || !eventType || !pack) return;
    setFinishing(true);
    setError(null);
    try {
      const r = await fillProvidedInvitation({ html: baseHtml, eventType, data, preferences, purchaseId }, token);
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

  const previewPanel = (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-pink-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-pink-100 text-sm">
        <span className="font-semibold text-gray-700">Vista previa · tu diseño</span>
        {previewLoading && <Loader2 className="w-4 h-4 animate-spin text-pink-500" aria-label="Actualizando" />}
      </div>
      {preview ? (
        <iframe title="Vista previa de la invitación" srcDoc={preview.html} sandbox="allow-scripts" className="flex-1 w-full min-h-[480px] bg-white" />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-6">Preparando la vista previa…</div>
      )}
      {preview && (
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

  const colorPicker = (
    <section className="bg-white/80 rounded-3xl border border-pink-200 shadow-sm p-5 flex flex-col gap-3" aria-labelledby="t-colors">
      <h3 id="t-colors" className="text-lg font-bold text-gray-800 flex items-center gap-2"><Palette className="w-5 h-5 text-pink-500" /> Colores</h3>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name="colors" checked={!colors.custom} onChange={() => setColors({ ...colors, custom: false })} className="accent-pink-500" /> Que el diseño los elija según tu descripción</label>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name="colors" checked={colors.custom} onChange={() => setColors({ ...colors, custom: true })} className="accent-pink-500" /> Personalizar</label>
      {colors.custom && (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">Principal <input type="color" value={colors.primary} onChange={(e) => setColors({ ...colors, primary: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">Acento <input type="color" value={colors.secondary} onChange={(e) => setColors({ ...colors, secondary: e.target.value })} /></label>
        </div>
      )}
    </section>
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
            <p className="text-gray-500 mb-6">Elige el tipo de evento. Después nos cuentas el estilo que quieres y armamos la invitación.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {eventTypes.map((t) => (
                <button key={t.id} type="button" onClick={() => chooseEvent(t.id)} className={`text-left rounded-2xl border-2 bg-white p-5 hover:border-pink-400 hover:shadow-md transition-all ${eventType === t.id ? 'border-pink-500' : 'border-pink-100'}`}>
                  <p className="text-lg font-bold text-gray-800">{t.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={onUseClassic} className="mt-8 text-sm text-gray-500 underline hover:text-pink-600">Prefiero el modo clásico completo (descripción libre con formulario en la carga)</button>
          </section>
        )}

        {step === 'brief' && pack && (
          <section aria-labelledby="t-brief" className="max-w-3xl">
            <button type="button" onClick={() => setStep('event')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-pink-600 mb-3"><ArrowLeft className="w-4 h-4" /> Cambiar evento</button>
            <h1 id="t-brief" className="text-3xl font-bold text-gray-800 mb-1">Cuéntanos cómo la quieres</h1>
            <p className="text-gray-500 mb-6">Describe el estilo, el ambiente, los detalles que amas. Nuestro proceso creativo elige las secciones y construye tu invitación con eso.</p>
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
              {generationAvailable !== null && <p className="text-xs text-gray-500">Créditos de generación disponibles: {generationAvailable} · esta paso usa uno</p>}
            </div>
            <div className="mt-4">{colorPicker}</div>
            <div className="sticky bottom-0 mt-6 py-4 bg-pink-50/95 flex justify-end">
              <button type="button" disabled={!brief.trim() || generating} onClick={generateBase} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-40 text-white rounded-xl font-semibold shadow-lg flex items-center gap-2">
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {generating ? 'Diseñando…' : 'Generar mi diseño base'}
              </button>
            </div>
          </section>
        )}

        {step === 'details' && pack && baseHtml && (
          <section aria-labelledby="t-details">
            <button type="button" onClick={() => { setStep('brief'); setPreview(null); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-pink-600 mb-3"><ArrowLeft className="w-4 h-4" /> Volver a describir el estilo (regenera)</button>
            <h1 id="t-details" className="text-3xl font-bold text-gray-800 mb-1">Datos de tu {pack.label.split(' /')[0]}</h1>
            <p className="text-gray-500 mb-6">Llena lo que aplique. La vista previa se actualiza mientras escribes; las secciones sin datos no aparecen.</p>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
              <div className="flex flex-col gap-4">
                <DynamicEventForm pack={pack} data={data} onChange={setData} missingKeys={missingKeys} />
                {colorPicker}
              </div>
              <div className="hidden lg:block sticky top-20 h-[calc(100vh-7rem)]">{previewPanel}</div>
            </div>

            <div className="sticky bottom-0 mt-6 py-4 bg-pink-50/95 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button type="button" onClick={() => setShowPreviewMobile(true)} className="lg:hidden w-full sm:w-auto px-5 py-3 border border-pink-300 rounded-xl text-pink-600 font-semibold flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> Ver vista previa</button>
              <button type="button" onClick={finish} disabled={finishing || !preview} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-40 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2">
                {finishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Abrir en el editor
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

      {generating && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 px-6" role="status">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-pink-600 font-medium text-lg">Diseñando tu invitación…</p>
          <p className="text-sm text-gray-500 max-w-sm text-center">Nuestro proceso creativo elige las secciones, las adapta a tu estilo y genera las imágenes. Puede tardar un par de minutos.</p>
        </div>
      )}
    </div>
  );
};
