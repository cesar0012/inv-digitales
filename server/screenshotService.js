/**
 * ============================================================================
 * SCREENSHOT SERVICE — og:image de las páginas de producto del catálogo
 * ============================================================================
 * Genera la imagen de vista previa social (og:image) de cada plantilla con un
 * screenshot real del HERO de la invitación (la parte superior: portada con
 * nombres, fecha y botón), capturado con un navegador headless (puppeteer).
 *
 * - Entrada: la invitación es autocontenida (imágenes base64 o URLs absolutas),
 *   así que se abre directamente con file:// sin necesidad de servidor.
 * - Salida: JPEG 1200×630 (formato og) en server/storage/og/<slug>.jpg,
 *   servido por /storage/og y usado por el SSR con prioridad:
 *     screenshot de la plantilla > og-default.jpg > omitir og:image.
 * - Degradación elegante: si puppeteer no está instalado o el navegador falla
 *   (entornos sin Chromium), se registra un warning con instrucciones y la
 *   generación SEO sigue sin screenshot.
 *
 * Instalación: puppeteer está en dependencies (descarga su propio Chromium).
 * En entornos con Chromium propio:
 *   PUPPETEER_SKIP_DOWNLOAD=1 npm i && PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
 */
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OG_DIR = join(__dirname, 'storage', 'og');
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Ruta del screenshot de una plantilla a partir de su slug ("boda/x" → "boda-x.jpg"). */
export const ogScreenshotFile = (slug) => `${String(slug || '').replace(/[^a-zA-Z0-9-]+/g, '-')}.jpg`;
export const ogScreenshotPath = (slug) => join(OG_DIR, ogScreenshotFile(slug));

/** ¿Ya existe screenshot para este slug? */
export const hasOgScreenshot = (slug) => existsSync(ogScreenshotPath(slug));

let _puppeteerPromise = null;
async function loadPuppeteer() {
  if (_puppeteerPromise === null) {
    _puppeteerPromise = import('puppeteer').catch((e) => {
      console.warn('[SCREENSHOT] puppeteer no disponible:', e.message,
        '| instala con: npm i puppeteer (o define PUPPETEER_EXECUTABLE_PATH)');
      return null;
    });
  }
  return _puppeteerPromise;
}

/**
 * Captura el hero (viewport superior) de una invitación HTML como og:image.
 * @param {string} invitationHtmlPath ruta absoluta al .html de la invitación
 * @param {string} slug slug del catálogo ("boda/mi-plantilla")
 * @returns {Promise<string|null>} ruta del JPEG generado, o null si falló
 */
export async function captureInvitationHeroOG(invitationHtmlPath, slug, { timeoutMs = 45000 } = {}) {
  if (!invitationHtmlPath || !existsSync(invitationHtmlPath)) {
    console.warn('[SCREENSHOT] invitación no encontrada en disco:', invitationHtmlPath);
    return null;
  }
  const puppeteer = await loadPuppeteer();
  if (!puppeteer) return null;

  const outPath = ogScreenshotPath(slug);
  let browser = null;
  try {
    await mkdir(OG_DIR, { recursive: true });
    browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: OG_WIDTH, height: OG_HEIGHT, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(invitationHtmlPath).href, { waitUntil: 'networkidle2', timeout: timeoutMs });
    // Margen para fuentes/animsaciones de entrada (máx 0.5s según contrato de módulos)
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT } });
    console.log(`[SCREENSHOT] ✅ og:image capturado: ${outPath}`);
    return outPath;
  } catch (error) {
    console.warn('[SCREENSHOT] fallo capturando', slug, '-', error.message);
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* noop */ }
    }
  }
}
