/**
 * ============================================================================
 * RUTAS /api/demo-set — Demo de sets SIN IA (proceso independiente)
 * ============================================================================
 * Montaje aditivo en server/index.js:  app.use('/api/demo-set', demoSetRoutes)
 * No toca ningún flujo existente: solo lee admin_config/admin_sessions y la
 * caché de imágenes de free-image-service.
 *
 *   GET  /config    → paletas de demo + proveedores de imagen disponibles
 *   POST /generar   → multipart files[] (+ paletteId, provider)
 *                     → JSON { html, stats }  (o descarga directa con ?download=1)
 * ============================================================================
 */
import { Router } from 'express';
import multer from 'multer';
import db from './database.js';
import { listDemoPalettes, buildDemoSet, buildDemoSetBatch, groupsFromZipBuffer, groupsFromServerFolder, saveBatch, BATCH_DIR, PROJECT_ROOT } from './demoSetService.js';
import { getFreeImageConfig, FREE_IMAGE_PROVIDERS } from './freeImageService.js';
import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const INSERT_MODULO = db.prepare(`
  INSERT INTO knowledge_base_modules (
    module_id, module_type, style_name, description, tags, descripcion_larga,
    theme_tags, color_palette, css_variables, has_memory_attributes, memory_sources,
    html_content, category, is_active, filename, html_size
  ) VALUES (
    @module_id, @module_type, @style_name, @description, @tags, @descripcion_larga,
    @theme_tags, @color_palette, @css_variables, @has_memory_attributes, @memory_sources,
    @html_content, 'general', 1, @filename, @html_size
  )
`);

function parseMeta(html) {
  const m = html.match(/moduleMetadata\s*=\s*\{([\s\S]*?)\}\s*;?/);
  const out = {};
  if (!m) return out;
  const s = m[1];
  const grab = (k) => { const mm = s.match(new RegExp(k + "\\s*:\\s*['\\\"]([^'\\\"]*)['\\\"]")); return mm ? mm[1] : ''; };
  out.descripcion = grab('descripcion');
  try {
    const tags = s.match(/tags\s*:\s*\[([^\]]*)\]/);
    if (tags) out.tags = tags[1].split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  } catch { /* sin tags */ }
  return out;
}

const router = Router();

// Mismo guard que adminMiddleware de server/index.js (token Bearer en
// admin_sessions), replicado aquí para no modificar el archivo existente.
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autenticado' });
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  const session = db
    .prepare('SELECT admin_id FROM admin_sessions WHERE token = ? AND expires_at > ?')
    .get(token, new Date().toISOString());
  if (!session) return res.status(401).json({ error: 'Token inválido o expirado' });
  req.adminId = session.admin_id;
  next();
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 30, fileSize: 8 * 1024 * 1024 }
});

const uploadLote = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

// ---------------------------------------------------------------------------
// GET /config — paletas y proveedores disponibles (solo lectura)
// ---------------------------------------------------------------------------
router.get('/config', requireAdmin, (req, res) => {
  const cfg = getFreeImageConfig();
  const providers = [
    { id: 'auto', label: 'Automático (config del admin o Pexels/Picsum)', needsKey: false },
    ...FREE_IMAGE_PROVIDERS
      .filter((p) => ['pexels', 'picsum', 'pollinations-flux', 'pollinations-turbo', 'local-stock'].includes(p.id))
      .map((p) => ({ id: p.id, label: p.label, needsKey: p.needsKey }))
  ];
  res.json({
    palettes: listDemoPalettes(),
    providers,
    carpetasSugeridas: ['modulos-1/sets-fotos', 'modulos-1', 'modulos-1/coleccion-arte', 'modulos-1/colecciones', 'modulos-1/radical-conceptos'],
    defaults: {
      providerConfigured: cfg.provider,
      pexelsKeyPresent: Boolean(cfg.pexelsKey)
    }
  });
});

