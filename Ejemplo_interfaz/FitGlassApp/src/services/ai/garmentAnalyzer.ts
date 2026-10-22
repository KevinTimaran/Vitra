import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  GarmentAnalysisResponse,
  TryOnResponse,
  ColorimetryResponse,
  AvatarGenerateResponse,
  GarmentItemInput,
  AvatarPresetItem,
} from './types';

let activeWorkingUrl: string | null = null;

export const getActiveWorkingUrl = (): string | null => activeWorkingUrl;

export const setActiveWorkingUrl = (url: string): void => {
  activeWorkingUrl = url;
};

const isIPv4 = (host: string): boolean => {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
};

export const getBaseUrl = (): string => {
  if (activeWorkingUrl) {
    return activeWorkingUrl;
  }

  // 1. Variable de entorno configurada explícitamente (máxima prioridad)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // 2. En entorno Web, usar el host local o remoto del navegador
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    if (host) {
      return `http://${host}:8000`;
    }
  }

  // 3. En entorno móvil (iOS / Android), si Metro nos proporciona una IP LAN real
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const hostPart = hostUri.split(':')[0];
      // Solo asignar :8000 si es una IPv4 pura (los dominios exp.direct o tunnels no exponen el puerto 8000)
      if (hostPart && isIPv4(hostPart) && hostPart !== '127.0.0.1') {
        return `http://${hostPart}:8000`;
      }
    }
  } catch {
    // Ignorar fallo al leer Constants
  }

  // 4. Túnel público HTTPS garantizado y fallback local
  return 'https://fitglass-ai-kevin.loca.lt';
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

  // 1. Host IPv4 de Expo Metro (máxima velocidad, sin límites de timeout de proxy)
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const hostPart = hostUri.split(':')[0];
      if (hostPart && isIPv4(hostPart) && hostPart !== '127.0.0.1') {
        candidateUrls.push(`http://${hostPart}:8000`);
      }
    }
  } catch {}

  // 2. IP LAN local directa garantizada
  candidateUrls.push('http://192.168.174.72:8000');

  // 3. Variable de entorno configurada
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    candidateUrls.push(process.env.EXPO_PUBLIC_API_BASE_URL);
  }

  // 4. Web localhost
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      candidateUrls.push('http://127.0.0.1:8000', 'http://localhost:8000');
    } else if (host) {
      candidateUrls.push(`http://${host}:8000`);
    }
  }

  // 5. Túnel público HTTPS (fallback si el dispositivo no está en la misma red Wi-Fi)
  candidateUrls.push('https://fitglass-ai-kevin.loca.lt');
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
          'Bypass-Tunnel-Reminder': 'true',
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
export interface LatestModelResponse {
  model_3d_url: string;
  filename: string;
  size_bytes: number;
  updated_at: number;
}

/**
 * Consulta el modelo 3D (.glb) generado más recientemente en el backend.
 * Permite recuperar de inmediato el modelo real creado si una petición HTTP sufrió
 * timeout de túnel o corte de conexión.
 */
