import React, { useState, useEffect, useMemo } from 'react';
import {
  Wand2, Key, RefreshCw, Loader2, CheckCircle2, XCircle, Monitor, Tablet, Smartphone,
  Play, RotateCcw, Gauge, Upload, Eye, ChevronDown, Sparkles, AlertCircle
} from 'lucide-react';
import {
  getModuleGeneratorStatus, saveModuleGeneratorKeys, moduleGeneratorRotatorAction,
  generateModuleWithRotator, importGeneratedModulesToRAG,
  type ModuleGeneratorStatus, type GeneratedModule
} from '../../services/adminService';

type Viewport = 'desktop' | 'tablet' | 'mobile';
type GenState = 'idle' | 'generating' | 'done' | 'error';

interface GenItem {
  type: string;
  state: GenState;
  result?: GeneratedModule;
  error?: string;
}

const VIEWPORTS: Record<Viewport, { label: string; width: number; icon: React.ReactNode }> = {
  desktop: { label: 'Desktop', width: 1280, icon: <Monitor className="w-4 h-4" /> },
  tablet: { label: 'Tablet', width: 768, icon: <Tablet className="w-4 h-4" /> },
  mobile: { label: 'Móvil', width: 390, icon: <Smartphone className="w-4 h-4" /> }
};

