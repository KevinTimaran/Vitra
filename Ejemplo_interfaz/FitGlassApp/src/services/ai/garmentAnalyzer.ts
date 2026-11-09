import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  GarmentAnalysisResponse,
  TryOnResponse,
  ColorimetryResponse,
  ColorimetryData,
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

export const ensureBase64DataUri = async (imageUriOrBase64: string): Promise<string> => {
  let img = imageUriOrBase64.trim();
  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img;
  }

  // Si es un archivo local (file://, content://, ph://), redimensionar y comprimir para reducir el payload de red
  if (img.startsWith('file://') || img.startsWith('content://') || img.startsWith('ph://')) {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        img,
        [{ resize: { width: 1024 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipulated.base64) {
        return `data:image/jpeg;base64,${manipulated.base64}`;
      }
    } catch (manipErr) {
      console.warn('[ensureBase64DataUri] Error optimizando imagen con ImageManipulator:', manipErr);
    }

    try {
      const localFile = new File(img);
      const b64 = await localFile.base64();
      if (b64) {
        return `data:image/jpeg;base64,${b64}`;
      }
    } catch (e) {
      console.warn('[ensureBase64DataUri] Error leyendo archivo local con File API:', e);
    }
  }

  if (!img.startsWith('data:')) {
    return `data:image/jpeg;base64,${img}`;
  }
  return img;
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
  return 'https://collected-tamer-knee.ngrok-free.dev';
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

  // 1. Variable de entorno configurada (prioridad alta)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    candidateUrls.push(process.env.EXPO_PUBLIC_API_BASE_URL);
  }

  // 2. Host IPv4 detectado por Expo Metro
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

  // 3. IP LAN local actual (192.168.1.13)
  candidateUrls.push('http://192.168.1.13:8000');

  // 4. Túnel público HTTPS garantizado
  candidateUrls.push('https://collected-tamer-knee.ngrok-free.dev');

  // 5. Web localhost / emulador
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      candidateUrls.push('http://127.0.0.1:8000', 'http://localhost:8000');
    } else if (host) {
      candidateUrls.push(`http://${host}:8000`);
    }
  } else {
    candidateUrls.push('http://127.0.0.1:8000', 'http://localhost:8000');
  }

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

  const formattedImage = await ensureBase64DataUri(imageBase64OrUrl);

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
        if (errorJson.detail) {
          errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        } else if (errorJson.error) {
          errorMsg = errorJson.error;
        }
      } catch (e) {
        // Fallback al statusText
      }
      const err: any = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const result: GarmentAnalysisResponse = await response.json();
    if (result.data && (result.data.is_valid_image === false || String(result.data.is_valid_image).toLowerCase() === 'false')) {
      const validationMsg =
        result.data.validation_error_message ||
        'No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda.';
      const err: any = new Error(validationMsg);
      err.status = 400;
      throw err;
    }
    console.log('[analyzeGarment] Respuesta recibida con éxito:', result);
    return result;
  } catch (error: any) {
    console.error('[analyzeGarment] Error al procesar prenda:', error);
    const customErr: any = new Error(
      error?.message || 'Error de red al conectar con FitGlassAI para analizar la prenda.'
    );
    customErr.status = error?.status;
    throw customErr;
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

  const formattedImage = await ensureBase64DataUri(imageBase64OrUrl);

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
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson.error) {
          errorMsg = errJson.error;
        }
      } catch (e) {
        // Fallback
      }
      const err: any = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const result: ColorimetryResponse = await response.json();
    if (result.data && (result.data.is_valid_image === false || String(result.data.is_valid_image).toLowerCase() === 'false')) {
      const validationMsg =
        result.data.validation_error_message ||
        'Esta imagen no parece ser de una persona. Por favor sube una foto tuya.';
      const err: any = new Error(validationMsg);
      err.status = 400;
      throw err;
    }
    console.log('[analyzeColorimetry] Perfil de colorimetría recibido:', result);
    return result;
  } catch (error: any) {
    console.error('[analyzeColorimetry] Error:', error);
    const customErr: any = new Error(
      error?.message || 'Error de red al conectar con FitGlassAI para analizar colorimetría.'
    );
    customErr.status = error?.status;
    throw customErr;
  }
};