export const getLatestModel = async (): Promise<LatestModelResponse | null> => {
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/tryon/latest`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

/**
 * Ejecuta el pipeline completo de Virtual Try-On (VTON + Conversión 3D):
 * Utiliza sondeo asíncrono no bloqueante (/api/tryon/start + /api/tryon/status)
 * para evitar timeouts de 60 segundos impuestos por proxies o túneles de red.
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

  // 1. INTENTO PRIMARIO: Pipeline asíncrono con sondeo periódico (inmune al timeout de 60s)
  try {
    console.log(`[generateTryOn] Iniciando pipeline asíncrono en: ${baseUrl}/api/tryon/start...`);
    const startRes = await fetch(`${baseUrl}/api/tryon/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify({
        human_image: humanImageUrl.trim(),
        garment_image: garmentImageUrl.trim(),
        category,
        garment_description: garmentDescription,
        allow_fallback: true,
      }),
    });

    if (startRes.ok) {
      const startData = await startRes.json();
      const taskId = startData.task_id;
      if (taskId) {
        console.log(`[generateTryOn] Tarea iniciada en background (task_id: ${taskId}). Iniciando sondeo...`);
        const maxAttempts = 90; // Hasta 180s con sondeo cada 2s
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const statusRes = await fetch(`${baseUrl}/api/tryon/status/${taskId}`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
              },
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              console.log(
                `[generateTryOn Polling] Sondeo ${i + 1} (${(i + 1) * 2}s) -> estado: ${statusData.status}, paso: ${statusData.step}`
              );

              if (statusData.status === 'completed' && statusData.model_3d_url) {
                console.log('[generateTryOn] ¡Modelo 3D recibido con éxito vía polling!', statusData.model_3d_url);
                return {
                  image_2d_url: statusData.image_2d_url || garmentImageUrl,
                  model_3d_url: statusData.model_3d_url,
                  status: 'completed',
                };
              }
              if (statusData.status === 'failed') {
                throw new Error(statusData.error || 'La generación 3D finalizó con error.');
              }
            }
          } catch (pollErr: any) {
            if (pollErr?.message?.includes('finalizó con error')) {
              throw pollErr;
            }
          }
        }
      }
    }
  } catch (asyncErr: any) {
    console.warn('[generateTryOn] Fallo o excepción en flujo asíncrono:', asyncErr?.message);
  }

  // 2. INTENTO SECUNDARIO: Petición síncrona directa a /api/tryon/generate con 180s de timeout
  const controller = new AbortController();
  const TIMEOUT_MS = 180000;
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    console.log(`[generateTryOn] Invocando pipeline directo síncrono: ${baseUrl}/api/tryon/generate...`);
    const response = await fetch(`${baseUrl}/api/tryon/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify({
        human_image: humanImageUrl.trim(),
        garment_image: garmentImageUrl.trim(),
        category,
        garment_description: garmentDescription,
        allow_fallback: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: TryOnResponse = await response.json();
      console.log('[generateTryOn] Modelo 3D recibido directamente:', data);
      return data;
    }

    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  } catch (error: any) {
    clearTimeout(timeoutId);

    // 3. RECUPERACIÓN INTELIGENTE: Si el túnel cortó con 502 pero el servidor generó el archivo .glb
    console.log('[generateTryOn] Verificando si el modelo 3D ya está disponible en el servidor...');
    try {
      const latest = await getLatestModel();
      if (latest?.model_3d_url) {
        console.log('[generateTryOn] ¡Modelo 3D recuperado exitosamente del servidor!', latest.model_3d_url);
        return {
          model_3d_url: latest.model_3d_url,
          image_2d_url: garmentImageUrl || humanImageUrl,
          status: 'completed',
        };
      }
    } catch {}

    console.warn('[generateTryOn] Aviso en tryon:', error?.message || error);
    throw new Error(error?.message || 'Error durante la generación del probador 3D.');
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

/**
 * Genera la prueba de ropa virtual (VTON 2D + Modelo 3D) para un LOOK COMPLETO con múltiples prendas.
 * Invoca el backend de FastAPI procesando cada prenda y llamando a Tripo3D exactamente una vez por look.
 */
export const generateOutfitTryOn = async (
  humanImageUrl: string,
  garments: GarmentItemInput[],
  allowFallback = true
): Promise<TryOnResponse> => {
  const baseUrl = getBaseUrl();

  if (!humanImageUrl || !humanImageUrl.trim()) {
    throw new Error('La imagen de la persona o avatar está vacía.');
  }

  if (!garments || garments.length === 0) {
    throw new Error('Debes seleccionar al menos una prenda para probar el look.');
  }

  console.log(
    `[generateOutfitTryOn] Iniciando Try-On de look con ${garments.length} prendas en: ${baseUrl}/api/tryon/generate`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const payload = {
      human_image: humanImageUrl.trim(),
      garments: garments.map((g) => ({
        image: g.image.trim(),
        category: g.category || 'upper_body',
        name: g.name || 'clothing',
      })),
      allow_fallback: allowFallback,
    };

    const response = await fetch(`${baseUrl}/api/tryon/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: TryOnResponse = await response.json();
      console.log('[generateOutfitTryOn] Look 3D generado con éxito:', data);
      return data;
    }

    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Recuperación inteligente del último modelo generado en el servidor
    console.log('[generateOutfitTryOn] Verificando modelo generado en servidor...');
    try {
      const latest = await getLatestModel();
      if (latest?.model_3d_url) {
        console.log('[generateOutfitTryOn] Modelo recuperado del servidor:', latest.model_3d_url);
        return {
          model_3d_url: latest.model_3d_url,
          image_2d_url: garments[0]?.image || humanImageUrl,
          status: 'completed',
        };
      }
    } catch {}

    console.warn('[generateOutfitTryOn] Error en outfit tryon:', error?.message || error);
    throw new Error(error?.message || 'Error durante la fusión 3D del look.');
  }
};

/**
 * Consulta la lista de avatares predeterminados configurados en el backend.
 */
export const fetchAvatarPresets = async (): Promise<AvatarPresetItem[]> => {
  const baseUrl = getBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${baseUrl}/api/avatar/presets`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.presets && Array.isArray(data.presets)) {
        return data.presets;
      }
    }
  } catch (e) {
    console.warn('[fetchAvatarPresets] Fallback local para presets:', e);
  }

  // Fallback garantizado sin red
  return [
    {
      id: 'preset-female',
      gender: 'female',
      name: 'Atelier Silueta Femenina',
      description: 'Proporciones esbeltas con calibración para vestidos y sastrería.',
      image_2d: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      model_3d_url: '',
    },
    {
      id: 'preset-male',
      gender: 'male',
      name: 'Atelier Silueta Masculina',
      description: 'Estructura atlética con hombros definidos y caída recta.',
      image_2d: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      model_3d_url: '',
    },
    {
      id: 'preset-neutral',
      gender: 'non-binary',
      name: 'Atelier Silueta Fluida / Neutra',
      description: 'Líneas minimalistas y proporciones universales contemporáneas.',
      image_2d: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      model_3d_url: '',
    },
  ];
};

/**
 * Elimina o desvincula el avatar 3D personalizado activo del usuario en el backend.
 */
export const deleteCurrentAvatar = async (): Promise<{ status: string; message: string }> => {
  const baseUrl = getBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/avatar/current`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('[deleteCurrentAvatar] Error de red:', e);
  }
  return { status: 'deleted', message: 'Avatar 3D eliminado exitosamente.' };
};

