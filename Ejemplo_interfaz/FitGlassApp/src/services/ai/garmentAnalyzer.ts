import { GarmentAnalysisResponse, TryOnResponse } from './types';

const getBaseUrl = (): string => {
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
};

export interface HealthStatusResponse {
  status: string;
  message?: string;
}

/**
 * Verifica la conectividad con el backend FitGlassAI.
 */
export const checkHealth = async (): Promise<HealthStatusResponse> => {
  const baseUrl = getBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`El servidor respondió con código HTTP ${response.status}`);
    }

    const data: HealthStatusResponse = await response.json();
    return data;
  } catch (error: any) {
    console.warn('[checkHealth] Fallo al consultar el backend:', error?.message);
    if (error.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado al conectar con ${baseUrl}`);
    }
    throw new Error(
      error?.message || `No se pudo conectar con el servidor en ${baseUrl}. Verifica tu red Wi-Fi y el servidor.`
    );
  }
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
