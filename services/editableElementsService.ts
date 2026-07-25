const EDITABLE_TAG_SELECTOR = 'img, iframe, a';
const TEXT_TAG_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, span, li, time, figcaption, blockquote, strong, em, label, td, th';
const BLOCK_TEXT_TAGS = 'h1, h2, h3, h4, h5, h6, p, li, blockquote';
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

    const assignIdToLeaf = (leaf: Element, prefix: string, overrideMemoryKey?: string): void => {
      const leafHtml = leaf as HTMLElement;
      if (leafHtml.getAttribute('data-gemini-id')) return;
      if (leafHtml.getAttribute('memory_usage') === 'protected') return;
      if (SKIP_TAGS.has(leafHtml.tagName)) return;
      const memoryKey = overrideMemoryKey || leafHtml.getAttribute('memory_key');
      if (memoryKey) {
        leafHtml.setAttribute('data-gemini-id', `edit-${sanitizeId(memoryKey)}`);
      } else {
        counter += 1;
        leafHtml.setAttribute('data-gemini-id', genId(prefix, counter));
      }
      injected += 1;
    };

    const assignId = (el: Element, prefix: string): void => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.getAttribute('data-gemini-id')) return;
      if (htmlEl.getAttribute('memory_usage') === 'protected') return;
      if (SKIP_TAGS.has(htmlEl.tagName)) return;

      if (htmlEl.matches(TEXT_TAG_SELECTOR)) {
        if (htmlEl.querySelector('[data-gemini-id]')) return;
        const editableAncestor = htmlEl.parentElement?.closest('[data-gemini-id]');
        if (editableAncestor) {
          const ancestorHtml = editableAncestor as HTMLElement;
          if (ancestorHtml.matches(TEXT_TAG_SELECTOR) || ancestorHtml.tagName === 'A') return;
        }
      }

      assignIdToLeaf(el, prefix);
    };

    doc.querySelectorAll('[memory_type="text"], [memory_type="image"]').forEach(el => {
      const mt = el.getAttribute('memory_type');
      const htmlEl = el as HTMLElement;
      if (htmlEl.getAttribute('data-gemini-id')) return;
      if (htmlEl.getAttribute('memory_usage') === 'protected') return;

      const memoryKey = htmlEl.getAttribute('memory_key');
      const isTextLeaf = mt === 'text' && (htmlEl.matches(TEXT_TAG_SELECTOR) || htmlEl.tagName === 'A');
      const isImageLeaf = mt === 'image' && htmlEl.tagName === 'IMG';

      if (isTextLeaf || isImageLeaf) {
        assignIdToLeaf(el, mt === 'image' ? 'edit-img' : 'edit-txt', memoryKey || undefined);
      } else {
        let leaf: Element | null = null;
        if (mt === 'text') {
          const candidates = htmlEl.querySelectorAll(TEXT_TAG_SELECTOR);
          for (const c of candidates) {
            if (!c.querySelector(BLOCK_TEXT_TAGS)) { leaf = c; break; }
          }
        } else if (mt === 'image') {
          leaf = htmlEl.querySelector('img');
        }
        if (leaf) {
          assignIdToLeaf(leaf, mt === 'image' ? 'edit-img' : 'edit-txt', memoryKey || undefined);
        }
      }
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

    doc.querySelectorAll(TEXT_TAG_SELECTOR).forEach(el => {
      assignId(el, 'edit-txt');
    });

    if (injected > 0) {
      return doc.documentElement.outerHTML;
    }
    return html;
  } catch (err) {
    console.error('[normalizeEditableIds] Error:', err);
    return html;
  }
};