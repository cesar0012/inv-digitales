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
import { listDemoPalettes, buildDemoSet } from './demoSetService.js';
import { getFreeImageConfig, FREE_IMAGE_PROVIDERS } from './freeImageService.js';

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

export default router;
