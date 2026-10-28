/* Render de previews de modulos-1 a PNG (desktop + móvil) para revisión visual.
 * Hace auto-scroll ANTES de capturar para que los IntersectionObserver
 * disparen los reveals (igual que haría un usuario real). */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 600;
      const timer = setInterval(() => {
        window.scrollBy(0, 400);
        total += 400;
        if (total >= document.body.scrollHeight + 1200) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          setTimeout(resolve, 350);
        }
      }, 150);
    });
  });
  await new Promise((r) => setTimeout(r, 4600));
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const sets = process.argv[2]
    ? process.argv[2].split(',')
    : Array.from({ length: 12 }, (_, i) => 'set-' + (i + 1));

  for (const set of sets) {
    const url = 'file:///' + path.resolve(__dirname, '..', 'modulos-1', 'preview-' + set + '.html').split(path.sep).join('/');

    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await autoScroll(page);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'modulos-1', `shot-${set}.png`), fullPage: true });
    console.log('OK desktop', set);

    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await autoScroll(page);
    const alto = await page.evaluate(() => Math.min(document.body.scrollHeight, 12000));
    await page.screenshot({ path: path.resolve(__dirname, '..', 'modulos-1', `shot-mobile-${set}.png`), clip: { x: 0, y: 0, width: 390, height: alto }, captureBeyondViewport: true });
    console.log('OK mobile', set);
  }
  await browser.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