const assemblePreviewDoc = (modules: string[]): string => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root { --primary-color: #8A4F3D; --text-color: #2E2A26; --accent-color: #B98A5E; --bg-color: #FAF6F0; --secondary-color: #6b6259; }
  body { margin: 0; font-family: Georgia, serif; }
</style>
</head>
<body>
${modules.join('\n')}
</body>
</html>`;

const ModulePreview: React.FC<{ html: string; height?: number; title?: string }> = ({ html, height = 560, title }) => (
  <iframe
    title={title || 'Módulo'}
    srcDoc={html}
    sandbox="allow-scripts"
    className="w-full border-0 bg-white"
    style={{ height }}
  />
);

const ScaledViewportFrame: React.FC<{ html: string; viewport: Viewport; height?: number; title?: string }> = ({ html, viewport, height = 560, title }) => {
  const { width } = VIEWPORTS[viewport];
  const containerWidth = viewport === 'desktop' ? '100%' : `${width}px`;
  return (
    <div className="flex justify-center bg-gray-100 rounded-xl overflow-hidden">
      <div style={{ width: containerWidth, maxWidth: '100%' }} className="bg-white shadow-md overflow-hidden rounded-xl">
        <iframe
          title={title || `preview-${viewport}`}
          srcDoc={html}
          sandbox="allow-scripts"
          className="w-full border-0 bg-white block"
          style={{ height }}
        />
      </div>
    </div>
  );
};

export const AdminModuleGenerator: React.FC = () => {
  const [status, setStatus] = useState<ModuleGeneratorStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [openrouterKey, setOpenrouterKey] = useState('');
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [items, setItems] = useState<GenItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const s = await getModuleGeneratorStatus();
      setStatus(s);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const hasKeys = !!status?.keys.openrouter || !!status?.keys.nvidia;

  const handleSaveKeys = async () => {
    setSavingKeys(true);
    try {
      const payload: any = {};
      if (openrouterKey.trim()) payload.openrouter_api_key = openrouterKey.trim();
      if (nvidiaKey.trim()) payload.nvidia_api_key = nvidiaKey.trim();
      if (Object.keys(payload).length === 0) throw new Error('Escribe al menos una API key');
      const res = await saveModuleGeneratorKeys(payload);
      setOpenrouterKey(''); setNvidiaKey('');
      await loadStatus();
      showToast('success', `API keys guardadas: OpenRouter ${res.keys.openrouter || '—'} | NVIDIA ${res.keys.nvidia || '—'}`);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSavingKeys(false);
    }
  };

  const handleRotatorAction = async (action: 'rotate' | 'reset-cooldowns' | 'refresh-catalog' | 'benchmark') => {
    try {
      const rotator = await moduleGeneratorRotatorAction(action);
      setStatus((s) => (s ? { ...s, rotator } : s));
      showToast('success', action === 'benchmark' ? 'Benchmarks iniciados (secuencial, tardan unos minutos)' : `Acción "${action}" aplicada`);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) return showToast('error', 'Palomea al menos un tipo de módulo');
    if (!hasKeys) return showToast('error', 'Configura primero una API key (OpenRouter o NVIDIA)');
    setGenerating(true);
    setShowFullPreview(false);
    const initial = selectedTypes.map((type) => ({ type, state: 'idle' as GenState }));
    setItems(initial);
    setChecked({});
    // Generación por módulo con progreso en vivo (cada uno es una misión independiente)
    for (let i = 0; i < initial.length; i++) {
      setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, state: 'generating' } : it)));
      try {
        const result = await generateModuleWithRotator(initial[i].type, extraInstructions);
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, state: result.failed ? 'error' : 'done', result } : it)));
        if (result.failed) {
          setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, error: result.validation.errors.slice(0, 4).join(' · ') } : it)));
        } else {
          setChecked((prev) => ({ ...prev, [i]: true }));
        }
      } catch (e: any) {
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, state: 'error', error: e.message } : it)));
      }
    }
    setGenerating(false);
  };

  const doneItems = items.filter((it) => it.state === 'done' && it.result);
  const checkedCount = Object.entries(checked).filter(([idx, v]) => v && items[Number(idx)]?.state === 'done').length;

  const handleImport = async () => {
    const toImport = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it, idx }) => it.state === 'done' && it.result && checked[idx])
      .map(({ it }) => ({ html: it.result!.html, styleName: it.result!.brief?.style_name }));
    if (toImport.length === 0) return showToast('error', 'Selecciona al menos un módulo aprobado');
    setImporting(true);
    try {
      const res = await importGeneratedModulesToRAG(toImport);
      const okCount = res.results.filter((r) => r.ok).length;
      if (okCount === toImport.length) {
        showToast('success', `${okCount} módulo(s) importados al RAG modular ✓`);
      } else {
        showToast('error', `${okCount}/${toImport.length} importados. Fallos: ${res.results.filter((r) => !r.ok).map((r) => r.error).join(' | ')}`);
      }
      setItems((prev) => prev.map((it, idx) => (checked[idx] ? { ...it, state: 'done' } : it)));
      setChecked({});
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setImporting(false);
    }
  };

  const fullPreviewHtml = useMemo(
    () => assemblePreviewDoc(doneItems.map((it) => it.result!.html)),
    [items]
  );

  const catalog = status?.rotator.catalog || [];
  const availableCount = catalog.filter((c) => c.available).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* ── API keys + rotador ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-pink-500" />
            <h3 className="font-semibold text-gray-800">API Keys de LLMs</h3>
            {hasKeys && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">configuradas</span>}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">OpenRouter ({status?.keys.openrouter || 'sin configurar'})</label>
              <input
                type="password"
                value={openrouterKey}
                onChange={(e) => setOpenrouterKey(e.target.value)}
                placeholder="sk-or-v1-…"
                className="w-full mt-1 px-3 py-2 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">NVIDIA NIM ({status?.keys.nvidia || 'sin configurar'})</label>
              <input
                type="password"
                value={nvidiaKey}
                onChange={(e) => setNvidiaKey(e.target.value)}
                placeholder="nvapi-…"
                className="w-full mt-1 px-3 py-2 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <button
              onClick={handleSaveKeys}
              disabled={savingKeys}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Guardar keys
            </button>
            <p className="text-xs text-gray-400">Solo se usan modelos <strong>gratuitos</strong> con rotación automática (quota/dead detection).</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-800">Rotador de LLMs</h3>
            </div>
            <span className="text-xs text-gray-500">
              {loadingStatus ? 'cargando…' : `${availableCount}/${catalog.length} modelos disponibles`}
            </span>
          </div>
          {Object.keys(status?.rotator.catalogErrors || {}).length > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 space-y-1">
              {Object.entries(status.rotator.catalogErrors).map(([prov, err]) => (
                <p key={prov}><strong>{prov}</strong>: {err}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => handleRotatorAction('rotate')} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Rotar
            </button>
            <button onClick={() => handleRotatorAction('refresh-catalog')} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refrescar catálogo
            </button>
            <button onClick={() => handleRotatorAction('reset-cooldowns')} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset cooldowns
            </button>
            <button onClick={() => handleRotatorAction('benchmark')} disabled={status?.rotator.benchmarkRunning} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 flex items-center gap-1.5 disabled:opacity-50">
              <Gauge className="w-3.5 h-3.5" /> {status?.rotator.benchmarkRunning ? 'Midiendo…' : 'Benchmarks'}
            </button>
          </div>
          {status?.rotator.current && (
            <p className="text-xs text-gray-500 mb-2">
              Actual: <span className="font-mono text-gray-700">{status.rotator.current.modelKey}</span>
            </p>
          )}
          <div className="max-h-28 overflow-y-auto space-y-1">
            {catalog.slice(0, 10).map((c) => (
              <div key={c.modelKey} className="flex items-center justify-between text-xs">
                <span className="font-mono text-gray-600 truncate">{c.modelKey}</span>
                <span className={c.available ? 'text-green-600' : 'text-amber-600'}>
                  {c.available ? `✓ ${c.score}` : 'cooldown'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selección y generación ── */}
      <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-4 h-4 text-pink-500" />
          <h3 className="font-semibold text-gray-800">Generar módulos de producción</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">Palomea los tipos a generar. Cada módulo se genera por separado (brief creativo aleatorio → generación → validación → critic loop) y luego se juntan en el preview.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(status?.moduleTypes || []).map((t) => {
            const active = selectedTypes.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-md shadow-pink-200'
                    : 'bg-white text-gray-600 border-pink-200 hover:border-pink-400'
                }`}
              >
                {active ? '✓ ' : ''}{t}
              </button>
            );
          })}
        </div>
        <textarea
          value={extraInstructions}
          onChange={(e) => setExtraInstructions(e.target.value)}
          placeholder="Instrucciones extra (opcional): p. ej. 'que todos tengan ornamentos florales sutiles y animación al hacer scroll'…"
          rows={2}
          className="w-full px-3 py-2 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
        />
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleGenerate}
            disabled={generating || selectedTypes.length === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium text-sm shadow-lg shadow-pink-200 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {generating ? `Generando (${items.filter((i) => i.state === 'done' || i.state === 'error').length}/${items.length})…` : `Generar ${selectedTypes.length} módulo(s)`}
          </button>
          {doneItems.length > 0 && (
            <button
              onClick={() => setShowFullPreview((v) => !v)}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-medium text-sm hover:bg-indigo-100 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showFullPreview ? 'Ocultar' : 'Ver'} preview conjunto ({doneItems.length})
            </button>
          )}
        </div>

        {/* Progreso */}
        {items.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {items.map((it, idx) => (
              <span key={idx} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                it.state === 'generating' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : it.state === 'done' ? 'bg-green-50 text-green-700 border border-green-200'
                : it.state === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}>
                {it.state === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
                {it.state === 'done' && <CheckCircle2 className="w-3 h-3" />}
                {it.state === 'error' && <XCircle className="w-3 h-3" />}
                {it.type}
                {it.result && <span className="opacity-60">· {it.result.attempts} intento(s) · {it.result.models[it.result.models.length - 1]?.split('::')[1]?.slice(0, 24)}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Preview conjunto ── */}
      {showFullPreview && doneItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-800">Preview conjunto (todos los generados)</h3>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(Object.keys(VIEWPORTS) as Viewport[]).map((vp) => (
                <button
                  key={vp}
                  onClick={() => setViewport(vp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${viewport === vp ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}
                >
                  {VIEWPORTS[vp].icon} {VIEWPORTS[vp].label}
                </button>
              ))}
            </div>
          </div>
          <ScaledViewportFrame html={fullPreviewHtml} viewport={viewport} height={720} title="preview-conjunto" />
        </div>
      )}

      {/* ── Resultados por módulo ── */}
      {items.some((it) => it.result) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-pink-500" /> Módulos generados — aprueba los que van al RAG
            </h3>
            <button
              onClick={handleImport}
              disabled={importing || checkedCount === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar {checkedCount} al RAG modular
            </button>
          </div>

          {items.map((it, idx) => {
            if (!it.result) {
              return it.state === 'error' ? (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div><strong>{it.type}</strong>: {it.error}</div>
                </div>
              ) : null;
            }
            const r = it.result;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={!!checked[idx]}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [idx]: e.target.checked }))}
                      className="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.failed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {r.failed ? 'inválido tras reintentos' : 'válido'}
                        </span>
                        <span className="font-semibold text-gray-800">{r.brief?.style_name || r.moduleType}</span>
                        <span className="text-xs text-gray-400">{r.moduleType} · {r.attempts} intento(s) · {r.models[r.models.length - 1]}</span>
                      </div>
                      {r.brief?.concepto && <p className="text-xs text-gray-500 mt-1 truncate">{r.brief.concepto}</p>}
                      {r.failed && r.validation.errors.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">{r.validation.errors.slice(0, 3).join(' · ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                    {(Object.keys(VIEWPORTS) as Viewport[]).map((vp) => (
                      <button
                        key={vp}
                        onClick={() => setViewport(vp)}
                        title={VIEWPORTS[vp].label}
                        className={`px-2.5 py-1.5 rounded-lg text-xs ${viewport === vp ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}
                      >
                        {VIEWPORTS[vp].icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <ScaledViewportFrame html={r.html} viewport={viewport} height={560} title={`modulo-${r.moduleType}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
