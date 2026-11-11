// Mensajes de error de autenticación en el idioma del usuario. Lógica pura (sin React Native).
//
// El backend responde `{ "detail": "<texto en español>", "code": "wrong_password" }`. Se traduce por `code`
// (clave `auth.code.<code>`); si no hay código conocido se usa el `detail` del servidor y, por último, un texto genérico.

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface CodedError extends Error {
  code?: string;
  status?: number;
}

export const apiError = (message: string, code?: string, status?: number): CodedError =>
  Object.assign(new Error(message), { code, status });

export const authErrorMessage = (error: unknown, t: TFunction, fallbackKey: string): string => {
  const e = error as { code?: string; message?: string } | null | undefined;
  if (e?.code) {
    const key = `auth.code.${e.code}`;
    const text = t(key);
    if (text !== key) return text;
  }
  const message = typeof e?.message === 'string' ? e.message.trim() : '';
  return message || t(fallbackKey);
};
