import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const IMAGES_DIR = 'vitra_images';

/**
 * Las fotos que entrega ImagePicker/ImageManipulator viven en la caché del sistema, que el SO puede vaciar:
 * una prenda guardada con ese URI perdía su imagen. Esta función copia la imagen al directorio de documentos
 * (persistente) y devuelve el nuevo URI. Si algo falla devuelve el original (no se pierde nada).
 */
export async function persistLocalImage(uri?: string | null): Promise<string | undefined> {
  if (!uri) return undefined;
  if (Platform.OS === 'web') return uri;
  if (!(uri.startsWith('file://') || uri.startsWith('content://'))) return uri; // http(s), data:, ph://...

  try {
    const documentDir = Paths.document;
    if (documentDir?.uri && uri.startsWith(documentDir.uri)) return uri; // ya es persistente

    const dir = new Directory(documentDir, IMAGES_DIR);
    if (!dir.exists) dir.create();

    const match = uri.split('?')[0].match(/\.(jpe?g|png|webp)$/i);
    const extension = match ? match[1].toLowerCase() : 'jpg';
    const target = new File(dir, `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`);
    new File(uri).copy(target);
    return target.uri;
  } catch (error) {
    console.warn('[LocalImages] No se pudo copiar la imagen a almacenamiento persistente:', error);
    return uri;
  }
}
