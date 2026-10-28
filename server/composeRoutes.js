/**
 * ============================================================================
 * EVENT-FIRST CREATION ROUTES
 * ============================================================================
 * GET  /api/event-types                → event types (step 1)
 * GET  /api/event-types/:id            → the event's knowledge pack: form + module plan (step 2)
 * GET  /api/designs?eventType=…        → certified designs for that event
 * GET  /api/designs/:id/screenshot     → design thumbnail, when one exists
 * GET  /api/designs/:id/sample?eventType=… → the design composed with sample data
 * POST /api/compose/preview            → live preview while the form is filled (no AI, no credit)
 * POST /api/compose/create             → final invitation: modules + data + Nano Banana images (1 credit)
 * ============================================================================
 */

import { Router } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import db from './database.js';
import { listEventTypes, packForClient, resolvePack } from './eventKnowledge/index.js';
import { designsForEvent, designSummary, getDesign, SCREENSHOTS_DIR } from './composer/library.js';
import { composeInvitation } from './composer/compose.js';
import { rateLimit } from './security.js';

// Event names the image resolver maps to photo folders under /img.
const LEGACY_EVENT_NAMES = {
  quinceanera: 'XV Años',
  boda: 'Boda Tradicional',
  bautizo: 'Bautizo',
  comunion: 'Primera Comunión',
  confirmacion: 'Primera Comunión', // same religious imagery; there is no confirmación folder
  cumpleanos: 'Cumpleaños',
  baby_shower: 'Baby Shower',
  otro: 'Otro'
};
// Library photos show people. For weddings (any couple) and generic events we
// don't know who should appear, so those slots get decorative AI images instead.
const DECORATIVE_ONLY = new Set(['boda', 'otro']);

const SAMPLE_DATA = {
  quinceanera: {
    nombre: 'Sofía', fecha: '2027-03-20', hora: '18:30',
    padres: [{ nombre: 'Mamá de Sofía', rol: 'Mamá' }, { nombre: 'Papá de Sofía', rol: 'Papá' }],
    padrinos: [{ rol: 'Velación', nombres: 'Padrinos de ejemplo' }],
    damas: [{ nombre: 'Dama 1' }, { nombre: 'Dama 2' }], chambelanes: [{ nombre: 'Chambelán 1' }, { nombre: 'Chambelán 2' }],
    ubicaciones: [{ tipo: 'Recepción', lugar: 'Salón de eventos', hora: '19:00' }],
    codigo_vestimenta: 'Formal'
  },
  boda: {
    persona1: 'Ana', persona2: 'Luis', fecha: '2027-06-12', hora: '17:00',
    padres: [{ nombre: 'Familia de Ana', rol: 'Mamá', lado: 'p1' }, { nombre: 'Familia de Luis', rol: 'Mamá', lado: 'p2' }],
    padrinos: [{ rol: 'Velación', nombres: 'Padrinos de ejemplo' }],
    ubicaciones: [{ tipo: 'Ceremonia religiosa', lugar: 'Parroquia', hora: '17:00' }, { tipo: 'Recepción', lugar: 'Jardín', hora: '19:00' }],
    codigo_vestimenta: 'Formal'
  }
};
const sampleFor = (packId) => SAMPLE_DATA[packId] || {
  nombre: 'Nombre del festejado', fecha: '2027-05-15', hora: '17:00',
  padres: [{ nombre: 'Mamá', rol: 'Mamá' }, { nombre: 'Papá', rol: 'Papá' }],
  ubicaciones: [{ tipo: 'Fiesta', lugar: 'Lugar del festejo', hora: '17:00' }]
};

/** Plan data for the purchase, or null. RSVP comes from the plan configuration. */
function planFor(userId, purchaseId) {
  if (!purchaseId) return null;
  const plan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(String(userId), String(purchaseId));
  if (!plan) return null;
  const cfg = db.prepare('SELECT has_rsvp FROM plan_config WHERE plan_slug = ?').get(plan.plan_slug);
  return { ...plan, hasRsvp: cfg?.has_rsvp === 1 };
}

const sanitizeBody = (body = {}) => ({
  eventType: String(body.eventType || '').slice(0, 60),
  designId: String(body.designId || '').slice(0, 80),
  data: body.data && typeof body.data === 'object' ? body.data : {},
  preferences: body.preferences && typeof body.preferences === 'object'
    ? { primaryColor: String(body.preferences.primaryColor || ''), secondaryColor: String(body.preferences.secondaryColor || '') }
    : {},
  purchaseId: body.purchaseId ? String(body.purchaseId).slice(0, 64) : ''
});

