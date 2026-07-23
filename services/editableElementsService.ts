const EDITABLE_TAG_SELECTOR = 'img, iframe, a';
const TEXT_TAG_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, span, li, time, figcaption, blockquote, strong, em, label, td, th';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'TITLE', 'BASE', 'NOSCRIPT', 'TEMPLATE']);

const sanitizeId = (s: string): string => String(s).replace(/[\s"'<>=]/g, '-').toLowerCase();

const genId = (prefix: string, idx: number): string => `${prefix}-${idx}`;

export const normalizeEditableIds = (html: string): string => {
  if (!html || html.trim().length === 0) return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let injected = 0;
    let counter = 0;

    const hasMemoryType = doc.querySelector('[memory_type]') !== null;

    const assignId = (el: Element, prefix: string): void => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.getAttribute('data-gemini-id')) return;
      if (htmlEl.getAttribute('memory_usage') === 'protected') return;
      if (SKIP_TAGS.has(htmlEl.tagName)) return;

      const memoryKey = htmlEl.getAttribute('memory_key');
      if (memoryKey) {
        htmlEl.setAttribute('data-gemini-id', `edit-${sanitizeId(memoryKey)}`);
      } else {
        counter += 1;
        htmlEl.setAttribute('data-gemini-id', genId(prefix, counter));
      }
      injected += 1;
    };

    doc.querySelectorAll('[memory_type="text"], [memory_type="image"]').forEach(el => {
      const mt = el.getAttribute('memory_type');
      const prefix = mt === 'image' ? 'edit-img' : 'edit-txt';
      const htmlEl = el as HTMLElement;
      if (htmlEl.getAttribute('data-gemini-id')) return;
      if (htmlEl.getAttribute('memory_usage') === 'protected') return;
      const memoryKey = htmlEl.getAttribute('memory_key');
      if (memoryKey) {
        htmlEl.setAttribute('data-gemini-id', `edit-${sanitizeId(memoryKey)}`);
      } else {
        counter += 1;
        htmlEl.setAttribute('data-gemini-id', genId(prefix, counter));
      }
      injected += 1;
    });

    doc.querySelectorAll(EDITABLE_TAG_SELECTOR).forEach(el => {
      assignId(el, 'edit-el');
    });

    doc.querySelectorAll('[style]').forEach(el => {
      const htmlEl = el as HTMLElement;
      const bg = htmlEl.style.backgroundImage;
      if (bg && bg !== 'none' && bg.trim() !== '') {
        assignId(el, 'edit-bg');
      }
    });

    if (!hasMemoryType) {
      doc.querySelectorAll(TEXT_TAG_SELECTOR).forEach(el => {
        assignId(el, 'edit-txt');
      });
    }

    if (injected > 0) {
      return doc.documentElement.outerHTML;
    }
    return html;
  } catch (err) {
    console.error('[normalizeEditableIds] Error:', err);
    return html;
  }
};