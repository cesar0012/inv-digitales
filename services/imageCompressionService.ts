import imageCompression from 'browser-image-compression';

const isHeicFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
};

export const convertHeicToJpeg = async (file: File): Promise<File> => {
  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  const convertedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
  return convertedFile;
};

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
};

export const compressImage = async (file: File): Promise<string> => {
  let processedFile = file;

  if (isHeicFile(file)) {
    processedFile = await withTimeout(convertHeicToJpeg(file), 30000);
  }

  const options = {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/jpeg' as const
  };
  
  try {
    const compressedFile = await withTimeout(imageCompression(processedFile, options), 30000);
    const dataUrl = await imageCompression.getDataUrlFromFile(compressedFile);
    return dataUrl;
  } catch (error) {
    console.error('Error comprimiendo imagen, usando original:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(processedFile);
    });
  }
};

export const SUPPORTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
export const SUPPORTED_FORMATS_LABEL = 'JPG, PNG, WebP, HEIC';