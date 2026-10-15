import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Package, Upload, Loader2, Download, ExternalLink, Trash2, AlertCircle, CheckCircle2,
  Monitor, Smartphone, Image as ImageIcon, Palette, Zap, FileCode2
} from 'lucide-react';

const API_BASE = `${window.location.origin.replace(':3000', ':3001')}/api`;

interface DemoPalette { id: string; label: string; swatch: string[] }
interface DemoProvider { id: string; label: string; needsKey: boolean }
interface DemoConfig { palettes: DemoPalette[]; providers: DemoProvider[]; defaults: { providerConfigured: string; pexelsKeyPresent: boolean } }
interface DemoStats {
  modulos: number; omitidos: string[];
  paleta: { id: string; label: string; origen: string; elegida: string };
  proveedor: string;
  imagenes: { total: number; reemplazadas: number; enCache: number; fallbacks: number; fallidas: number };
  fechaEvento: string; bytes: number; ms: number;
}
interface DemoResult { filename: string; html: string; stats: DemoStats }

const orderKey = (name: string): number => {
  const num = name.toLowerCase().match(/(\d{1,2})[-_.]/);
  if (num) return parseInt(num[1], 10);
  const tipos = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles', 'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'];
  const ti = tipos.findIndex((t) => name.toLowerCase().includes(t));
  return ti === -1 ? 99 : ti + 1;
};

export const AdminDemoSets: React.FC = () => {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [paletteId, setPaletteId] = useState('auto');
  const [provider, setProvider] = useState('auto');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_BASE}/demo-set/config`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setConfig(await res.json());
      } catch (e) {
        setError(`No se pudo cargar la configuración: ${(e as Error).message}`);
      }
    })();
  }, []);

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const sortedFiles = useMemo(() => [...files].sort((a, b) => orderKey(a.name) - orderKey(b.name)), [files]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const htmls = Array.from(incoming).filter((f) => /\.html?$/i.test(f.name));
    if (!htmls.length) { setError('Solo se aceptan archivos .html de módulos'); return; }
    setError(null);
    setResult(null);
    setFiles((prev) => {
      const byName = new Map(prev.map((f) => [f.name, f]));
      for (const f of htmls) byName.set(f.name, f);
      return [...byName.values()];
    });
  }, []);

  const generate = async () => {
    if (!files.length) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      for (const f of sortedFiles) fd.append('files', f, f.name);
      fd.append('paletteId', paletteId === 'auto' ? '' : paletteId);
      fd.append('provider', provider);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/demo-set/generar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const openTab = () => {
    if (!result) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = URL.createObjectURL(new Blob([result.html], { type: 'text/html;charset=utf-8' }));
    window.open(blobUrlRef.current, '_blank');
  };

  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="space-y-6">
      {/* ---------- Qué es ---------- */}
      <div className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4">
        <Zap className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-600 leading-relaxed">
          Genera una <strong>invitación demo</strong> a partir de los módulos que subas (usualmente un set de 12):
          se ensamblan con una paleta de demo, fecha simulada a +60 días e imágenes reales de proveedores gratuitos
          incrustadas en <strong>base64</strong>. Todo en un solo HTML descargable y compartible.
          <strong> Proceso 100% independiente: no consume IA ni modifica nada del flujo agéntico.</strong>
        </p>
      </div>

      {/* ---------- Subida ---------- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          dragOver ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/40'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".html,text/html"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />
        <Upload className="w-8 h-8 text-pink-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">Arrastra aquí los módulos HTML del set</p>
        <p className="text-xs text-gray-500 mt-1">o haz clic para seleccionarlos · se ordenan por número de archivo (01-, 02-, …)</p>
      </div>

      {files.length > 0 && (
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-pink-500" />
              {files.length} módulo{files.length !== 1 ? 's' : ''} listo{files.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setFiles([]); setResult(null); }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Quitar todos
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedFiles.map((f) => (
              <span key={f.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
                <span className="w-5 h-5 rounded bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-[10px]">
                  {orderKey(f.name) === 99 ? '?' : orderKey(f.name)}
                </span>
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Opciones ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Palette className="w-3.5 h-3.5" /> Paleta de demo
          </span>
          <select
            value={paletteId}
            onChange={(e) => setPaletteId(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="auto">Automática (detecta el set · si no, neutra)</option>
            {config?.palettes.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {paletteId !== 'auto' && config && (
            <div className="flex gap-1 mt-2">
              {config.palettes.find((p) => p.id === paletteId)?.swatch.map((c, i) => (
                <span key={i} className="w-5 h-5 rounded-full border border-white shadow" style={{ background: c }} />
              ))}
            </div>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <ImageIcon className="w-3.5 h-3.5" /> Fuente de imágenes
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            {config?.providers.map((p) => (
              <option key={p.id} value={p.id} disabled={p.needsKey && !config.defaults.pexelsKeyPresent && p.id === 'pexels'}>
                {p.label}{p.needsKey && !config.defaults.pexelsKeyPresent ? ' (sin API key)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ---------- Acción ---------- */}
      <button
        onClick={generate}
        disabled={generating || !files.length}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:cursor-not-allowed"
      >
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
        {generating ? 'Ensamblando demo (sin IA)…' : 'Generar demo del set'}
      </button>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* ---------- Resultado ---------- */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Demo lista · <strong>{result.stats.modulos}</strong> módulos · paleta <strong>{result.stats.paleta.label}</strong> ({result.stats.paleta.elegida === 'auto' ? `autodetectada: ${result.stats.paleta.origen}` : 'manual'}) ·{' '}
              <strong>{result.stats.imagenes.reemplazadas}/{result.stats.imagenes.total}</strong> imágenes base64 ({result.stats.proveedor}
              {result.stats.imagenes.enCache > 0 ? `, ${result.stats.imagenes.enCache} en caché` : ''}) · {mb(result.stats.bytes)} · {result.stats.ms} ms
              {result.stats.imagenes.fallidas > 0 && ` · ⚠ ${result.stats.imagenes.fallidas} imagen(es) sin resolver`}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={download}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25 hover:from-pink-600 hover:to-rose-600 transition-all text-sm"
            >
              <Download className="w-4 h-4" /> Descargar HTML
            </button>
            <button
              onClick={openTab}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" /> Abrir en pestaña nueva
            </button>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button
                onClick={() => setMobilePreview(false)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium ${!mobilePreview ? 'bg-gray-800 text-white' : 'bg-white text-gray-500'}`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                onClick={() => setMobilePreview(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium ${mobilePreview ? 'bg-gray-800 text-white' : 'bg-white text-gray-500'}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Móvil 390px
              </button>
            </div>
          </div>

          <div className="flex justify-center bg-gray-100 rounded-xl overflow-hidden">
            <div style={{ width: mobilePreview ? '390px' : '100%', maxWidth: '100%' }} className="bg-white shadow-md overflow-hidden rounded-xl">
              <iframe
                title="demo-set-preview"
                srcDoc={result.html}
                sandbox="allow-scripts allow-same-origin"
                className="w-full border-0 bg-white block"
                style={{ height: 640 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
