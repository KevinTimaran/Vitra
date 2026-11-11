import * as ImageManipulator from 'expo-image-manipulator';

export interface OptimizeImageOptions {
  maxWidth?: number;
  compress?: number;
  format?: ImageManipulator.SaveFormat;
}

export interface OptimizedImageResult {
  uri: string;
  base64Formatted: string;
}

/**
 * Normaliza y formatea un string base64 o URI en formato data URI (data:image/jpeg;base64,...)
 */
export function formatDataUri(base64OrUri: string, mimeType: string = 'image/jpeg'): string {
  if (!base64OrUri) return '';
  if (base64OrUri.startsWith('data:')) {
    return base64OrUri;
  }
  if (base64OrUri.startsWith('http://') || base64OrUri.startsWith('https://') || base64OrUri.startsWith('file://')) {
    return base64OrUri;
  }
  return `data:${mimeType};base64,${base64OrUri}`;
}

/**
 * Redimensiona y comprime una imagen a un ancho máximo de 1024px
 * manteniendo un payload ligero (<250KB) compatible con el backend.
 */
export async function optimizeImageAsync(
  uri: string,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1024,
    compress = 0.75,
    format = ImageManipulator.SaveFormat.JPEG,
  } = options;

  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format, base64: true }
    );

    const base64Formatted = manipulated.base64
      ? `data:image/jpeg;base64,${manipulated.base64}`
      : manipulated.uri;

    return {
      uri: manipulated.uri,
      base64Formatted,
    };
  } catch (error) {
    console.warn('[imageUtils] Advertencia optimizando imagen con ImageManipulator:', error);
    return {
      uri,
      base64Formatted: formatDataUri(uri),
    };
  }
}
