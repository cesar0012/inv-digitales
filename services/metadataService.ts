import { InvitationMetadata } from '../types';

const METADATA_SCRIPT_ID = 'invitation-editor-metadata';

export const injectMetadata = (html: string, metadata: InvitationMetadata): string => {
  const jsonStr = JSON.stringify(metadata);
  const scriptTag = `<script type="application/json" id="${METADATA_SCRIPT_ID}">${jsonStr}</script>`;
  
  const regex = new RegExp(`<script type="application/json" id="${METADATA_SCRIPT_ID}">[\\s\\S]*?</script>`, 'g');
  const cleanHtml = html.replace(regex, '');
  
  if (cleanHtml.includes('</body>')) {
    return cleanHtml.replace('</body>', `${scriptTag}\n</body>`);
  }
  
  return cleanHtml + '\n' + scriptTag;
};

export const extractMetadata = (html: string): InvitationMetadata | null => {
  const regex = new RegExp(
    `<script type="application/json" id="${METADATA_SCRIPT_ID}">([\\s\\S]*?)</script>`
  );
  const match = html.match(regex);
  
  if (!match || !match[1]) return null;
  
  try {
    return JSON.parse(match[1]);
  } catch {
    console.error('Error al parsear metadatos');
    return null;
  }
};

export const createDefaultMetadata = (): InvitationMetadata => ({
  version: 1,
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  eventType: '',
  theme: '',
  primaryColor: '#f472b6',
  secondaryColor: '#fb7185',
  hiddenModules: [],
  elementStyles: {}
});

export const buildMetadataFromHTML = (
  html: string, 
  existingMetadata: InvitationMetadata | null,
  config: { eventType: string; theme: string; primaryColor: string; secondaryColor: string }
): InvitationMetadata => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const hiddenElements = doc.querySelectorAll('[data-gemini-hidden="true"]');
  const hiddenModules = new Set<string>();
  
  hiddenElements.forEach(el => {
    const geminiId = el.getAttribute('data-gemini-id');
    if (geminiId) {
      const parts = geminiId.split('-');
      if (parts.length > 0) {
        const moduleName = parts[0].replace(/\b\w/g, l => l.toUpperCase());
        hiddenModules.add(moduleName);
      }
    }
  });
  
  const allElements = doc.querySelectorAll('[data-gemini-id]');
  const elementStyles: Record<string, { styles: Record<string, string>; animationClass: string }> = {};
  
  const animClasses = ['animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce', 'animate-fade-in', 'animate-slide-up'];
  
  allElements.forEach(el => {
    const geminiId = el.getAttribute('data-gemini-id');
    if (!geminiId) return;
    
    const htmlEl = el as HTMLElement;
    const inlineStyles: Record<string, string> = {};
    
    if (htmlEl.style.cssText) {
      const styleParts = htmlEl.style.cssText.split(';').filter(s => s.trim());
      styleParts.forEach(part => {
        const [key, value] = part.split(':').map(s => s.trim());
        if (key && value) {
          inlineStyles[key] = value;
        }
      });
    }
    
    let animationClass = 'none';
    for (const cls of animClasses) {
      if (htmlEl.classList.contains(cls)) {
        animationClass = cls;
        break;
      }
    }
    
    if (Object.keys(inlineStyles).length > 0 || animationClass !== 'none') {
      elementStyles[geminiId] = {
        styles: inlineStyles,
        animationClass
      };
    }
  });
  
  return {
    version: 1,
    createdAt: existingMetadata?.createdAt || new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    eventType: config.eventType || existingMetadata?.eventType || '',
    theme: config.theme || existingMetadata?.theme || '',
    primaryColor: config.primaryColor || existingMetadata?.primaryColor || '#f472b6',
    secondaryColor: config.secondaryColor || existingMetadata?.secondaryColor || '#fb7185',
    hiddenModules: Array.from(hiddenModules),
    elementStyles
  };
};