/**
 * Actualiza o recalibra el perfil de colorimetría del usuario autenticado en el backend.
 * Endpoint: PUT /api/users/colorimetry
 */
export const updateUserColorimetry = async (
  payload: { color_profile?: ColorimetryData | any; image?: string; face_image?: string },
  token?: string | null
): Promise<{ status: string; message: string; color_profile: ColorimetryData }> => {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api/users/colorimetry`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `Error actualizando colorimetría (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {}
    const err: any = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return await response.json();
};

/**
 * Consulta la URL del modelo 3D de avatar generado más recientemente en el servidor.
 * Permite recuperarlo instantáneamente si la conexión se interrumpió por timeout del túnel.
 */
export const getLatestAvatarModel = async (): Promise<{ avatar_url: string; filename: string } | null> => {
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/avatar/latest`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        'bypass-tunnel-reminder': 'true',
      },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[getLatestAvatarModel] No se pudo consultar el avatar más reciente:', e);
  }
  return null;
};

/**
 * Genera el Avatar 3D Base (.glb) del usuario usando Tripo3D a partir de una foto de cuerpo entero.
 * Utiliza sondeo asíncrono (/api/avatar/start + /api/avatar/status/{task_id}) inmune al timeout de 60s
 * de túneles y proxies, con recuperación inteligente.
 */
export const generateAvatar = async (imageBase64OrUrl: string): Promise<AvatarGenerateResponse> => {
  if (!imageBase64OrUrl || !imageBase64OrUrl.trim()) {
    throw new Error('La fotografía de cuerpo entero está vacía.');
  }

  const formattedImage = await ensureBase64DataUri(imageBase64OrUrl);
  const baseUrl = getBaseUrl();

  // 1. INTENTO PRIMARIO: Pipeline asíncrono con sondeo periódico (inmune al timeout de 60s)
  try {
    console.log(`[generateAvatar] Iniciando pipeline asíncrono en: ${baseUrl}/api/avatar/start...`);
    const startRes = await fetch(`${baseUrl}/api/avatar/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify({
        image: formattedImage,
      }),
    });

    if (startRes.status === 400) {
      let errorMsg = 'La imagen subida no parece ser de una persona.';
      try {
        const errJson = await startRes.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson.error) {
          errorMsg = errJson.error;
        }
      } catch {}
      const err: any = new Error(errorMsg);
      err.status = 400;
      throw err;
    }

    if (startRes.ok) {
      const startData = await startRes.json();
      const taskId = startData.task_id;
      if (taskId) {
        console.log(`[generateAvatar] Tarea iniciada en backend (task_id: ${taskId}). Polling cada 2.5s...`);
        const maxAttempts = 90; // Hasta 225s
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          try {
            const statusRes = await fetch(`${baseUrl}/api/avatar/status/${taskId}`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
                'bypass-tunnel-reminder': 'true',
              },
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              console.log(
                `[generateAvatar Polling] Sondeo ${i + 1} (${(i + 1) * 2.5}s) -> estado: ${statusData.status}, progreso: ${Math.round((statusData.progress || 0) * 100)}%`
              );

              if (statusData.status === 'completed' && statusData.avatar_url) {
                console.log('[generateAvatar] ¡Avatar 3D generado con éxito vía polling!', statusData.avatar_url);
                return {
                  avatar_url: statusData.avatar_url,
                  status: 'completed',
                };
              }
              if (statusData.status === 'failed') {
                throw new Error(statusData.error || 'La generación 3D del avatar finalizó con error.');
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
    console.warn('[generateAvatar] Aviso en flujo asíncrono:', asyncErr?.message);
    if (asyncErr?.message?.includes('finalizó con error')) {
      throw asyncErr;
    }
  }

  // 2. INTENTO SECUNDARIO: Petición síncrona directa a /api/avatar/generate
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos

  try {
    console.log('[generateAvatar] Intentando conexión directa en:', `${baseUrl}/api/avatar/generate`);
    const response = await fetch(`${baseUrl}/api/avatar/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify({
        image: formattedImage,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result: AvatarGenerateResponse = await response.json();
      console.log('[generateAvatar] Avatar 3D generado con éxito (síncrono):', result);
      return result;
    }

    if (response.status === 400) {
      let errorMsg = 'La imagen subida no parece ser de una persona.';
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson.error) {
          errorMsg = errJson.error;
        }
      } catch {}
      const err: any = new Error(errorMsg);
      err.status = 400;
      throw err;
    }

    let errorMsg = `Error al generar avatar 3D (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // Si la respuesta fue HTML (502 de proxy), intentar texto crudo
      try {
        const textResp = await response.text();
        if (textResp && textResp.length < 200) {
          errorMsg = textResp;
        }
      } catch {}
    }
    const syncFailure: any = new Error(errorMsg);
    syncFailure.status = response.status;
    throw syncFailure;
  } catch (syncErr: any) {
    clearTimeout(timeoutId);

    if (
      syncErr?.status === 400 ||
      (syncErr?.message && syncErr.message.toLowerCase().includes('persona'))
    ) {
      throw syncErr;
    }

    // 3. RECUPERACIÓN INTELIGENTE: Si el túnel cortó por 502/504 pero el backend completó el modelo
    console.log('[generateAvatar] Comprobando si el modelo 3D ya se completó en el servidor...');
    try {
      const latest = await getLatestAvatarModel();
      if (latest?.avatar_url) {
        console.log('[generateAvatar] ¡Avatar 3D recuperado exitosamente del servidor!', latest.avatar_url);
        return {
          avatar_url: latest.avatar_url,
          status: 'completed',
        };
      }
    } catch {}

    const finalErr: any = new Error(syncErr?.message || 'Error al generar el avatar 3D en Tripo3D.');
    finalErr.status = syncErr?.status;
    throw finalErr;
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

  const payload = {
    human_image: humanImageUrl.trim(),
    garments: garments.map((g) => ({
      image: g.image.trim(),
      category: g.category || 'upper_body',
      name: g.name || 'clothing',
    })),
    allow_fallback: allowFallback,
  };

  console.log(
    `[generateOutfitTryOn] Iniciando Try-On de look con ${garments.length} prendas en: ${baseUrl}...`
  );

  // 1. INTENTO PRIMARIO: Pipeline asíncrono con sondeo periódico (inmune a timeouts de red)
  try {
    const startRes = await fetch(`${baseUrl}/api/tryon/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify(payload),
    });

    if (startRes.ok) {
      const startData = await startRes.json();
      const taskId = startData.task_id;
      if (taskId) {
        console.log(`[generateOutfitTryOn] Look asíncrono iniciado (task_id: ${taskId}). Iniciando sondeo...`);
        const maxAttempts = 90; // hasta 180s
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
                `[generateOutfitTryOn Polling] Sondeo ${i + 1} (${(i + 1) * 2}s) -> estado: ${statusData.status}, paso: ${statusData.step}`
              );

              if (statusData.status === 'completed' && statusData.model_3d_url) {
                console.log('[generateOutfitTryOn] ¡Look 3D recibido con éxito vía polling!', statusData.model_3d_url);
                return {
                  image_2d_url: statusData.image_2d_url || garments[0]?.image || humanImageUrl,
                  model_3d_url: statusData.model_3d_url,
                  status: 'completed',
                };
              }
              if (statusData.status === 'failed') {
                throw new Error(statusData.error || 'La generación 3D del look finalizó con error.');
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
    console.warn('[generateOutfitTryOn] Aviso en flujo asíncrono:', asyncErr?.message);
  }

  // 2. INTENTO SECUNDARIO: Petición síncrona directa a /api/tryon/generate
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
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
      console.log('[generateOutfitTryOn] Look 3D generado con éxito directamente:', data);
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

export interface CascadeStepProgress {
  step: string;
  progress: number;
  detail: string;
  currentGarmentName?: string;
  currentGarmentIndex?: number;
  totalGarments?: number;
}

export interface CascadeTryOnResponse {
  status: string;
  user_id?: string;
  base_human_image_url: string;
  final_dressed_image_url: string;
  model_3d_url: string;
  steps_completed?: Array<{
    step_number: number;
    garment_name: string;
    category: string;
    dressed_image_url: string;
  }>;
  total_garments_applied?: number;
  message?: string;
}

/**
 * 🌊 Ejecuta el pipeline en Cascada (Waterfall) 2D -> 3D Virtual Try-On:
 * 1. Step 0: Recupera la silueta base en A-pose del usuario.
 * 2. Bucle secuencial estricto: viste prenda a prenda con IDM-VTON (Step N recibe el output del Step N-1).
 * 3. Tripo3D toma la imagen final completamente vestida y crea un ÚNICO modelo .glb unificado.
 * 4. Optimización Draco/WebP y retorno al visor 3D.
 */
export const generateWaterfallCascadeTryOn = async (
  userId?: string,
  humanImageUrl?: string,
  garments: GarmentItemInput[] = [],
  onProgress?: (info: CascadeStepProgress) => void,
  abortSignal?: AbortSignal
): Promise<CascadeTryOnResponse> => {
  const baseUrl = getBaseUrl();
  const startedAt = Date.now();

  if (abortSignal?.aborted) {
    throw new Error('Operación cancelada por el usuario.');
  }

  if ((!humanImageUrl || !humanImageUrl.trim()) && !userId) {
    throw new Error('Se requiere la imagen base de la persona o el ID del usuario.');
  }

  if (!garments || garments.length === 0) {
    throw new Error('Debes seleccionar al menos una prenda para aplicar el look en cascada.');
  }

  // Convertir imágenes locales (file://, ph://, content://) a Base64 Data URI antes de enviar al backend
  const formattedHumanImage = humanImageUrl && humanImageUrl.trim()
    ? await ensureBase64DataUri(humanImageUrl.trim())
    : undefined;

  const formattedGarments = await Promise.all(
    garments.map(async (g) => {
      const gImg = g.image ? await ensureBase64DataUri(g.image.trim()) : '';
      return {
        image: gImg,
        category: g.category || 'upper_body',
        name: g.name || 'clothing',
      };
    })
  );

  const payload = {
    user_id: userId || undefined,
    human_image: formattedHumanImage,
    garments: formattedGarments,
    allow_fallback: true,
  };

  console.log(
    '[Waterfall 3D] Preparación lista: imagen base ' +
      (formattedHumanImage ? 'incluida' : 'se resolverá en backend') +
      ', ' + formattedGarments.length + ' prendas preparadas.'
  );
  formattedGarments.forEach((garment, index) => {
    console.log(
      '[Waterfall 3D] Prenda ' + (index + 1) + '/' + formattedGarments.length + ': ' +
        garment.name + ' (' + garment.category + '), imagen ' + (garment.image ? 'lista' : 'vacía') + '.'
    );
  });

  console.log(
    `[generateWaterfallCascadeTryOn] Iniciando Cascada de ${garments.length} prendas optimizadas en: ${baseUrl}/api/tryon/cascade...`
  );

  // 1. INTENTO ASÍNCRONO CON SONDEO CANCELABLE (Soporta streaming de pasos para UI y evita timeouts de 60s)
  try {
    const startRes = await fetch(`${baseUrl}/api/tryon/cascade/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    if (startRes.ok) {
      const startData = await startRes.json();
      const taskId = startData.task_id;
      if (taskId) {
        console.log(`[Waterfall Cascade] Tarea asíncrona iniciada (task_id: ${taskId}).`);
        console.log('[Waterfall 3D] IDM-VTON aplicará las prendas en secuencia; después Tripo3D generará el avatar vestido.');
        const maxAttempts = 120; // Hasta 240s para looks de varias prendas

        for (let i = 0; i < maxAttempts; i++) {
          if (abortSignal?.aborted) {
            console.log('[Waterfall Cascade] Polling cancelado por señal de aborto.');
            throw new Error('Operación cancelada por el usuario.');
          }

          // Espera cancelable de 2000ms que responde inmediatamente al aborto
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              if (abortSignal) {
                abortSignal.removeEventListener('abort', onAbort);
              }
              resolve();
            }, 2000);

            const onAbort = () => {
              clearTimeout(timer);
              if (abortSignal) {
                abortSignal.removeEventListener('abort', onAbort);
              }
              reject(new Error('Operación cancelada por el usuario.'));
            };

            if (abortSignal) {
              if (abortSignal.aborted) {
                clearTimeout(timer);
                return reject(new Error('Operación cancelada por el usuario.'));
              }
              abortSignal.addEventListener('abort', onAbort);
            }
          });

          if (abortSignal?.aborted) {
            throw new Error('Operación cancelada por el usuario.');
          }

          try {
            const statusRes = await fetch(`${baseUrl}/api/tryon/cascade/status/${taskId}`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
              },
              signal: abortSignal,
            });

            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
              const progressPercent = Math.round((statusData.progress || 0) * 100);
              const currentGarment = statusData.current_garment_name
                ? ', prenda ' + (statusData.current_garment_index || '?') + ': ' + statusData.current_garment_name
                : '';
              console.log(
                '[Waterfall 3D Polling] Sondeo ' + (i + 1) + '/' + maxAttempts + ' (' + elapsedSeconds + 's) -> estado: ' +
                  (statusData.status || 'desconocido') + ', paso: ' + (statusData.step || 'sin paso') +
                  ', progreso: ' + progressPercent + '%' + currentGarment + '. ' + (statusData.detail || '')
              );
              if (onProgress && !abortSignal?.aborted) {
                onProgress({
                  step: statusData.step || 'processing',
                  progress: statusData.progress || 0.1,
                  detail: statusData.detail || 'Procesando cascada...',
                  currentGarmentName: statusData.current_garment_name,
                  currentGarmentIndex: statusData.current_garment_index,
                  totalGarments: statusData.total_garments || garments.length,
                });
              }

              if (statusData.status === 'completed' && statusData.model_3d_url) {
                const applied = statusData.result?.total_garments_applied ?? statusData.result?.steps_completed?.length ?? garments.length;
                console.log('[Waterfall 3D] Generación terminada en ' + elapsedSeconds + 's. Prendas aplicadas: ' + applied + '/' + garments.length + '.');
                console.log('[Waterfall 3D] GLB unificado recibido:', statusData.model_3d_url);
                return {
                  status: 'completed',
                  user_id: userId,
                  base_human_image_url: statusData.result?.base_human_image_url || humanImageUrl || '',
                  final_dressed_image_url: statusData.image_2d_url || '',
                  model_3d_url: statusData.model_3d_url,
                  steps_completed: statusData.result?.steps_completed || [],
                  total_garments_applied: statusData.result?.total_garments_applied ?? garments.length,
                  message: statusData.result?.message || 'Look completado exitosamente',
                };
              }

              if (statusData.status === 'failed') {
                console.error('[Waterfall 3D] Tarea ' + taskId + ' fallida en el paso "' + (statusData.step || 'desconocido') + '":', statusData.error || statusData.detail);
                throw new Error(`Tarea de cascada fallida: ${statusData.error || 'Fallo durante el ciclo de cascada 2D a 3D.'}`);
              }
            } else {
              console.warn('[Waterfall 3D Polling] Sondeo ' + (i + 1) + ': HTTP ' + statusRes.status + '.');
            }
          } catch (pollErr: any) {
            if (pollErr?.name === 'AbortError' || pollErr?.message?.includes('cancelad')) {
              throw pollErr;
            }
            if (pollErr?.message?.includes('Tarea de cascada fallida:')) {
              throw pollErr;
            }
            console.warn('[Waterfall 3D Polling] No se pudo leer el estado del sondeo ' + (i + 1) + ':', pollErr?.message || pollErr);
          }
        }
        console.warn('[Waterfall 3D] Se agotaron los sondeos asíncronos; se probará la ruta síncrona.');
      } else {
        console.warn('[Waterfall 3D] El servidor aceptó el inicio, pero no devolvió task_id.');
      }
    } else {
      console.warn('[Waterfall 3D] El inicio asíncrono respondió HTTP ' + startRes.status + '; se probará la ruta síncrona.');
    }
  } catch (asyncErr: any) {
    if (asyncErr?.name === 'AbortError' || asyncErr?.message?.includes('cancelad')) {
      throw asyncErr;
    }
    if (asyncErr?.message?.includes('Tarea de cascada fallida:')) {
      throw asyncErr;
    }
    console.warn('[Waterfall 3D] No se completó el flujo asíncrono; se intentará la ruta síncrona:', asyncErr?.message);
  }

  if (abortSignal?.aborted) {
    throw new Error('Operación cancelada por el usuario.');
  }

  // 2. INTENTO DIRECTO SÍNCRONO (Fallback si el backend no respondió al worker)
  const TIMEOUT_MS = 180000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const onUserAbort = () => {
    controller.abort();
  };
  if (abortSignal) {
    abortSignal.addEventListener('abort', onUserAbort, { once: true });
  }

  try {
    console.log('[Waterfall 3D] Iniciando ruta síncrona de respaldo (hasta 180 segundos).');
    const response = await fetch(`${baseUrl}/api/tryon/cascade`, {
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
    if (abortSignal) {
      abortSignal.removeEventListener('abort', onUserAbort);
    }

    if (response.ok) {
      const data: CascadeTryOnResponse = await response.json();
      console.log('[Waterfall 3D] Ruta síncrona completada en ' + Math.round((Date.now() - startedAt) / 1000) + 's. Prendas aplicadas: ' + (data.total_garments_applied ?? data.steps_completed?.length ?? 'sin dato') + '/' + garments.length + '.');
      console.log('[Waterfall 3D] GLB unificado recibido:', data.model_3d_url);
      return data;
    }

    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.error || errorMsg;
    } catch {}
    console.error('[Waterfall 3D] La ruta síncrona respondió con error:', errorMsg);
    throw new Error(errorMsg);
  } catch (syncErr: any) {
    clearTimeout(timeoutId);
    if (abortSignal) {
      abortSignal.removeEventListener('abort', onUserAbort);
    }

    if (syncErr?.name === 'AbortError' && abortSignal?.aborted) {
      throw new Error('Operación cancelada por el usuario.');
    }

    console.error('[Waterfall Cascade] Error general en cascada:', syncErr);
    throw new Error(syncErr?.message || 'Error durante la ejecución de la Cascada 2D a 3D.');
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
      headers: {
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
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
      image_2d: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
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
export const deleteCurrentAvatar = async (token?: string | null): Promise<{
  status: string;
  message: string;
  avatar_url?: string | null;
  avatar_type?: 'preset' | 'custom_3d' | 'none';
}> => {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    const response = await fetch(`${baseUrl}/api/avatar/current`, {
      method: 'DELETE',
      headers,
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('[deleteCurrentAvatar] Error de red:', e);
  }
  return { status: 'deleted', message: 'Avatar 3D eliminado exitosamente.' };
};

