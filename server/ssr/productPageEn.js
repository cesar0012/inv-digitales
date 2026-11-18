/**
 * ============================================================================
 * PÁGINA DE PRODUCTO EN INGLÉS (/en/catalogo/…)
 * ============================================================================
 * Regla del cliente: "Esta invitación fue generada en español pero te la
 * presentamos aquí". La página de producto existe en ES (base, canónica)
 * y EN (traducida), conectadas por hreflang.
 *
 * Flujo: se renderiza la página ES (fuente única de verdad) y se traduce
 * con invitationTranslator (Gemini + caché por hash). Post-proceso:
 *   - <html lang="es"> → "en"
 *   - canonical/og:url → /en/catalogo/…
 *   - hreflang es/en/x-default
 *   - og:locale → en_US
 *   - aviso sobre el idioma del demo (el demo sigue en español)
 * El resultado se guarda en catalogo.product_page_en (se sirve estático;
 * se regenera en cada build-profile).
 * ============================================================================
 */
import { traducirInvitacionAIngles } from '../invitationTranslator.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Genera la página EN a partir del HTML ES ya renderizado.
 * @param {string} htmlEs  página ES renderizada con el slug FINAL
 * @param {{publicUrl:string, slug:string, demoLanguage?:string}} ctx
 * @param {{geminiKey:string, geminiModel?:string}} creds
 */
export async function generarPaginaEn(htmlEs, ctx, creds) {
  if (!htmlEs) return { html: '', traducidos: 0 };
  const tr = await traducirInvitacionAIngles(htmlEs, creds);
  const enUrl = `${ctx.publicUrl}/en/catalogo/${ctx.slug}`;
  const esUrl = `${ctx.publicUrl}/catalogo/${ctx.slug}`;

  let html = tr.html;
  // idioma del documento
  html = html.replace(/<html lang="es">/, '<html lang="en">');
  // canonical y og:url hacia la versión EN
  html = html.replace(/(<link rel="canonical"[^>]*href=")[^"]*(")/, `$1${enUrl}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${enUrl}$2`);
  html = html.replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1en_US$2`);
  // hreflang (el bloque ES ya lo trae; se reemplaza completo por el EN)
  html = html.replace(/<link rel="alternate" hreflang="es"[\s\S]*?hreflang="x-default"[^>]*>/,
    `<link rel="alternate" hreflang="es" href="${esUrl}">\n  <link rel="alternate" hreflang="en" href="${enUrl}">\n  <link rel="alternate" hreflang="x-default" href="${esUrl}">`);

  // Aviso del idioma del demo — regla del cliente: "generada en español,
  // te la presentamos aquí". Se inyecta antes del panel del demo.
  const aviso = `
      <p style="margin:0 0 14px;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--bg-alt);color:var(--ink-soft);font-size:.92rem">
        <strong>This invitation was designed in Spanish</strong> — we're showing it to you in English here.
        When you create yours, you can write it in English or Spanish.
      </p>`;
  html = html.replace(/(<details class="demo">)/, `${aviso}\n        $1`);

  return { html, traducidos: tr.traducidos };
}
