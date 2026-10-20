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
