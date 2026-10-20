import { getBaseUrl } from '../ai/garmentAnalyzer';

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
 * Inicia sesión con email y contraseña en FitGlassAI
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/auth/login`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
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
}

/**
 * Registra una nueva cuenta en FitGlassAI
 */
export async function registerUser(email: string, password: string, name?: string): Promise<RegisterResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/auth/register`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
      name: name?.trim() || undefined,
    }),
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
}

/**
 * Valida el token JWT actual y recupera datos del usuario
 */
export async function fetchCurrentUser(token: string): Promise<UserMeResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/auth/me`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Token expirado o sesión inválida');
  }

  return await response.json();
}

export interface UserProfileSetupPayload {
  full_name: string;
  age: number;
  face_image?: string;
  body_image?: string;
}

export interface UserProfileSetupResponse {
  status: string;
  message: string;
  full_name?: string;
  age?: number;
}

/**
 * Envía la configuración biométrica inicial del usuario (nombre, edad, foto rostro y foto cuerpo)
 */
export async function setupUserProfile(
  payload: UserProfileSetupPayload,
  token?: string | null
): Promise<UserProfileSetupResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/users/profile/setup`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
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

  return await response.json();
}