export function createComposeRouter({ authMiddleware, ensureUserInDB }) {
  const router = Router();

  router.get('/api/event-types', authMiddleware, (req, res) => {
    res.json({ eventTypes: listEventTypes() });
  });

  router.get('/api/event-types/:id', authMiddleware, (req, res) => {
    res.json({ pack: packForClient(resolvePack(req.params.id)) });
  });

  router.get('/api/designs', authMiddleware, (req, res) => {
    const pack = resolvePack(req.query.eventType);
    res.json({ eventType: pack.id, designs: designsForEvent(pack.id).map((d) => designSummary(d, pack.id)) });
  });

  router.get('/api/designs/:id/screenshot', authMiddleware, (req, res) => {
    const design = getDesign(req.params.id);
    if (!design || !design.screenshot) return res.status(404).end();
    const file = join(SCREENSHOTS_DIR, design.screenshot);
    if (!existsSync(file)) return res.status(404).end();
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(file);
  });

  router.get('/api/designs/:id/sample', authMiddleware, rateLimit({ key: 'design-sample', windowMs: 60 * 1000, max: 120, keyFn: (req) => req.user && `u${req.user.id}` }), (req, res) => {
    const pack = resolvePack(req.query.eventType);
    const design = getDesign(req.params.id);
    if (!design) return res.status(404).json({ error: 'Diseño no encontrado' });
    const result = composeInvitation({ eventType: pack.id, designId: design.id, data: sampleFor(pack.id), hasRsvp: true });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-popups');
    res.send(result.html);
  });

  router.post('/api/compose/preview', authMiddleware, rateLimit({ key: 'compose-preview', windowMs: 60 * 1000, max: 300, keyFn: (req) => req.user && `u${req.user.id}` }), (req, res) => {
    try {
      const body = sanitizeBody(req.body);
      const userId = ensureUserInDB(req.user);
      const plan = planFor(userId, body.purchaseId);
      const result = composeInvitation({ ...body, hasRsvp: plan ? plan.hasRsvp : false });
      res.json({ html: result.html, missing: result.missing, report: result.report, design: result.design, eventType: result.pack });
    } catch (e) {
      console.error('[COMPOSE] preview:', e.message);
      res.status(500).json({ error: 'No se pudo armar la vista previa.' });
    }
  });

  router.post('/api/compose/create', authMiddleware, rateLimit({ key: 'compose-create', windowMs: 60 * 1000, max: 10, keyFn: (req) => req.user && `u${req.user.id}` }), async (req, res) => {
    const body = sanitizeBody(req.body);
    let userId = null;
    let charged = false;
    try {
      userId = ensureUserInDB(req.user);
      if (!body.purchaseId) return res.status(400).json({ error: 'purchaseId es requerido' });
      const plan = planFor(userId, body.purchaseId);
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado para este usuario' });

      const result = composeInvitation({ ...body, hasRsvp: plan.hasRsvp });
      if (result.missing.length) {
        return res.status(422).json({ error: 'Faltan datos obligatorios.', missing: result.missing });
      }
      // Atomic: two parallel requests cannot both spend the last credit.
      const charge = db.prepare('UPDATE user_plans SET generation_used = generation_used + 1 WHERE user_id = ? AND purchase_id = ? AND generation_used < generation_credits').run(String(userId), body.purchaseId);
      if (charge.changes !== 1) {
        return res.status(400).json({ error: 'No tienes créditos de generación disponibles en este plan.' });
      }
      charged = true;

      // Step 5 — graphics: placeholders marked memory_source="generated" go to
      // Nano Banana; "library" ones use the event's image folder. Same pipeline
      // and admin settings as the existing generator.
      const config = db.prepare('SELECT * FROM admin_config WHERE id = 1').get() || {};
      const freeImages = config.free_image_provider && config.free_image_provider !== 'none';
      const provider = freeImages ? 'loremflickr' : (config.image_provider || 'gemini');
      const { resolvePlaceholders } = await import('./agentOrchestrator.js');
      const source = DECORATIVE_ONLY.has(result.pack)
        ? result.html.replace(/memory_source="library"/g, 'memory_source="generated"')
        : result.html;
      let html = await resolvePlaceholders(
        source,
        LEGACY_EVENT_NAMES[result.pack] || 'Otro',
        getDesign(result.design)?.label || '',
        config.image_api_key || '',
        config.image_model || 'gemini-3.1-flash-image-preview',
        provider
      );
      if (!/^<!DOCTYPE/i.test(html)) html = '<!DOCTYPE html>\n' + html;
      if (freeImages) {
        try {
          const { processHtmlWithFreeImages } = await import('./freeImageService.js');
          const free = await processHtmlWithFreeImages(html, {
            provider: config.free_image_provider,
            eventType: LEGACY_EVENT_NAMES[result.pack],
            theme: getDesign(result.design)?.label || '',
            geminiKey: config.html_google_api_key,
            geminiModel: config.html_google_model || 'gemini-3.1-pro-preview',
            pexelsKey: config.free_image_pexels_key || '',
            pollinationsToken: config.free_image_pollinations_token || '',
            agentic: config.free_image_agentic !== 0
          });
          html = free.html;
        } catch (e) {
          console.error('[COMPOSE] proveedor de imágenes gratuito falló:', e.message);
        }
      }
      const { compileAllImagesToBase64 } = await import('./imageToBase64.js');
      html = await compileAllImagesToBase64(html, config.image_api_key, config.image_model, provider);

      console.log(`[COMPOSE] ✅ ${result.pack} · ${result.design} · ${result.report.modules.length} módulos · avisos ${result.report.warnings.length}`);
      res.json({ html, report: result.report, design: result.design, eventType: result.pack, eventLabel: resolvePack(result.pack).label });
    } catch (e) {
      console.error('[COMPOSE] create:', e.message);
      if (charged && userId) {
        db.prepare('UPDATE user_plans SET generation_used = MAX(0, generation_used - 1) WHERE user_id = ? AND purchase_id = ?').run(String(userId), body.purchaseId);
      }
      res.status(500).json({ error: 'No se pudo crear la invitación. Tu crédito no se descontó.' });
    }
  });

  return router;
}
