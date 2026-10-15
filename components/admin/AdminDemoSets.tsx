import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Package, Upload, Loader2, Download, ExternalLink, Trash2, AlertCircle, CheckCircle2,
  Monitor, Smartphone, Image as ImageIcon, Palette, Zap, FileCode2, FolderOpen, FileArchive, Eye
} from 'lucide-react';

const API_BASE = `${window.location.origin.replace(':3000', ':3001')}/api`;

interface DemoPalette { id: string; label: string; swatch: string[] }
interface DemoProvider { id: string; label: string; needsKey: boolean }
interface DemoConfig {
  palettes: DemoPalette[];
  providers: DemoProvider[];
  carpetasSugeridas: string[];
  defaults: { providerConfigured: string; pexelsKeyPresent: boolean };
}
interface DemoStats {
  modulos: number; omitidos: string[];
  paleta: { id: string; label: string; origen: string; elegida: string };
  proveedor: string;
  imagenes: { total: number; reemplazadas: number; enCache: number; fallbacks: number; fallidas: number };
  fechaEvento: string; bytes: number; ms: number;
}
interface DemoResult { filename: string; html: string; stats: DemoStats }
interface LoteDemo {
  id: string; folder: string; filename: string; ok: boolean; error: string | null;
  modulos: number; paleta: { id: string; label: string; origen: string } | null;
  imagenes: { total: number; reemplazadas: number; fallidas: number } | null; bytes: number; ms: number;
}
interface LoteResult { batchId: string; total: number; ensamblados: number; demos: LoteDemo[]; zip: { filename: string; bytes: number } }

type Modo = 'archivos' | 'zip' | 'carpeta';

