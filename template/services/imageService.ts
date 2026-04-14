
const IMAGE_CACHE = new Map<string, string>();

/**
 * Fetches an image from a URL and converts it to a Base64 Data URI.
 * Includes a timeout and caching mechanism.
 */
export const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  // Return cached version if available to save bandwidth/time
  if (IMAGE_CACHE.has(url)) return IMAGE_CACHE.get(url)!;

  try {
    // 8 second timeout for image generation/download
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'image/*'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        IMAGE_CACHE.set(url, base64);
        resolve(base64);
      };
      reader.onerror = () => {
        console.warn('Failed to convert blob to base64');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Failed to download image from ${url}:`, error);
    return null; // Return null to keep the original URL as fallback
  }
};

/**
 * Scans HTML for Pollinations AI and Unsplash images, downloads them, and embeds them as Base64.
 * This solves the "slow loading" or "broken link" issues by freezing the asset state.
 */
export const stabilizeImages = async (html: string): Promise<string> => {
  // Regex to find image src attributes.
  // Supports:
  // 1. Pollinations: https://image.pollinations.ai/...
  // 2. Unsplash Source: https://source.unsplash.com/...
  // Captures the full URL inside quotes.
  // Note: [^"']* matches non-quote characters (handling query params like ?width=800)
  const regex = /src=["']((?:https:\/\/image\.pollinations\.ai\/|https:\/\/source\.unsplash\.com\/)[^"']+)["']/g;
  
  const matches = [...html.matchAll(regex)];
  if (matches.length === 0) return html;

  // Deduplicate URLs to fetch efficienty
  const urls = Array.from(new Set(matches.map(m => m[1])));
  
  console.log(`Stabilizing ${urls.length} external images...`);

  // Fetch all images in parallel
  const results = await Promise.all(urls.map(async url => {
    // Decode HTML entities in URL (e.g. &amp; -> &) before fetching
    const cleanUrl = url.replace(/&amp;/g, '&');
    const base64 = await fetchImageAsBase64(cleanUrl);
    return { url, base64 };
  }));

  let newHtml = html;
  
  // Replace URLs with Base64 data
  results.forEach(({ url, base64 }) => {
    if (base64) {
      // Use split/join for global replacement without regex special char issues
      newHtml = newHtml.split(url).join(base64);
    }
  });

  return newHtml;
};
