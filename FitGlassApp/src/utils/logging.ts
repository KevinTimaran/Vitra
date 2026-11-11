/**
 * `console.error` abre el overlay ROJO de LogBox en desarrollo. Los errores que la app ya muestra al usuario con
 * una tarjeta/alerta propia (contraseña incorrecta, foto sin ropa/persona, créditos agotados, cancelaciones...)
 * son casos esperados: se registran de forma informativa. Solo lo realmente inesperado va a `console.error`.
 */
const EXPECTED_PATTERNS = [
  /contraseña/i,
  /credenciales/i,
  /usuario no registrado/i,
  /ya existe una cuenta|ya está creada|already (registered|exists)/i,
  /no detectamos ropa/i,
  /no parece ser de una persona/i,
  /imagen no válida|foto .* no válida/i,
  /enough credit|sin créditos|purchase more credit/i,
  /cancelad/i,
  /al menos \d+ caracteres/i,
  /correo electrónico/i,
];

export const isExpectedError = (error: unknown): boolean => {
  if (!error) return false;
  const e = error as { status?: number; kind?: string; name?: string; message?: unknown };
  if (e.status === 400 || e.status === 401 || e.status === 403 || e.status === 404 || e.status === 409 || e.status === 422) {
    return true;
  }
  if (e.kind === 'aborted' || e.kind === 'task_failed' || e.name === 'AbortError') return true;
  const message = typeof error === 'string' ? error : typeof e.message === 'string' ? e.message : '';
  return EXPECTED_PATTERNS.some((pattern) => pattern.test(message));
};

/** Registra un error que la UI ya gestiona: informativo si es esperado, `console.error` si no lo es. */
export const logHandledError = (tag: string, error: unknown): void => {
  if (isExpectedError(error)) {
    const message = error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : error;
    console.log(tag, '(gestionado en pantalla):', message);
  } else {
    console.error(tag, error);
  }
};
