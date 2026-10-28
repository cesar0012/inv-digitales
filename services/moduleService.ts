const DATA_URI_REGEX = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;

export const replaceBase64WithPlaceholders = (
  html: string
): { html: string; imageMap: Record<string, string> } => {
  const imageMap: Record<string, string> = {};
  let counter = 0;
  const htmlWithPlaceholders = html.replace(DATA_URI_REGEX, (match) => {
    const placeholder = `IMG_PLACEHOLDER_${counter}`;
    imageMap[placeholder] = match;
    counter += 1;
    return placeholder;
  });
  return { html: htmlWithPlaceholders, imageMap };
};

export const restoreBase64FromPlaceholders = (
  html: string,
  imageMap: Record<string, string>
): string => {
  let restored = html;
  for (const [placeholder, base64] of Object.entries(imageMap)) {
    const placeholderRegex = new RegExp(placeholder, 'g');
    restored = restored.replace(placeholderRegex, base64);
  }
  return restored;
};

const getModuleNameFromGeminiId = (geminiId: string): string => {
  if (!geminiId || geminiId.startsWith('edit-')) return '';
  if (geminiId.includes('__')) {
    return geminiId.split('__')[0];
  }
  const parts = geminiId.split('-');
  return parts.length > 1 ? parts[0] : '';
};

const findModuleContainer = (
  doc: Document,
  moduleName: string
): HTMLElement | null => {
  const allElements = Array.from(
    doc.querySelectorAll(`[data-gemini-id^="${moduleName}"]`)
  ) as HTMLElement[];

  if (allElements.length === 0) return null;

  let commonAncestor: HTMLElement | null = allElements[0];
  for (let i = 1; i < allElements.length; i++) {
    const el = allElements[i];
    let ancestor: HTMLElement | null = commonAncestor;
    while (ancestor && !ancestor.contains(el)) {
      ancestor = ancestor.parentElement;
    }
    if (ancestor) {
      commonAncestor = ancestor;
    }
  }

  if (!commonAncestor) return null;

  let container = commonAncestor;
  let parent = container.parentElement;
  while (parent && parent.tagName !== 'BODY') {
    const siblingElements = Array.from(
      parent.querySelectorAll('[data-gemini-id]')
    ) as HTMLElement[];
    const hasOtherModule = siblingElements.some((el) => {
      const id = el.getAttribute('data-gemini-id') || '';
      return getModuleNameFromGeminiId(id) !== moduleName;
    });
    if (hasOtherModule) break;
    container = parent;
    parent = parent.parentElement;
  }

  return container;
};

export const extractModuleHtml = (
  fullHtml: string,
  moduleName: string
): string => {
  if (!fullHtml || !moduleName) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');
  const container = findModuleContainer(doc, moduleName);
  return container ? container.outerHTML : '';
};

export const reinsertModuleHtml = (
  fullHtml: string,
  moduleName: string,
  newModuleHtml: string
): string => {
  if (!fullHtml || !moduleName) return fullHtml;
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');
  const container = findModuleContainer(doc, moduleName);
  if (!container) return fullHtml;

  const tempDiv = doc.createElement('div');
  tempDiv.innerHTML = newModuleHtml;
  const newContainer = tempDiv.firstElementChild as HTMLElement;
  if (!newContainer) return fullHtml;

  container.parentElement?.replaceChild(newContainer, container);
  return doc.documentElement.outerHTML;
};

export const insertModuleAtPosition = (
  fullHtml: string,
  insertAfter: string,
  newModuleHtml: string
): string => {
  if (!fullHtml) return fullHtml;
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');

  const tempDiv = doc.createElement('div');
  tempDiv.innerHTML = newModuleHtml;
  const newContainer = tempDiv.firstElementChild as HTMLElement | null;
  if (!newContainer) return fullHtml;

  if (insertAfter === 'Al principio') {
    const mainContent =
      doc.querySelector('main') ||
      doc.querySelector('#main-content') ||
      doc.body;
    mainContent.insertBefore(newContainer, mainContent.firstChild);
  } else if (insertAfter === 'Al final') {
    const mainContent =
      doc.querySelector('main') ||
      doc.querySelector('#main-content') ||
      doc.body;
    mainContent.appendChild(newContainer);
  } else {
    const container = findModuleContainer(doc, insertAfter);
    if (container && container.parentElement) {
      container.parentElement.insertBefore(newContainer, container.nextSibling);
    } else {
      doc.body.appendChild(newContainer);
    }
  }

  return doc.documentElement.outerHTML;
};

export const getModuleNames = (fullHtml: string): string[] => {
  if (!fullHtml) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');
  const elements = Array.from(
    doc.querySelectorAll('[data-gemini-id]')
  ) as HTMLElement[];
  const names = new Set<string>();
  elements.forEach((el) => {
    const geminiId = el.getAttribute('data-gemini-id') || '';
    const moduleName = getModuleNameFromGeminiId(geminiId);
    if (moduleName) names.add(moduleName);
  });
  return Array.from(names);
};