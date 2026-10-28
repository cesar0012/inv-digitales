import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Loader2, Upload, Trash2, CheckCircle2, XCircle, Download, Image as ImageIcon,
  Eye, ShieldCheck, RefreshCw, Layers, AlertTriangle, Package
} from 'lucide-react';
import {
  getVisualRackConfig, saveVisualRackConfig, testVisualRackModel,
  getVisualRackItems, uploadVisualRackItem, updateVisualRackItem, deleteVisualRackItem,
  getVisualGenerations, downloadVisualGenerationsZip,
  VisualRackConfig, VisualRagItem, VisualGeneration
} from '../../services/adminService';

type Section = 'metodo' | 'biblioteca' | 'generaciones';

const VISUAL_GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini Flash 3.8' },
  { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro' },
  { id: 'gemini-3.8-flash-lite', name: 'Gemini Flash 3.8 Lite' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
];

export const AdminVisualRack: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('metodo');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
        {(['metodo', 'biblioteca', 'generaciones'] as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === s
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:text-pink-600 border border-gray-200'
            }`}
          >
            {s === 'metodo' ? 'Método y Proveedor IA' : s === 'biblioteca' ? 'Biblioteca RAG Visual' : 'Generaciones archivadas'}
          </button>
        ))}
      </div>

      {activeSection === 'metodo' && <MethodConfig />}
      {activeSection === 'biblioteca' && <LibrarySection />}
      {activeSection === 'generaciones' && <GenerationsSection />}
    </div>
  );
};

/* ============================================================
 * 1) Método de generación + proveedor IA con TEST DE VISIÓN
 * ============================================================ */
const MethodConfig: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [cfg, setCfg] = useState<VisualRackConfig | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; answer?: string; error?: string } | null>(null);
  // Firma local de la config probada: habilita Guardar solo si coincide.
  const sig = () => JSON.stringify([provider, provider === 'openai' ? openaiBaseUrl.trim() : '', provider === 'openai' ? openaiModel.trim() : geminiModel, provider === 'openai' ? (openaiApiKey ? 'new' : 'keep') : 'google']);
  const [testedSig, setTestedSig] = useState<string | null>(null);
  const testValidForCurrent = testedSig !== null && testedSig === sig();

  const load = async () => {
    setLoading(true);
    try {
      const c = await getVisualRackConfig();
      setCfg(c);
      setProvider(c.provider);
      setGeminiModel(c.geminiModel || 'gemini-3.8-flash');
      setOpenaiBaseUrl(c.openaiBaseUrl || '');
      setOpenaiModel(c.openaiModel || '');
      if (c.visionMatchesConfig) setTestedSig(sig());
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testVisualRackModel({
        provider,
        baseUrl: provider === 'openai' ? openaiBaseUrl : undefined,
        apiKey: provider === 'openai' ? openaiApiKey || undefined : undefined,
        model: provider === 'openai' ? openaiModel : geminiModel
      });
      setTestResult(result);
      if (result.ok) setTestedSig(sig());
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveVisualRackConfig({
        provider,
        geminiModel,
        openaiBaseUrl,
        openaiModel,
        openaiApiKey: openaiApiKey || undefined,
        enabled: 0
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await load();
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!cfg) return;
    const next = cfg.enabled ? 0 : 1;
    if (next === 1 && !testValidForCurrent && !cfg.visionMatchesConfig) {
      alert('Antes de activar el método visual, el modelo debe pasar el test de visión con la configuración actual.');
      return;
    }
    setSaving(true);
    try {
      await saveVisualRackConfig({
        provider,
        geminiModel,
        openaiBaseUrl,
        openaiModel,
        openaiApiKey: openaiApiKey || undefined,
        enabled: next as 0 | 1
      });
      await load();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Estado del método */}
      <div className={`rounded-xl border p-4 flex items-start gap-4 ${cfg?.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cfg?.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`}>
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">
            Método de generación: {cfg?.enabled ? 'RAG VISUAL (imagen de referencia)' : 'RAG MODULAR (actual)'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {cfg?.enabled
              ? 'Las invitaciones de los clientes se generarán desde la imagen de referencia elegida en el rack visual. El flujo modular queda intacto como respaldo: si el método visual falla, la generación cae automáticamente al proceso anterior.'
              : 'Activa el RAG Visual para generar invitaciones a partir de una imagen de referencia. Requiere: modelo con test de visión aprobado + al menos una imagen apta en la biblioteca.'}
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">{cfg?.visionVerified ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />} Visión: {cfg?.visionVerified ? 'verificada' : 'sin verificar'}</span>
            <span className="inline-flex items-center gap-1"><ImageIcon className="w-4 h-4" /> {cfg?.suitableCount ?? 0} imagen(es) apta(s)</span>
            <span className="inline-flex items-center gap-1"><Package className="w-4 h-4" /> {cfg?.generationCount ?? 0} generación(es) archivada(s)</span>
          </div>
        </div>
        <button
          onClick={handleToggleEnabled}
          disabled={saving || (cfg?.enabled ? false : (!cfg?.visionVerified))}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 ${cfg?.enabled ? 'bg-gray-500 hover:bg-gray-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : cfg?.enabled ? 'Volver a modular' : 'Activar método visual'}
        </button>
      </div>

      {/* Proveedor */}
      <div className="rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Eye className="w-5 h-5 text-pink-500" /> Proveedor de IA (debe entender imágenes)</h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setProvider('gemini'); setTestResult(null); }}
            className={`p-3 rounded-lg border text-left transition-all ${provider === 'gemini' ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white hover:border-pink-200'}`}
          >
            <p className="font-medium text-sm text-gray-800">Google Gemini (key existente)</p>
            <p className="text-xs text-gray-500 mt-1">Usa la API key de Google ya configurada en Modelos AI.</p>
          </button>
          <button
            onClick={() => { setProvider('openai'); setTestResult(null); }}
            className={`p-3 rounded-lg border text-left transition-all ${provider === 'openai' ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white hover:border-pink-200'}`}
          >
            <p className="font-medium text-sm text-gray-800">OpenAI-compatible</p>
            <p className="text-xs text-gray-500 mt-1">Z.AI/GLM, OpenRouter u otro proveedor con endpoint /chat/completions.</p>
          </button>
        </div>

        {provider === 'gemini' ? (
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Modelo Gemini para RAG Visual</span>
            <select
              value={VISUAL_GEMINI_MODELS.some((m) => m.id === geminiModel) ? geminiModel : 'custom'}
              onChange={(e) => { setGeminiModel(e.target.value === 'custom' ? '' : e.target.value); setTestResult(null); }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {VISUAL_GEMINI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              <option value="custom">Otro (escribir)…</option>
            </select>
            {!VISUAL_GEMINI_MODELS.some((m) => m.id === geminiModel) && (
              <input
                value={geminiModel}
                onChange={(e) => { setGeminiModel(e.target.value); setTestResult(null); }}
                placeholder="id-del-modelo"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            )}
          </label>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Base URL</span>
              <input value={openaiBaseUrl} onChange={(e) => { setOpenaiBaseUrl(e.target.value); setTestResult(null); }}
                placeholder="https://api.z.ai/api/paas/v4" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">API Key {cfg?.hasOpenaiApiKey && <span className="text-xs text-gray-400">(guardada; vacío = conservar)</span>}</span>
              <input type="password" value={openaiApiKey} onChange={(e) => { setOpenaiApiKey(e.target.value); setTestResult(null); }}
                placeholder="sk-…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Modelo</span>
              <input value={openaiModel} onChange={(e) => { setOpenaiModel(e.target.value); setTestResult(null); }}
                placeholder="glm-4.6v" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>
        )}

        {/* Test de visión */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-700">
              <p className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-500" /> Test de visión obligatorio</p>
              <p className="text-xs text-gray-500 mt-1">Envía una imagen diminuta conocida (cuadrado rojo) al modelo y exige identificarla. Solo una config aprobada puede activarse.</p>
            </div>
            <button onClick={handleTest} disabled={testing || (provider === 'openai' && !openaiBaseUrl)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-40">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {testing ? 'Probando…' : 'Probar visión'}
            </button>
          </div>
          {testResult && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${testResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.ok
                ? `✓ El modelo ve imágenes (respondió: "${testResult.answer}")`
                : `✗ ${testResult.error || 'El modelo no identificó la imagen'}`}
            </div>
          )}
          {!testResult && testValidForCurrent && (
            <p className="mt-3 text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Configuración actual ya verificada.</p>
          )}
        </div>

        <button onClick={handleSave} disabled={saving || (provider === 'openai' && !openaiBaseUrl)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar proveedor {saved && <span className="text-white/90">✓</span>}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
 * 2) Biblioteca de imágenes de referencia (RAG Visual)
 * ============================================================ */
const LibrarySection: React.FC = () => {
  const [items, setItems] = useState<VisualRagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await getVisualRackItems()); }
    catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const uploadFiles = async (files: File[]) => {
    const images = files.filter((f) => /^image\//.test(f.type));
    if (images.length === 0) return;
    setUploading(true);
    for (const f of images) {
      try {
        const { item } = await uploadVisualRackItem(f);
        setItems((prev) => [item, ...prev]);
      } catch (e: any) {
        alert(`Error subiendo ${f.name}: ${e.message}`);
      }
    }
    setUploading(false);
  };

  const toggleActive = async (item: VisualRagItem) => {
    try {
      const updated = await updateVisualRackItem(item.id, { isActive: !item.isActive });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (item: VisualRagItem) => {
    if (!window.confirm(`¿Eliminar "${item.styleName || item.filename}" de la biblioteca?`)) return;
    try {
      await deleteVisualRackItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-pink-400 bg-pink-50' : 'border-gray-300 hover:border-pink-300'}`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { uploadFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
        {uploading ? (
          <div className="flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analizando imagen(es) con IA…</div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Arrastra imágenes de diseño o haz clic para subir</p>
            <p className="text-xs text-gray-400 mt-1">Cada imagen se analiza con IA: estilo, paleta, tags y si es apta como referencia de invitación.</p>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">Aún no hay imágenes en la biblioteca.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`rounded-xl border overflow-hidden bg-white ${item.isActive ? 'border-gray-200' : 'border-gray-200 opacity-50'}`}>
              <div className="relative aspect-square bg-gray-100">
                <img src={item.url} alt={item.styleName} className="w-full h-full object-cover" />
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.suitable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {item.suitable ? 'APTA' : 'NO APTA'}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.styleName || 'Sin nombre'}</p>
                <p className="text-xs text-gray-500 line-clamp-2 min-h-[2rem]">{item.descripcion || 'Sin descripción'}</p>
                <div className="flex gap-1">
                  {item.palette.slice(0, 5).map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full border border-gray-200" style={{ background: c }} title={c} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 4).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={item.isActive} onChange={() => toggleActive(item)} className="accent-pink-500" />
                    Activa
                  </label>
                  <button onClick={() => remove(item)} className="text-red-400 hover:text-red-600" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {item.analysisSource === 'manual' && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Sin análisis IA (model no disponible)</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================
 * 3) Generaciones archivadas (descarga como rack modular)
 * ============================================================ */
const GenerationsSection: React.FC = () => {
  const [gens, setGens] = useState<VisualGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setGens(await getVisualGenerations()); }
    catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const download = async () => {
    setDownloading(true);
    try { await downloadVisualGenerationsZip(); }
    catch (e: any) { alert(e.message); }
    finally { setDownloading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-gray-700">
          <p className="font-semibold">Archivo de generaciones del RAG Visual</p>
          <p className="text-xs text-gray-500 mt-1">
            Cada invitación generada con el método visual se guarda por módulos (01-portada.html, 02-padres.html…).
            Descarga el ZIP y arrastra los HTML al RAG Modular (carga masiva) para reutilizarlos como colección.
          </p>
        </div>
        <button onClick={download} disabled={downloading || gens.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-40">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descargar todo (.zip)
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : gens.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">Aún no hay generaciones archivadas con el método visual.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Usuario</th>
                <th className="py-2 px-3">Evento</th>
                <th className="py-2 px-3">Modelo</th>
                <th className="py-2 px-3">Módulos</th>
              </tr>
            </thead>
            <tbody>
              {gens.map((g) => (
                <tr key={g.dir} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">{new Date(g.createdAt).toLocaleString('es-MX')}</td>
                  <td className="py-2 px-3 text-gray-500">{g.userId ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-700">{g.eventType || '—'}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{g.provider}:{g.model}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">{g.moduleCount} módulos</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
