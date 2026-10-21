import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  GarmentAnalysisResponse,
  TryOnResponse,
  ColorimetryResponse,
  AvatarGenerateResponse,
} from './types';

let activeWorkingUrl: string | null = null;

export const getBaseUrl = (): string => {
  if (activeWorkingUrl) {
    return activeWorkingUrl;
  }

  // 1. En entorno Web, priorizar el host actual del navegador
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    if (host) {
      return `http://${host}:8000`;
    }
  }

  // 2. En entorno móvil (iOS / Android), detectar la IP del host de desarrollo automáticamente
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:8000`;
      }
    }
  } catch {
    // Ignorar fallo al leer Constants
  }

  // 3. Variable de entorno configurada
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // 4. IP local en red Wi-Fi
  return 'http://192.168.1.13:8000';
};

export interface HealthStatusResponse {
  status: string;
  message?: string;
  detectedUrl?: string;
}

/**
 * Verifica la conectividad con el backend FitGlassAI con detección inteligente de URL.
 */
export const checkHealth = async (): Promise<HealthStatusResponse> => {
  const candidateUrls: string[] = [];

  // 1. En Web, siempre intentar localhost / 127.0.0.1 primero si se navega localmente
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      candidateUrls.push('http://127.0.0.1:8000', 'http://localhost:8000');
    } else if (host) {
      candidateUrls.push(`http://${host}:8000`);
    }
  }

  // 2. Host detectado automáticamente desde Metro/Expo
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        candidateUrls.push(`http://${ip}:8000`);
      }
    }
  } catch {}

  // 3. URL configurada por variable de entorno
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    candidateUrls.push(process.env.EXPO_PUBLIC_API_BASE_URL);
  }

  // 4. Fallbacks estándares e IP Wi-Fi
  candidateUrls.push('http://192.168.1.13:8000', 'http://127.0.0.1:8000', 'http://localhost:8000');

  // Eliminar duplicados
  const uniqueUrls = candidateUrls.filter((url, idx, self) => self.indexOf(url) === idx);

  let lastErrorMessage = '';

  for (const url of uniqueUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: HealthStatusResponse = await response.json();
        activeWorkingUrl = url;
        console.log(`[checkHealth] Conexión establecida con éxito en: ${url}`);
        return { ...data, detectedUrl: url };
      }
    } catch (error: any) {
      lastErrorMessage = error?.message || 'Fallo de conexión';
      // Continuar con el siguiente candidato
    }
  }

  console.warn('[checkHealth] No se pudo conectar con ningún endpoint:', uniqueUrls);
  throw new Error(
    `No se pudo conectar con FitGlassAI en ${uniqueUrls.join(', ')}. Verifica que el servidor FastAPI esté iniciado (.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000).`
  );
};

/**
 * Envía una imagen (Base64 o URL) a Gemini para análisis de metadatos.
 * Endpoint: POST /api/garments/analyze
 */
export const analyzeGarment = async (imageBase64OrUrl: string): Promise<GarmentAnalysisResponse> => {
  const baseUrl = getBaseUrl();

  if (!imageBase64OrUrl || !imageBase64OrUrl.trim()) {
    throw new Error('La imagen de la prenda está vacía.');
  }

  // Si es Base64 puro sin cabecera de datos, añadir esquema Data URI
  let formattedImage = imageBase64OrUrl.trim();
  if (!formattedImage.startsWith('http://') && !formattedImage.startsWith('https://') && !formattedImage.startsWith('data:')) {
    formattedImage = `data:image/jpeg;base64,${formattedImage}`;
  }

  try {
    console.log('[analyzeGarment] Enviando imagen a:', `${baseUrl}/api/garments/analyze`);

    const response = await fetch(`${baseUrl}/api/garments/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        image: formattedImage,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Error del servidor (HTTP ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMsg = errorJson.error;
        } else if (errorJson.detail) {
          errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch (e) {
        // Fallback al statusText
      }
      throw new Error(errorMsg);
    }

    const result: GarmentAnalysisResponse = await response.json();
    console.log('[analyzeGarment] Respuesta recibida con éxito:', result);
    return result;
  } catch (error: any) {
    console.error('[analyzeGarment] Error al procesar prenda:', error);
    throw new Error(
      error?.message || 'Error de red al conectar con FitGlassAI para analizar la prenda.'
    );
  }
};

/**
 * Ejecuta el pipeline completo de Virtual Try-On (VTON + Conversión 3D):
 * 1. Fusiona humanImage y garmentImage en 2D (Replicate / IDM-VTON).
 * 2. Extruye la imagen 2D resultante a un modelo 3D descargable .glb (Tripo3D).
 * Endpoint: POST /api/tryon/generate
 */
export const generateTryOn = async (
  humanImageUrl: string,
  garmentImageUrl: string,
  category: string = 'upper_body',
  garmentDescription: string = 'clothing'
): Promise<TryOnResponse> => {
  const baseUrl = getBaseUrl();

  if (!humanImageUrl || !humanImageUrl.trim()) {
    throw new Error('La imagen de la persona no puede estar vacía.');
  }
  if (!garmentImageUrl || !garmentImageUrl.trim()) {
    throw new Error('La imagen de la prenda no puede estar vacía.');
  }

  try {
    console.log('[generateTryOn] Iniciando pipeline generativo VTON + 3D...');

    const response = await fetch(`${baseUrl}/api/tryon/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        human_image: humanImageUrl.trim(),
        garment_image: garmentImageUrl.trim(),
        category,
        garment_description: garmentDescription,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Fallo en el pipeline generativo (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson.error) {
          errorMsg = errJson.error;
        }
      } catch (e) {
        // Mantener errorMsg
      }
      throw new Error(errorMsg);
    }

    const data: TryOnResponse = await response.json();
    console.log('[generateTryOn] Modelo 3D y vista 2D generados:', data);
    return data;
  } catch (error: any) {
    console.error('[generateTryOn] Error en tryon:', error);
    throw new Error(
      error?.message || 'Error de red durante la generación del probador 3D.'
    );
  }
};

