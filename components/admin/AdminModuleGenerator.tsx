import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Wand2, Key, RefreshCw, Loader2, CheckCircle2, XCircle, Monitor, Tablet, Smartphone,
  Play, RotateCcw, Gauge, Upload, Eye, Sparkles, AlertCircle, ListChecks, Square, Pin
} from 'lucide-react';
import {
  getModuleGeneratorStatus, saveModuleGeneratorKeys, moduleGeneratorRotatorAction,
  generateModuleWithRotator, importGeneratedModulesToRAG,
  saveAllowedModels, startModuleBatch, getModuleBatchStatus, stopModuleBatch,
  getGeneratorResults, getGeneratorResult, reviewGeneratorResult, importGeneratorResults,
  type ModuleGeneratorStatus, type GeneratedModule, type BatchStatus, type GeneratorResultRow
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

  // Allowlist de modelos (solo estos se usan)
  const [modelsInput, setModelsInput] = useState('');
  const [savingModels, setSavingModels] = useState(false);

  // Lote automático
  const [batch, setBatch] = useState<BatchStatus | null>(null);
  const [batchSets, setBatchSets] = useState(5);
  const [batchStarting, setBatchStarting] = useState(false);

  // Resultados para revisión posterior
  const [results, setResults] = useState<GeneratorResultRow[]>([]);
  const [resultsFilter, setResultsFilter] = useState<string>('');
  const [expandedResult, setExpandedResult] = useState<Record<number, string>>({});
  const [loadingResults, setLoadingResults] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const loadStatus = useCallback(async () => {
    try {
      const s = await getModuleGeneratorStatus();
      setStatus(s);
      if (s.rotator.allowedModels?.length) setModelsInput(s.rotator.allowedModels.join('\n'));
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const res = await getGeneratorResults(resultsFilter || undefined, 60);
      setResults(res.results || []);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setLoadingResults(false);
    }
  }, [resultsFilter]);

  useEffect(() => { loadStatus(); loadResults(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadResults(); }, [resultsFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling del batch activo
  useEffect(() => {
    if (!batch?.active) return;
    const interval = window.setInterval(async () => {
      try {
        const b = await getModuleBatchStatus();
        setBatch(b);
        if (!b.active) {
          window.clearInterval(interval);
          showToast('success', `Lote terminado: ${b.generated} módulos generados, ${b.failed} fallidos`);
          loadResults();
        }
      } catch { /* seguir intentando */ }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [batch?.active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { getModuleBatchStatus().then(setBatch).catch(() => {}); }, []);

  const hasKeys = !!status?.keys.openrouter || !!status?.keys.nvidia;
  const allowedModels = status?.rotator.allowedModels || [];
  const catalog = status?.rotator.catalog || [];
  const availableCount = catalog.filter((c) => c.available).length;
  const parsedModelsInput = useMemo(() => modelsInput.split(/[\n,]+/).map((l) => l.trim().toLowerCase()).filter(Boolean), [modelsInput]);

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

  const handleSaveModels = async (list?: string[]) => {
    setSavingModels(true);
    try {
      const models = list ?? parsedModelsInput;
      const invalid = models.filter((m) => !/^(openrouter|nvidia)::\S+$/.test(m));
      if (invalid.length > 0) throw new Error(`Formato inválido (usa proveedor::modelo): ${invalid.slice(0, 2).join(', ')}`);
      const res = await saveAllowedModels(models);
      setModelsInput(models.join('\n'));
      setStatus((s) => (s ? { ...s, rotator: { ...s.rotator, ...res.rotator } } : s));
      showToast('success', models.length ? `Rotator restringido a ${models.length} modelo(s)` : 'Rotator libre (todos los modelos)');
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSavingModels(false);
    }
  };

  const toggleAllowedFromCatalog = (modelKey: string) => {
    const current = parsedModelsInput;
    const next = current.includes(modelKey) ? current.filter((m) => m !== modelKey) : [...current, modelKey];
    setModelsInput(next.join('\n'));
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
    for (let i = 0; i < initial.length; i++) {
      setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, state: 'generating' } : it)));
      try {
        const result = await generateModuleWithRotator(initial[i].type, extraInstructions);
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, state: result.failed ? 'error' : 'done', result, error: result.failed ? result.validation.errors.slice(0, 4).join(' · ') : undefined } : it)));
        if (!result.failed) setChecked((prev) => ({ ...prev, [i]: true }));
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
      if (okCount === toImport.length) showToast('success', `${okCount} módulo(s) importados al RAG modular ✓`);
      else showToast('error', `${okCount}/${toImport.length} importados. Fallos: ${res.results.filter((r) => !r.ok).map((r) => r.error).join(' | ')}`);
      setChecked({});
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setImporting(false);
    }
  };

  // —— Lote automático ——
  const handleStartBatch = async () => {
    if (selectedTypes.length === 0) return showToast('error', 'Palomea al menos un tipo de módulo');
    if (!hasKeys) return showToast('error', 'Configura primero una API key');
    setBatchStarting(true);
    try {
      const b = await startModuleBatch(selectedTypes, batchSets, extraInstructions);
      setBatch(b);
      showToast('success', `Lote iniciado: ${b.totalSets} set(s) en background`);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setBatchStarting(false);
    }
  };

  const handleStopBatch = async () => {
    try {
      const b = await stopModuleBatch();
      setBatch(b);
      showToast('success', 'Detención solicitada (termina el módulo en curso)');
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // —— Resultados ——
  const expandResult = async (id: number) => {
    if (expandedResult[id] !== undefined) {
      setExpandedResult((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const { result } = await getGeneratorResult(id);
      setExpandedResult((prev) => ({ ...prev, [id]: result.html || '' }));
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleReview = async (id: number, approve: boolean) => {
    try {
      await reviewGeneratorResult(id, approve);
      setResults((prev) => prev.map((r) => (r.id === id ? { ...r, status: approve ? 'approved' : 'rejected' } : r)));
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleImportApproved = async () => {
    setImporting(true);
    try {
      const res = await importGeneratorResults();
      showToast(res.imported > 0 ? 'success' : 'error', res.imported > 0 ? `${res.imported} módulo(s) importados al RAG ✓` : 'Sin aprobados válidos para importar');
      loadResults();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setImporting(false);
    }
  };

  const fullPreviewHtml = useMemo(
    () => assemblePreviewDoc(doneItems.map((it) => it.result!.html)),
    [items] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const batchProgress = batch && batch.totalSets > 0 ? Math.round((batch.doneSets / batch.totalSets) * 100) : 0;

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
              <input type="password" value={openrouterKey} onChange={(e) => setOpenrouterKey(e.target.value)} placeholder="sk-or-v1-…"
                className="w-full mt-1 px-3 py-2 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">NVIDIA NIM ({status?.keys.nvidia || 'sin configurar'})</label>
              <input type="password" value={nvidiaKey} onChange={(e) => setNvidiaKey(e.target.value)} placeholder="nvapi-…"
                className="w-full mt-1 px-3 py-2 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <button onClick={handleSaveKeys} disabled={savingKeys}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {savingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Guardar keys
            </button>
            <p className="text-xs text-gray-400">Solo modelos <strong>gratuitos</strong> con rotación automática; al guardar se recarga el catálogo de ambos proveedores.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-800">Rotador de LLMs</h3>
            </div>
            <span className="text-xs text-gray-500">
              {loadingStatus ? 'cargando…' : `${availableCount}/${catalog.length} disponibles`}
              {allowedModels.length > 0 && <span className="ml-1 text-indigo-600 font-medium">· solo permitidos ({allowedModels.length})</span>}
            </span>
          </div>
          {Object.keys(status?.rotator.catalogErrors || {}).length > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 space-y-1">
              {Object.entries(status!.rotator.catalogErrors!).map(([prov, err]) => (
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
            <p className="text-xs text-gray-500 mb-2">Actual: <span className="font-mono text-gray-700">{status.rotator.current.modelKey}</span></p>
          )}

          {/* Solo usar estos modelos (allowlist) */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Solo usar estos modelos</span>
              {allowedModels.length > 0 && <span className="text-xs text-indigo-600 font-medium">activo</span>}
            </div>
            <p className="text-xs text-gray-400 mb-2">Clic en un modelo del catálogo para añadirlo/quitarlo, o escribe con formato <code className="text-gray-600">proveedor::modelo</code> (uno por línea; puede ser uno no listado). Vacío = rotación libre.</p>
            <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 mb-2">
              {catalog.map((c) => {
                const active = parsedModelsInput.includes(c.modelKey);
                return (
                  <button key={c.modelKey} onClick={() => toggleAllowedFromCatalog(c.modelKey)} title={`${c.modelKey} · score ${c.score}`}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-all ${active ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'}`}>
                    {active ? '✓ ' : ''}{c.modelKey.length > 34 ? c.modelKey.slice(0, 34) + '…' : c.modelKey}
                  </button>
                );
              })}
            </div>
            <textarea value={modelsInput} onChange={(e) => setModelsInput(e.target.value)} rows={2}
              placeholder={'nvidia::nvidia/nemotron-nano-9b-v2\nopenrouter::deepseek/deepseek-chat-v3-0324:free'}
              className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleSaveModels()} disabled={savingModels}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5">
                {savingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pin className="w-3.5 h-3.5" />} Guardar selección
              </button>
              <button onClick={() => { setModelsInput(''); handleSaveModels([]); }} disabled={savingModels}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200">
                Rotación libre
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tipos + instrucciones (compartido) ── */}
      <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-4 h-4 text-pink-500" />
          <h3 className="font-semibold text-gray-800">Tipos de módulo e instrucciones</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {(status?.moduleTypes || []).map((t) => {
            const active = selectedTypes.includes(t);
            return (
              <button key={t} onClick={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-md shadow-pink-200'
                         : 'bg-white text-gray-600 border-pink-200 hover:border-pink-400'
                }`}>
                {active ? '✓ ' : ''}{t}
              </button>
            );
          })}
        </div>
        <textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)}
          placeholder="Instrucciones extra (opcional; en lotes, cada set recibe además una dirección creativa automática distinta)…"
          rows={2} className="w-full px-3 py-2 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button onClick={handleGenerate} disabled={generating || selectedTypes.length === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium text-sm shadow-lg shadow-pink-200 disabled:opacity-50 flex items-center gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {generating ? `Generando (${items.filter((i) => i.state === 'done' || i.state === 'error').length}/${items.length})…` : `Generar ${selectedTypes.length} módulo(s) ahora`}
          </button>
          {doneItems.length > 0 && (
            <button onClick={() => setShowFullPreview((v) => !v)} className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-medium text-sm hover:bg-indigo-100 flex items-center gap-2">
              <Eye className="w-4 h-4" /> {showFullPreview ? 'Ocultar' : 'Ver'} preview conjunto ({doneItems.length})
            </button>
          )}
        </div>

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

        {items.some((it) => it.result) && (
          <div className="mt-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Eye className="w-4 h-4 text-pink-500" /> Aprobar e importar los de ahora</h4>
            <button onClick={handleImport} disabled={importing || checkedCount === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Importar {checkedCount} al RAG
            </button>
          </div>
        )}
      </div>

      {showFullPreview && doneItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Preview conjunto</h3>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(Object.keys(VIEWPORTS) as Viewport[]).map((vp) => (
                <button key={vp} onClick={() => setViewport(vp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${viewport === vp ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>
                  {VIEWPORTS[vp].icon} {VIEWPORTS[vp].label}
                </button>
              ))}
            </div>
          </div>
          <ScaledViewportFrame html={fullPreviewHtml} viewport={viewport} height={720} title="preview-conjunto" />
        </div>
      )}

      {/* ── Módulos individuales (generación manual) ── */}
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
                <input type="checkbox" checked={!!checked[idx]} onChange={(e) => setChecked((prev) => ({ ...prev, [idx]: e.target.checked }))}
                  className="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.failed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {r.failed ? 'inválido tras reintentos' : 'válido'}
                    </span>
                    <span className="font-semibold text-gray-800">{r.brief?.style_name || r.moduleType}</span>
                    <span className="text-xs text-gray-400">{r.moduleType} · {r.attempts} intento(s) · {r.models[r.models.length - 1]}</span>
                  </div>
                  {r.brief?.concepto && <p className="text-xs text-gray-500 mt-1 truncate">{r.brief.concepto}</p>}
                  {r.failed && r.validation.errors.length > 0 && <p className="text-xs text-red-600 mt-1">{r.validation.errors.slice(0, 3).join(' · ')}</p>}
                </div>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                {(Object.keys(VIEWPORTS) as Viewport[]).map((vp) => (
                  <button key={vp} onClick={() => setViewport(vp)} title={VIEWPORTS[vp].label}
                    className={`px-2.5 py-1.5 rounded-lg text-xs ${viewport === vp ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>
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

      {/* ── Lote automático en background ── */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-500" /> Generación automática (lotes en background)
          </h3>
          {batch?.active ? (
            <button onClick={handleStopBatch} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center gap-2">
              <Square className="w-4 h-4" /> Detener
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">Sets (1-20):</label>
              <input type="number" min={1} max={20} value={batchSets} onChange={(e) => setBatchSets(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1.5 border border-emerald-200 rounded-lg text-sm" />
              <button onClick={handleStartBatch} disabled={batchStarting || selectedTypes.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center gap-2">
                {batchStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Dejar generando {batchSets} set(s) × {selectedTypes.length || '—'}
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Sin instrucciones, cada set recibe una dirección creativa automática distinta y estética/firma exclusivas (cero sets con estilo repetido). Los módulos se guardan para revisarlos después, usando solo los modelos permitidos.
        </p>
        {batch && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{batch.active ? `${batch.currentLabel || 'iniciando'} · ${batch.generated} generados · ${batch.failed} fallidos` : `terminado: ${batch.generated} generados, ${batch.failed} fallidos`}</span>
              <span>{batch.doneSets}/{batch.totalSets} sets</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${batchProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Resultados guardados (revisión posterior) ── */}
      <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Eye className="w-4 h-4 text-pink-500" /> Resultados guardados
            <span className="text-xs text-gray-400 font-normal">({results.length})</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {['', 'generated', 'approved', 'rejected', 'imported'].map((f) => (
              <button key={f || 'all'} onClick={() => setResultsFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${resultsFilter === f ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === '' ? 'todos' : f === 'generated' ? 'por revisar' : f === 'approved' ? 'aprobados' : f === 'rejected' ? 'rechazados' : 'importados'}
              </button>
            ))}
            <button onClick={handleImportApproved} disabled={importing}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Importar aprobados
            </button>
          </div>
        </div>
        {loadingResults ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : results.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin resultados aún — lanza un lote o genera módulos.</p>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    r.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                    : r.status === 'rejected' ? 'bg-red-100 text-red-600'
                    : r.status === 'imported' ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status === 'generated' ? 'por revisar' : r.status === 'approved' ? 'aprobado' : r.status === 'rejected' ? 'rechazado' : 'importado'}
                  </span>
                  <span className="font-semibold text-sm text-gray-800">{r.styleName || r.moduleType}</span>
                  <span className="text-xs text-gray-400">{r.moduleType} · set {r.setIndex}{r.critiqueScore !== null ? ` · score ${r.critiqueScore}` : ''}{r.refined ? ' · refinado' : ''}{!r.valid ? ' · inválido' : ''}</span>
                  <span className="text-[11px] text-gray-400 font-mono hidden md:inline">{r.models[r.models.length - 1]}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {r.status !== 'imported' && (
                      <>
                        <button onClick={() => handleReview(r.id, true)} disabled={r.status === 'approved'}
                          className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 disabled:opacity-40">Aprobar</button>
                        <button onClick={() => handleReview(r.id, false)} disabled={r.status === 'rejected'}
                          className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-40">Rechazar</button>
                      </>
                    )}
                    {r.importedModuleId && <span className="text-[11px] text-indigo-500 font-mono">{r.importedModuleId}</span>}
                    <button onClick={() => expandResult(r.id)} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {expandedResult[r.id] ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>
                {expandedResult[r.id] !== undefined && expandedResult[r.id] !== '' && (
                  <div className="p-3">
                    <ScaledViewportFrame html={expandedResult[r.id]} viewport={viewport} height={520} title={`resultado-${r.id}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