// ---------------------------------------------------------------------------
// POST /generar — ensambla el demo (JSON o descarga con ?download=1)
// ---------------------------------------------------------------------------
router.post('/generar', requireAdmin, upload.array('files', 30), async (req, res) => {
  try {
    const files = (req.files || []).filter(
      (f) => /\.html?$/i.test(f.originalname || '') || /<section/i.test(f.buffer.toString('utf8').slice(0, 2000))
    );
    if (!files.length) {
      return res.status(400).json({ error: 'Sube al menos un archivo HTML de módulo (sección con <section>)' });
    }

    const result = await buildDemoSet({
      files,
      paletteId: (req.body.paletteId || '').trim() || null,
      provider: (req.body.provider || '').trim() || 'auto'
    });

    console.log(
      `[DEMO-SET] ✅ ${result.stats.modulos} módulos · paleta "${result.stats.paleta.label}" (${result.stats.paleta.origen}) · ` +
      `${result.stats.imagenes.reemplazadas}/${result.stats.imagenes.total} imgs (${result.stats.proveedor}) · ` +
      `${(result.stats.bytes / 1024 / 1024).toFixed(2)} MB · ${result.stats.ms} ms`
    );

    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.html);
    }
    res.json(result);
  } catch (e) {
    console.error(`[DEMO-SET] ❌ ${e.message}`);
    res.status(500).json({ error: e.message || 'Error generando el demo' });
  }
});

// ---------------------------------------------------------------------------
// POST /generar-lote — muchos demos a la vez
//   - multipart "zip": archivo .zip con carpetas de colecciones
//   - o body "carpeta": ruta relativa al proyecto en el servidor (p.ej. modulos-1)
// Cada carpeta con módulos → un demo-<carpeta>.html; además un ZIP con todos.
// ---------------------------------------------------------------------------
router.post('/generar-lote', requireAdmin, uploadLote.single('zip'), async (req, res) => {
  try {
    const paletteId = (req.body.paletteId || '').trim() || null;
    const provider = (req.body.provider || '').trim() || 'auto';

    let groups;
    if (req.file) {
      groups = groupsFromZipBuffer(req.file.buffer);
      console.log(`[DEMO-SET] Lote desde ZIP "${req.file.originalname}": ${groups.length} carpeta(s) con módulos`);
    } else if ((req.body.carpeta || '').trim()) {
      groups = groupsFromServerFolder((req.body.carpeta || '').trim());
      console.log(`[DEMO-SET] Lote desde carpeta "${req.body.carpeta.trim()}": ${groups.length} carpeta(s) con módulos`);
    } else {
      return res.status(400).json({ error: 'Sube un archivo .zip o indica una carpeta del servidor' });
    }
    if (!groups.length) {
      return res.status(400).json({ error: 'El ZIP no contiene carpetas con módulos HTML (secciones que empiezan con <section>)' });
    }

    const results = await buildDemoSetBatch({ groups, paletteId, provider });
    const okCount = results.filter((r) => r.ok).length;
    if (!okCount) {
      return res.status(500).json({ error: 'Ninguna colección pudo ensamblarse', detalles: results.map((r) => ({ carpeta: r.folder, error: r.error })) });
    }
    const { batchId, manifest, zipBytes } = saveBatch(results);
    console.log(`[DEMO-SET] ✅ Lote ${batchId}: ${okCount}/${results.length} demos, ZIP de ${(zipBytes / 1048576).toFixed(2)} MB`);

    res.json({
      ok: true,
      batchId,
      total: results.length,
      ensamblados: okCount,
      demos: manifest,
      zip: { filename: 'todos-los-demos.zip', bytes: zipBytes },
      expira: 'los archivos del lote se conservan 24 h en el servidor'
    });
  } catch (e) {
    console.error(`[DEMO-SET] ❌ Lote: ${e.message}`);
    res.status(500).json({ error: e.message || 'Error generando el lote' });
  }
});