const orderKey = (name: string): number => {
  const num = name.toLowerCase().match(/(\d{1,2})[-_.]/);
  if (num) return parseInt(num[1], 10);
  const tipos = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles', 'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'];
  const ti = tipos.findIndex((t) => name.toLowerCase().includes(t));
  return ti === -1 ? 99 : ti + 1;
};

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(2)} MB`;

export const AdminDemoSets: React.FC = () => {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [modo, setModo] = useState<Modo>('carpeta');

  const [files, setFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [carpeta, setCarpeta] = useState('modulos-1/sets-fotos');

  const [paletteId, setPaletteId] = useState('auto');
  const [provider, setProvider] = useState('auto');
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [result, setResult] = useState<DemoResult | null>(null);
  const [lote, setLote] = useState<LoteResult | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!generating) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [generating]);

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

  const setZip = (f: File | null) => {
    if (f && !/\.zip$/i.test(f.name)) { setError('Sube un archivo .zip'); return; }
    setError(null);
    setLote(null);
    setZipFile(f);
  };

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const generar = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    setLote(null);
    setPreviewHtml(null);
    try {
      const fd = new FormData();
      fd.append('paletteId', paletteId === 'auto' ? '' : paletteId);
      fd.append('provider', provider);

      if (modo === 'archivos') {
        if (!files.length) throw new Error('Sube al menos un módulo HTML');
        for (const f of sortedFiles) fd.append('files', f, f.name);
        const res = await fetch(`${API_BASE}/demo-set/generar`, { method: 'POST', headers: authHeaders(), body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setResult(data);
      } else {
        if (modo === 'zip') {
          if (!zipFile) throw new Error('Sube un archivo .zip con las carpetas de colecciones');
          fd.append('zip', zipFile, zipFile.name);
        } else {
          if (!carpeta.trim()) throw new Error('Indica una carpeta del servidor (p. ej. modulos-1/sets-fotos)');
          fd.append('carpeta', carpeta.trim());
        }
        const res = await fetch(`${API_BASE}/demo-set/generar-lote`, { method: 'POST', headers: authHeaders(), body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setLote(data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const fetchBatchFile = async (batchId: string, file: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/demo-set/descargar/${batchId}/${file}`, { headers: authHeaders() });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `HTTP ${res.status}`);
    }
    return res.blob();
  };

  const descargarArchivo = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const descargarLoteZip = async () => {
    if (!lote) return;
    try {
      descargarArchivo(await fetchBatchFile(lote.batchId, lote.zip.filename), lote.zip.filename);
    } catch (e) { setError((e as Error).message); }
  };

  const descargarDemoLote = async (d: LoteDemo) => {
    if (!lote) return;
    try {
      descargarArchivo(await fetchBatchFile(lote.batchId, d.filename), d.filename);
    } catch (e) { setError((e as Error).message); }
  };

  const verDemoLote = async (d: LoteDemo) => {
    if (!lote) return;
    try {
      const blob = await fetchBatchFile(lote.batchId, d.filename);
      setPreviewHtml(await blob.text());
      setPreviewName(d.filename);
    } catch (e) { setError((e as Error).message); }
  };

  const openTab = () => {
    const html = result?.html || previewHtml;
    if (!html) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    window.open(blobUrlRef.current, '_blank');
  };

  const previewSrc = result?.html || previewHtml;
  const previewTitle = result?.filename || previewName;

  const MODOS: { id: Modo; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'carpeta', label: 'Carpeta del servidor', icon: <FolderOpen className="w-4 h-4" />, desc: 'Escanea una carpeta del repositorio (ej. modulos-1/sets-fotos) y arma un demo por cada subcarpeta de colección. Sin subir nada.' },
    { id: 'zip', label: 'ZIP de colecciones', icon: <FileArchive className="w-4 h-4" />, desc: 'Sube un .zip con muchas colecciones (ej. el zip de modulos-1): cada carpeta con módulos se convierte en su propio demo HTML.' },
    { id: 'archivos', label: 'Archivos sueltos', icon: <Upload className="w-4 h-4" />, desc: 'Selecciona los módulos de un solo set (usualmente 12) y ensambla ese demo.' }
  ];

  return (
    <div className="space-y-6">
      {/* ---------- Qué es ---------- */}
      <div className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4">
        <Zap className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-600 leading-relaxed">
          Genera <strong>invitaciones demo</strong> ensamblando módulos con paleta de demo, fecha simulada e imágenes reales
          incrustadas en <strong>base64</strong> — un solo HTML autocontenido, descargable y compartible por colección.
          <strong> Proceso 100% independiente: no consume IA ni modifica nada del flujo agéntico.</strong>
        </p>
      </div>

      {/* ---------- Modo ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODOS.map((m) => (
          <button
            key={m.id}
            onClick={() => { setModo(m.id); setError(null); setResult(null); setLote(null); setPreviewHtml(null); }}
            className={`text-left p-4 rounded-xl border transition-all ${
              modo === m.id
                ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">{m.icon} {m.label}</span>
            <span className="block text-xs text-gray-500 mt-1.5 leading-relaxed">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* ---------- Entrada según modo ---------- */}
      {modo === 'archivos' && (
        <>
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
        </>
      )}

      {modo === 'zip' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); setZip(e.dataTransfer.files?.[0] || null); }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40'
          }`}
          onClick={() => zipInputRef.current?.click()}
        >
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => setZip(e.target.files?.[0] || null)}
          />
          <FileArchive className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          {zipFile ? (
            <p className="text-sm font-medium text-gray-700">{zipFile.name} · {mb(zipFile.size)}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Arrastra aquí el ZIP con las colecciones</p>
              <p className="text-xs text-gray-500 mt-1">cada carpeta interna con módulos .html se convierte en un demo independiente</p>
            </>
          )}
          {zipFile && (
            <button
              onClick={(e) => { e.stopPropagation(); setZip(null); }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" /> Quitar ZIP
            </button>
          )}
        </div>
      )}

      {modo === 'carpeta' && (
        <div className="border border-gray-200 rounded-2xl p-5 bg-white">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <FolderOpen className="w-3.5 h-3.5" /> Carpeta del repositorio en el servidor
          </label>
          <input
            type="text"
            value={carpeta}
            onChange={(e) => setCarpeta(e.target.value)}
            list="demo-carpetas"
            placeholder="modulos-1/sets-fotos"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <datalist id="demo-carpetas">
            {config?.carpetasSugeridas.map((c) => <option key={c} value={c} />)}
          </datalist>
          <p className="text-xs text-gray-500 mt-2">
            Escanea en profundidad: cada subcarpeta que contenga módulos (archivos que empiezan con <code>&lt;section</code>) genera su propio demo,
            con el nombre de la carpeta. Los index/previews del catálogo se ignoran.
          </p>
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
        onClick={generar}
        disabled={generating || (modo === 'archivos' && !files.length) || (modo === 'zip' && !zipFile)}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:cursor-not-allowed"
      >
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
        {generating
          ? `Ensamblando${loteLabel(modo)}… ${elapsed}s${elapsed > 25 ? ' (la primera vez descarga imágenes, luego usa caché)' : ''}`
          : generarLabel(modo)}
      </button>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* ---------- Resultado individual ---------- */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Demo listo · <strong>{result.stats.modulos}</strong> módulos · paleta <strong>{result.stats.paleta.label}</strong> ({result.stats.paleta.elegida === 'auto' ? `autodetectada: ${result.stats.paleta.origen}` : 'manual'}) ·{' '}
              <strong>{result.stats.imagenes.reemplazadas}/{result.stats.imagenes.total}</strong> imágenes base64 ({result.stats.proveedor}
              {result.stats.imagenes.enCache > 0 ? `, ${result.stats.imagenes.enCache} en caché` : ''}) · {mb(result.stats.bytes)} · {result.stats.ms} ms
              {result.stats.imagenes.fallidas > 0 && ` · ⚠ ${result.stats.imagenes.fallidas} imagen(es) sin resolver`}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => descargarArchivo(new Blob([result.html], { type: 'text/html;charset=utf-8' }), result.filename)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25 hover:from-pink-600 hover:to-rose-600 transition-all text-sm"
            >
              <Download className="w-4 h-4" /> Descargar HTML
            </button>
            <VerEnPestanha openTab={openTab} />
          </div>
        </div>
      )}

      {/* ---------- Resultado del lote ---------- */}
      {lote && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Lote listo · <strong>{lote.ensamblados}/{lote.total}</strong> colecciones ensambladas · ZIP total {mb(lote.zip.bytes)} ·{' '}
              los archivos quedan en el servidor 24 h por si quieres volver a descargarlos
            </span>
          </div>

          <button
            onClick={descargarLoteZip}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25 hover:from-pink-600 hover:to-rose-600 transition-all text-sm"
          >
            <Download className="w-4 h-4" /> Descargar ZIP con todos los demos
          </button>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-semibold">Colección</th>
                  <th className="px-3 py-2.5 font-semibold">Módulos</th>
                  <th className="px-3 py-2.5 font-semibold">Imágenes</th>
                  <th className="px-3 py-2.5 font-semibold">Paleta</th>
                  <th className="px-3 py-2.5 font-semibold">Peso</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lote.demos.map((d) => (
                  <tr key={d.id} className={d.ok ? 'bg-white' : 'bg-red-50/50'}>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{d.id}</td>
                    <td className="px-3 py-2.5 text-gray-600">{d.ok ? d.modulos : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {d.ok && d.imagenes ? `${d.imagenes.reemplazadas}/${d.imagenes.total}${d.imagenes.fallidas ? ` (⚠ ${d.imagenes.fallidas})` : ''}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {d.ok && d.paleta ? `${d.paleta.label}${d.paleta.origen !== 'default' ? ' ·auto' : ''}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{d.ok ? mb(d.bytes) : <span className="text-red-500 text-xs">{d.error}</span>}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {d.ok && (
                        <>
                          <button
                            onClick={() => verDemoLote(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-emerald-600 border border-gray-200 rounded-lg hover:border-emerald-300 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                          <button
                            onClick={() => descargarDemoLote(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 ml-1.5 text-xs text-gray-600 hover:text-pink-600 border border-gray-200 rounded-lg hover:border-pink-300 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" /> HTML
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- Preview común ---------- */}
      {previewSrc && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 font-mono">{previewTitle}</span>
            <VerEnPestanha openTab={openTab} />
            <div className="flex rounded-xl overflow-hidden border border-gray-200 ml-auto">
              <button
                onClick={() => setMobilePreview(false)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium ${!mobilePreview ? 'bg-gray-800 text-white' : 'bg-white text-gray-500'}`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                onClick={() => setMobilePreview(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium ${mobilePreview ? 'bg-gray-800 text-white' : 'bg-white text-gray-500'}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Móvil 390px
              </button>
            </div>
          </div>
          <div className="flex justify-center bg-gray-100 rounded-xl overflow-hidden">
            <div style={{ width: mobilePreview ? '390px' : '100%', maxWidth: '100%' }} className="bg-white shadow-md overflow-hidden rounded-xl">
              <iframe
                title="demo-set-preview"
                srcDoc={previewSrc}
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

const loteLabel = (modo: Modo) => (modo === 'archivos' ? '' : ' lote');
const generarLabel = (modo: Modo) =>
  modo === 'zip' ? 'Generar demos de todas las colecciones del ZIP'
  : modo === 'carpeta' ? 'Generar demos de todas las colecciones de la carpeta'
  : 'Generar demo del set';

const VerEnPestanha: React.FC<{ openTab: () => void }> = ({ openTab }) => (
  <button
    onClick={openTab}
    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm"
  >
    <ExternalLink className="w-4 h-4" /> Abrir en pestaña nueva
  </button>
);
