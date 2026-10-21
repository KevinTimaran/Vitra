import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'vitra_jwt_auth_token_v2';
const AUTH_USER_EMAIL_KEY = 'vitra_auth_user_email_v2';

// Limpieza automática de sesiones residuales de prueba anteriores para garantizar que aparezca el Login primero
if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('vitra_jwt_auth_token');
    localStorage.removeItem('vitra_auth_user_email');
    localStorage.removeItem('vitra_user_onboarding_done');
  } catch {
    // Ignorar en entornos sin acceso a storage
  }
}

// En Web, expo-secure-store utiliza localStorage automáticamente o fallback en memoria
const isSecureStoreAvailable = async (): Promise<boolean> => {
  try {
    return typeof SecureStore?.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync());
  } catch {
    return false;
  }
};

/**
 * Guarda el token JWT de autenticación de forma persistente y segura
 */
export async function saveAuthToken(token: string): Promise<void> {
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    } else if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch (err) {
    console.warn('[SecureStorage] Error guardando token:', err);
  }
}

/**
 * Obtiene el token JWT almacenado
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (await isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } else if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[SecureStorage] Error leyendo token:', err);
  }
  return null;
}

/**
 * Elimina el token JWT para cerrar sesión
 */
export async function removeAuthToken(): Promise<void> {
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[SecureStorage] Error eliminando token:', err);
  }
}

/**
 * Guarda el email del usuario
 */
export async function saveUserEmail(email: string): Promise<void> {
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(AUTH_USER_EMAIL_KEY, email);
    } else if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
    }
  } catch (err) {
    console.warn('[SecureStorage] Error guardando email:', err);
  }
}

/**
 * Obtiene el email del usuario guardado
 */
export async function getUserEmail(): Promise<string | null> {
  try {
    if (await isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(AUTH_USER_EMAIL_KEY);
    } else if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(AUTH_USER_EMAIL_KEY);
    }
  } catch (err) {
    console.warn('[SecureStorage] Error leyendo email:', err);
  }
  return null;
}
