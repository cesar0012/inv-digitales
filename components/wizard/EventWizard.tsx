import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, Home, Loader2, Palette, Sparkles, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ComposeReport,
  createInvitation,
  DesignSummary,
  EventFormData,
  EventPack,
  EventTypeSummary,
  getDesigns,
  getDesignSample,
  getDesignScreenshot,
  getEventPack,
  getEventTypes,
  previewInvitation
} from '../../services/composeService';
import { DynamicEventForm, initialFormData } from './DynamicEventForm';

/**
 * Event-first creation:
 *   1. pick the event → 2. pick a certified design → 3. fill the event's own
 *   form (unlimited people) with a live preview → create. The server composes
 *   the invitation from certified modules and generates the graphics.
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

type Step = 'event' | 'design' | 'details';

interface Saved {
  step: Step;
  eventType: string;
  designId: string;
  data: EventFormData;
  colors: { custom: boolean; primary: string; secondary: string };
}

const storageKey = (purchaseId: string) => `im_wizard_${purchaseId || 'nuevo'}`;
const load = (key: string): Saved | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
};
const save = (key: string, value: Saved | null) => {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable: progress just isn't kept */
  }
};

const MODULE_NAMES: Record<string, string> = {
  portada: 'Portada', countdown: 'Cuenta regresiva', padres: 'Papás y familia', padrinos: 'Padrinos', corte: 'Corte / cortejo',
  ubicacion: 'Ubicación', itinerario: 'Programa', vestimenta: 'Vestimenta', regalos: 'Regalos', galeria: 'Galería', confirmacion: 'Confirmación'
};

