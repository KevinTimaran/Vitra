import { getBaseUrl, getActiveWorkingUrl, checkHealth, ensureBase64DataUri } from '../ai/garmentAnalyzer';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  email?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface UserMeResponse {
  email: string;
  name?: string;
}

/**
 * Resuelve la URL activa del servidor backend, ejecutando una verificación si aún no se ha detectado.
 */
async function resolveServerUrl(): Promise<string> {
  const active = getActiveWorkingUrl();
  if (active) {
    return active;
  }
  try {
    const health = await checkHealth();
    if (health.detectedUrl) {
      return health.detectedUrl;
    }
  } catch {
    // Si la verificación rápida de health falla, usar fallback directo
  }
  return getBaseUrl();
}

/**
 * Inicia sesión con email y contraseña en FitGlassAI
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const baseUrl = await resolveServerUrl();
  const url = `${baseUrl}/api/auth/login`;

  console.log('[authClient] Iniciando sesión en:', url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorDetail = 'Credenciales inválidas o error de conexión.';
      try {
        const errorJson = await response.json();
        if (errorJson.detail) errorDetail = errorJson.detail;
      } catch {
        // Usar mensaje genérico
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`[authClient] Error al iniciar sesión en ${url}:`, err);
    if (err?.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado al conectar con ${url}. Verifica tu conexión a internet o el backend.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Registra una nueva cuenta en FitGlassAI
 */
export async function registerUser(email: string, password: string, name?: string): Promise<RegisterResponse> {
  const baseUrl = await resolveServerUrl();
  const url = `${baseUrl}/api/auth/register`;

  console.log('[authClient] Registrando usuario en:', url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        name: name?.trim() || undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorDetail = 'No fue posible registrar el usuario.';
      try {
        const errorJson = await response.json();
        if (errorJson.detail) errorDetail = errorJson.detail;
      } catch {
        // Usar mensaje genérico
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`[authClient] Error al registrar usuario en ${url}:`, err);
    if (err?.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado al conectar con ${url}. Verifica tu conexión a internet o el backend.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Valida el token JWT actual y recupera datos del usuario
 */
export async function fetchCurrentUser(token: string): Promise<UserMeResponse> {
  const baseUrl = await resolveServerUrl();
  const url = `${baseUrl}/api/auth/me`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Token expirado o sesión inválida');
    }

    return await response.json();
  } catch (err: any) {
    console.error(`[authClient] Error al validar sesión en ${url}:`, err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface UserProfileSetupPayload {
  full_name: string;
  age: number;
  gender?: string;
  face_image?: string;
  body_image?: string;
}

export interface UserProfileSetupResponse {
  status: string;
  message: string;
  full_name?: string;
  age?: number;
  gender?: string;
  avatar_url?: string;
  avatar_type?: string;
  base_garments?: any[];
}

/**
 * Envía la configuración biométrica inicial del usuario (nombre, edad, foto rostro y foto cuerpo)
 */
export async function setupUserProfile(
  payload: UserProfileSetupPayload,
  token?: string | null
): Promise<UserProfileSetupResponse> {
  const baseUrl = await resolveServerUrl();
  const url = `${baseUrl}/api/users/profile/setup`;

  console.log('[authClient] Enviando configuración de perfil a:', url, {
    full_name: payload.full_name,
    age: payload.age,
    gender: payload.gender,
    hasFace: Boolean(payload.face_image),
    hasBody: Boolean(payload.body_image),
  });

  const controller = new AbortController();
  // Mayor tiempo límite si se envía imagen de cuerpo para generación 3D (hasta 180s para evitar FetchRequestCanceledException en iOS)
  const timeoutMs = payload.body_image ? 180000 : 35000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const processedPayload: UserProfileSetupPayload = {
      ...payload,
      face_image: payload.face_image ? await ensureBase64DataUri(payload.face_image) : undefined,
      body_image: payload.body_image ? await ensureBase64DataUri(payload.body_image) : undefined,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(processedPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorDetail = 'Error al configurar el perfil de usuario.';
      try {
        const errJson = await response.json();
        if (errJson.detail) errorDetail = errJson.detail;
      } catch {
        // Ignorar
      }
      throw new Error(errorDetail);
    }

    const data: UserProfileSetupResponse = await response.json();
    console.log('[authClient] Respuesta de setup de perfil recibida exitosamente:', {
      status: data.status,
      avatar_url: data.avatar_url,
      avatar_type: data.avatar_type,
    });
    return data;
  } catch (err: any) {
    console.error(`[authClient] Error al configurar perfil en ${url}:`, err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Consulta la URL del modelo 3D por defecto optimizado según el género solicitado.
 */
export async function getDefaultAvatarModel(
  gender: string = 'female'
): Promise<{ avatar_url: string; gender: string; avatar_type: string }> {
  const baseUrl = await resolveServerUrl();
  const url = `${baseUrl}/api/avatar/default?gender=${encodeURIComponent(gender)}`;
  console.log('[authClient] Consultando avatar por defecto en:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    },
  });

  if (!res.ok) {
    throw new Error(`Error al obtener avatar por defecto (HTTP ${res.status})`);
  }

  const data = await res.json();
  console.log('[authClient] Avatar por defecto obtenido:', data);
  return data;
}

/**
 * FLOW 3: Actualiza el avatar 3D del usuario desde Ajustes / Perfil (Post-Registro)
 */
export async function updateUserAvatar(
  imagePayload: string,
  token?: string | null
): Promise<{ avatar_url: string; avatar_type: string }> {
  const baseUrl = await resolveServerUrl();
  const url = `${baseUrl}/api/users/avatar`;
  console.log('[authClient] Actualizando avatar 3D en:', url, 'Payload length:', imagePayload.length);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const processedImage = await ensureBase64DataUri(imagePayload);

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ body_image: processedImage }),
  });

  if (!res.ok) {
    let errorDetail = `Error actualizando avatar 3D (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  const data = await res.json();
  console.log('[authClient] Avatar 3D actualizado exitosamente:', data);
  return data;
}