// ---------------------------------------------------------------------------
// GET /descargar/:batchId/:file — descarga un demo del lote o el ZIP total
// ---------------------------------------------------------------------------
router.get('/descargar/:batchId/:file', requireAdmin, (req, res) => {
  const batchId = (req.params.batchId || '').replace(/[^a-zA-Z0-9\-]/g, '');
  const file = (req.params.file || '').replace(/[^a-zA-Z0-9\-_.]/g, '');
  if (!batchId || !file) return res.status(400).json({ error: 'Parámetros inválidos' });
  const full = join(BATCH_DIR, batchId, file);
  if (!full.startsWith(BATCH_DIR) || !existsSync(full) || !statSync(full).isFile()) {
    return res.status(404).json({ error: 'Archivo no encontrado (¿expiró el lote? se conservan 24 h)' });
  }
  res.setHeader('Content-Type', file.endsWith('.zip') ? 'application/zip' : 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
  res.sendFile(full);
});

// ---------------------------------------------------------------------------
// POST /importar-rack — sube los módulos de sets del servidor directamente al
// rack modular (knowledge_base_modules), sin pasar por el generador.
// Body: { carpeta: 'modulos-1/sets-fotos' } (toda la raíz) o un set suelto
// ('modulos-1/sets-fotos/premium').
// ---------------------------------------------------------------------------
router.post('/importar-rack', requireAdmin, async (req, res) => {
  try {
    const TIPOS = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles', 'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'];
    const ROOT = join(PROJECT_ROOT, 'modulos-1', 'sets-fotos');
    const carpeta = String(req.body.carpeta || 'modulos-1/sets-fotos').trim();
    const target = join(PROJECT_ROOT, carpeta);
    if (!target.startsWith(PROJECT_ROOT)) return res.status(400).json({ error: 'Carpeta fuera del proyecto' });

    // ¿La carpeta apunta directo a UN set (contiene 01-portada.html)? Si no,
    // es una raíz de colección: cada subcarpeta con módulos es un set.
    const esSet = (dir) => TIPOS.every((t) => readdirSync(dir).some((f) => f.endsWith('-' + t + '.html')));
    const setDirs = [];
    if (existsSync(target) && statSync(target).isDirectory()) {
      if (esSet(target)) setDirs.push(carpeta.split('/').pop());
      else for (const d of readdirSync(target).sort()) {
        const p = join(target, d);
        if (statSync(p).isDirectory() && /^(set-\d+-|premium)$/.test(d) && esSet(p)) setDirs.push(d);
      }
    }
    if (!setDirs.length) return res.status(400).json({ error: 'No se encontraron sets completos en "' + carpeta + '"' });

    const filas = [];
    const keys = [];
    for (const setDir of setDirs) {
      const key = setDir.replace(/^set-\d+-/, '');
      keys.push(key);
      const dir = setDir === carpeta.split('/').pop() && esSet(target) ? target : join(ROOT, setDir);
      const files = readdirSync(dir).filter((f) => f.endsWith('.html'));
      for (const tipo of TIPOS) {
        const f = files.find((x) => x.endsWith('-' + tipo + '.html'));
        if (!f) continue;
        const html = readFileSync(join(dir, f), 'utf-8');
        const meta = parseMeta(html);
        filas.push({
          module_id: `sf-${key}-${tipo}`,
          module_type: tipo,
          style_name: `${key} · ${tipo}`,
          description: (meta.descripcion || `Módulo ${tipo} del set ${key}`).slice(0, 240),
          tags: JSON.stringify(meta.tags || [tipo]),
          descripcion_larga: (meta.descripcion || '').slice(0, 900),
          theme_tags: JSON.stringify([key, 'sets-fotos']),
          color_palette: '',
          css_variables: '',
          has_memory_attributes: /memory_type=/.test(html) ? 1 : 0,
          memory_sources: html.includes('memory_source="library"') ? 'generated,library' : 'generated',
          html_content: html,
          filename: `sets-fotos/${setDir}/${f}`,
          html_size: Buffer.byteLength(html)
        });
      }
    }
    let reemplazadas = 0;
    const tx = db.transaction(() => {
      for (const key of keys) {
        reemplazadas += db.prepare("DELETE FROM knowledge_base_modules WHERE module_id LIKE ?").run('sf-' + key + '-%').changes;
      }
      for (const fila of filas) INSERT_MODULO.run(fila);
    });
    tx();
    const total = db.prepare("SELECT COUNT(*) c FROM knowledge_base_modules WHERE module_id LIKE 'sf-%'").get().c;
    console.log(`[DEMO-SET] 📥 Rack: ${filas.length} módulos importados (${keys.length} sets) desde "${carpeta}" · sf-* total: ${total}`);
    res.json({ ok: true, importados: filas.length, sets: keys.length, reemplazados: reemplazadas, totalSf: total });
  } catch (e) {
    console.error('[DEMO-SET] ❌ importar-rack:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