const Steps: React.FC<{ step: Step }> = ({ step }) => {
  const items: [Step, string][] = [['event', 'Evento'], ['design', 'Diseño'], ['details', 'Datos y vista previa']];
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

const DesignCard: React.FC<{ design: DesignSummary; selected: boolean; token: string; onSelect: () => void; onPreview: () => void }> = ({ design, selected, token, onSelect, onPreview }) => {
  const [shot, setShot] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    if (design.screenshot) getDesignScreenshot(design.screenshot, token).then((u) => { url = u; setShot(u); }).catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [design.screenshot, token]);
  return (
    <div className={`rounded-2xl border-2 bg-white overflow-hidden flex flex-col transition-all ${selected ? 'border-pink-500 ring-2 ring-pink-200' : 'border-pink-100 hover:border-pink-300'}`}>
      <button type="button" onClick={onSelect} className="text-left flex-1" aria-pressed={selected}>
        {shot ? (
          <img src={shot} alt={`Diseño ${design.label}`} className="w-full h-36 object-cover object-top" />
        ) : (
          <div className="h-36 flex" aria-hidden="true">
            {(design.swatch.length ? design.swatch : ['#f9a8d4', '#fbcfe8', '#fff1f2', '#831843']).map((c, i) => (
              <span key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>
        )}
        <div className="p-3">
          <p className="font-semibold text-gray-800 truncate">{design.label}</p>
          <p className="text-xs text-gray-500">{design.madeFor ? 'Hecho para este evento' : 'Diseño versátil'} · {design.modules.length} secciones</p>
        </div>
      </button>
      <div className="flex border-t border-pink-50">
        <button type="button" onClick={onPreview} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 hover:bg-pink-50"><Eye className="w-4 h-4" /> Ver ejemplo</button>
        <button type="button" onClick={onSelect} className={`flex-1 py-2 text-sm font-semibold ${selected ? 'bg-pink-500 text-white' : 'text-pink-600 hover:bg-pink-50'}`}>{selected ? 'Elegido' : 'Elegir'}</button>
      </div>
    </div>
  );
};

export const EventWizard: React.FC<Props> = ({ token, purchaseId, generationAvailable, onCreated, onUseClassic }) => {
  const navigate = useNavigate();
  const key = storageKey(purchaseId);
  const saved = useMemo(() => load(key), [key]);

  const [step, setStep] = useState<Step>(saved?.step || 'event');
  const [eventTypes, setEventTypes] = useState<EventTypeSummary[]>([]);
  const [eventType, setEventType] = useState(saved?.eventType || '');
  const [pack, setPack] = useState<EventPack | null>(null);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [designId, setDesignId] = useState(saved?.designId || '');
  const [data, setData] = useState<EventFormData>(saved?.data || {});
  const [colors, setColors] = useState(saved?.colors || { custom: false, primary: '#d16a8a', secondary: '#eda7bc' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sample, setSample] = useState<{ label: string; html: string } | null>(null);
  const [preview, setPreview] = useState<{ html: string; missing: { key: string; label: string }[]; report: ComposeReport } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [creating, setCreating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Keep progress so the customer can come back later.
  useEffect(() => {
    save(key, { step, eventType, designId, data, colors });
  }, [key, step, eventType, designId, data, colors]);

  useEffect(() => {
    getEventTypes(token).then(setEventTypes).catch((e) => setError(e.message));
  }, [token]);

  // Step 2 needs the event's pack (form) and its designs.
  useEffect(() => {
    if (!eventType) return;
    setLoading(true);
    Promise.all([getEventPack(eventType, token), getDesigns(eventType, token)])
      .then(([p, d]) => {
        setPack(p);
        setDesigns(d);
        setData((prev) => (Object.keys(prev).length ? prev : initialFormData(p)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventType, token]);

  // Live preview: no AI, no credit; debounced while typing.
  const preferences = colors.custom ? { primaryColor: colors.primary, secondaryColor: colors.secondary } : {};
  useEffect(() => {
    if (step !== 'details' || !designId || !eventType) return;
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPreviewLoading(true);
      previewInvitation({ eventType, designId, data, preferences, purchaseId }, token, ctrl.signal)
        .then((r) => setPreview({ html: r.html, missing: r.missing, report: r.report }))
        .catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
        .finally(() => setPreviewLoading(false));
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, designId, eventType, data, colors, purchaseId, token]);

  const missingKeys = useMemo(() => new Set((preview?.missing || []).map((m) => m.key)), [preview]);
  const selectedDesign = designs.find((d) => d.id === designId);

  const chooseEvent = (id: string) => {
    if (id !== eventType) {
      setEventType(id);
      setDesignId('');
      setData({});
      setPreview(null);
    }
    setStep('design');
  };

  const openSample = async (d: DesignSummary) => {
    try {
      setSample({ label: d.label, html: '' });
      setSample({ label: d.label, html: await getDesignSample(d.id, eventType, token) });
    } catch (e) {
      setSample(null);
      setError((e as Error).message);
    }
  };

  const startOver = () => {
    save(key, null);
    setStep('event');
    setEventType('');
    setDesignId('');
    setData({});
    setPreview(null);
  };

  const create = async () => {
    if (!preview || preview.missing.length) return;
    setCreating(true);
    setError(null);
    try {
      const r = await createInvitation({ eventType, designId, data, preferences, purchaseId }, token);
      save(key, null);
      onCreated({
        html: r.html,
        eventLabel: r.eventLabel,
        designLabel: selectedDesign?.label || '',
        primaryColor: colors.custom ? colors.primary : selectedDesign?.swatch[0] || '#f472b6',
        secondaryColor: colors.custom ? colors.secondary : selectedDesign?.swatch[1] || '#fb7185'
      });
    } catch (e) {
      const err = e as Error & { missing?: { key: string; label: string }[] };
      setError(err.missing?.length ? `Faltan datos: ${err.missing.map((m) => m.label).join(', ')}` : err.message);
    } finally {
      setCreating(false);
    }
  };

  const previewPanel = (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-pink-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-pink-100 text-sm">
        <span className="font-semibold text-gray-700">Vista previa {selectedDesign ? `· ${selectedDesign.label}` : ''}</span>
        {previewLoading && <Loader2 className="w-4 h-4 animate-spin text-pink-500" aria-label="Actualizando" />}
      </div>
      {preview ? (
        <iframe title="Vista previa de la invitación" srcDoc={preview.html} sandbox="allow-scripts" className="flex-1 w-full min-h-[480px] bg-white" />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-6">Preparando la vista previa…</div>
      )}
      {preview && (
        <div className="px-4 py-3 border-t border-pink-100 text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
          {preview.missing.length > 0 && <p className="text-red-600"><b>Falta:</b> {preview.missing.map((m) => m.label).join(' · ')}</p>}
          {preview.report.skipped.length > 0 && (
            <p><b>No aparecerán:</b> {preview.report.skipped.map((s) => `${MODULE_NAMES[s.type] || s.type} (${s.reason.replace(/\.$/, '').toLowerCase()})`).join(' · ')}</p>
          )}
          {preview.report.warnings.length > 0 && <p className="text-amber-700"><b>Revisa:</b> {preview.report.warnings.map((w) => `${MODULE_NAMES[w.type] || w.type}: ${w.kind}`).join(' · ')}</p>}
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
            <p className="text-gray-500 mb-6">Elige el tipo de evento. Te pediremos solo los datos que ese evento necesita.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {eventTypes.map((t) => (
                <button key={t.id} type="button" onClick={() => chooseEvent(t.id)} className={`text-left rounded-2xl border-2 bg-white p-5 hover:border-pink-400 hover:shadow-md transition-all ${eventType === t.id ? 'border-pink-500' : 'border-pink-100'}`}>
                  <p className="text-lg font-bold text-gray-800">{t.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={onUseClassic} className="mt-8 text-sm text-gray-500 underline hover:text-pink-600">Prefiero describir mi invitación con texto (modo anterior)</button>
          </section>
        )}

        {step === 'design' && (
          <section aria-labelledby="t-design">
            <button type="button" onClick={() => setStep('event')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-pink-600 mb-3"><ArrowLeft className="w-4 h-4" /> Cambiar evento</button>
            <h1 id="t-design" className="text-3xl font-bold text-gray-800 mb-1">Elige tu diseño</h1>
            <p className="text-gray-500 mb-6">Cada diseño es un conjunto de secciones ya probadas. Podrás cambiar colores y textos después.</p>
            {loading ? (
              <div className="flex items-center gap-2 text-pink-600"><Loader2 className="w-5 h-5 animate-spin" /> Cargando diseños…</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {designs.map((d) => (
                  <DesignCard key={d.id} design={d} token={token} selected={designId === d.id} onSelect={() => setDesignId(d.id)} onPreview={() => openSample(d)} />
                ))}
              </div>
            )}
            <div className="sticky bottom-0 mt-6 py-4 bg-pink-50/95 flex justify-end">
              <button type="button" disabled={!designId} onClick={() => setStep('details')} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-40 text-white rounded-xl font-semibold shadow-lg">Continuar con mis datos</button>
            </div>
          </section>
        )}

        {step === 'details' && pack && (
          <section aria-labelledby="t-details">
            <button type="button" onClick={() => setStep('design')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-pink-600 mb-3"><ArrowLeft className="w-4 h-4" /> Cambiar diseño</button>
            <h1 id="t-details" className="text-3xl font-bold text-gray-800 mb-1">Datos de tu {pack.label.split(' /')[0]}</h1>
            <p className="text-gray-500 mb-6">Llena lo que aplique. La vista previa se actualiza mientras escribes; las secciones sin datos no aparecen.</p>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
              <div className="flex flex-col gap-4">
                <DynamicEventForm pack={pack} data={data} onChange={setData} missingKeys={missingKeys} />
                <section className="bg-white/80 rounded-3xl border border-pink-200 shadow-sm p-5 flex flex-col gap-3" aria-labelledby="t-colors">
                  <h3 id="t-colors" className="text-lg font-bold text-gray-800 flex items-center gap-2"><Palette className="w-5 h-5 text-pink-500" /> Colores</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="colors" checked={!colors.custom} onChange={() => setColors({ ...colors, custom: false })} className="accent-pink-500" /> Usar los colores del diseño (recomendado)</label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="colors" checked={colors.custom} onChange={() => setColors({ ...colors, custom: true })} className="accent-pink-500" /> Personalizar</label>
                  {colors.custom && (
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">Principal <input type="color" value={colors.primary} onChange={(e) => setColors({ ...colors, primary: e.target.value })} /></label>
                      <label className="flex items-center gap-2 text-sm">Acento <input type="color" value={colors.secondary} onChange={(e) => setColors({ ...colors, secondary: e.target.value })} /></label>
                    </div>
                  )}
                </section>
              </div>
              <div className="hidden lg:block sticky top-20 h-[calc(100vh-7rem)]">{previewPanel}</div>
            </div>

            <div className="sticky bottom-0 mt-6 py-4 bg-pink-50/95 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button type="button" onClick={() => setShowPreviewMobile(true)} className="lg:hidden w-full sm:w-auto px-5 py-3 border border-pink-300 rounded-xl text-pink-600 font-semibold flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> Ver vista previa</button>
              {generationAvailable !== null && <span className="text-xs text-gray-500">Créditos de creación disponibles: {generationAvailable}</span>}
              <button type="button" onClick={create} disabled={creating || !preview || preview.missing.length > 0} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-40 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Crear mi invitación
              </button>
            </div>
          </section>
        )}
      </main>

      {showPreviewMobile && (
        <div className="fixed inset-0 z-50 bg-black/40 p-3 flex flex-col lg:hidden" role="dialog" aria-modal="true" aria-label="Vista previa">
          <button type="button" onClick={() => setShowPreviewMobile(false)} className="self-end mb-2 bg-white rounded-full p-2" aria-label="Cerrar vista previa"><X className="w-5 h-5" /></button>
          <div className="flex-1 min-h-0">{previewPanel}</div>
        </div>
      )}

      {sample && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex flex-col items-center" role="dialog" aria-modal="true" aria-label={`Ejemplo del diseño ${sample.label}`}>
          <div className="w-full max-w-md flex items-center justify-between mb-2 text-white">
            <span className="font-semibold">{sample.label} · ejemplo</span>
            <button type="button" onClick={() => setSample(null)} className="bg-white text-gray-700 rounded-full p-2" aria-label="Cerrar ejemplo"><X className="w-5 h-5" /></button>
          </div>
          <div className="w-full max-w-md flex-1 bg-white rounded-2xl overflow-hidden">
            {sample.html ? <iframe title={`Ejemplo ${sample.label}`} srcDoc={sample.html} sandbox="allow-scripts" className="w-full h-full" /> : <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>}
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3" role="status">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-pink-600 font-medium text-lg">Creando tu invitación…</p>
          <p className="text-sm text-gray-500 max-w-sm text-center">Estamos armando las secciones con tus datos y generando las imágenes del diseño. Puede tardar un par de minutos.</p>
        </div>
      )}
    </div>
  );
};