/**
 * Analiza la fotografía facial o frontal del usuario con Gemini Vision
 * para obtener su perfil de colorimetría estacional y códigos HEX.
 * Endpoint: POST /api/colorimetry/analyze
 */
export const analyzeColorimetry = async (imageBase64OrUrl: string): Promise<ColorimetryResponse> => {
  const baseUrl = getBaseUrl();

  if (!imageBase64OrUrl || !imageBase64OrUrl.trim()) {
    throw new Error('La imagen para colorimetría está vacía.');
  }

  let formattedImage = imageBase64OrUrl.trim();
  if (
    !formattedImage.startsWith('http://') &&
    !formattedImage.startsWith('https://') &&
    !formattedImage.startsWith('data:')
  ) {
    formattedImage = `data:image/jpeg;base64,${formattedImage}`;
  }

  try {
    console.log('[analyzeColorimetry] Enviando imagen a:', `${baseUrl}/api/colorimetry/analyze`);

    const response = await fetch(`${baseUrl}/api/colorimetry/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        image: formattedImage,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Error del servidor de colorimetría (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.error) {
          errorMsg = errJson.error;
        } else if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch (e) {
        // Fallback
      }
      throw new Error(errorMsg);
    }

    const result: ColorimetryResponse = await response.json();
    console.log('[analyzeColorimetry] Perfil de colorimetría recibido:', result);
    return result;
  } catch (error: any) {
    console.error('[analyzeColorimetry] Error:', error);
    throw new Error(
      error?.message || 'Error de red al conectar con FitGlassAI para analizar colorimetría.'
    );
  }
};

/**
 * Genera el Avatar 3D Base (.glb) del usuario usando Tripo3D a partir de una foto de cuerpo entero.
 * Endpoint: POST /api/avatar/generate
 */
export const generateAvatar = async (imageBase64OrUrl: string): Promise<AvatarGenerateResponse> => {
  const baseUrl = getBaseUrl();

  if (!imageBase64OrUrl || !imageBase64OrUrl.trim()) {
    throw new Error('La fotografía de cuerpo entero está vacía.');
  }

  let formattedImage = imageBase64OrUrl.trim();
  if (
    !formattedImage.startsWith('http://') &&
    !formattedImage.startsWith('https://') &&
    !formattedImage.startsWith('data:')
  ) {
    formattedImage = `data:image/jpeg;base64,${formattedImage}`;
  }

  try {
    console.log('[generateAvatar] Solicitando generación 3D en:', `${baseUrl}/api/avatar/generate`);

    const response = await fetch(`${baseUrl}/api/avatar/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        image: formattedImage,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Error al generar avatar 3D (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson.error) {
          errorMsg = errJson.error;
        }
      } catch (e) {
        // Fallback
      }
      throw new Error(errorMsg);
    }

    const result: AvatarGenerateResponse = await response.json();
    console.log('[generateAvatar] Avatar 3D generado con éxito:', result);
    return result;
  } catch (error: any) {
    console.error('[generateAvatar] Error:', error);
    throw new Error(
      error?.message || 'Error de red al generar el modelo 3D del avatar.'
    );
  }
};

