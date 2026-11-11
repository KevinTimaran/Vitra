// Traduce errores técnicos del pipeline (Replicate / Tripo3D / red) a CLAVES de traducción (jobs.err.*).
// La interfaz las traduce al idioma del usuario con errorText(); nunca se muestra JSON crudo.

export interface FriendlyError {
  titleKey: string;
  /** Clave del mensaje; si no hay, se muestra `rawMessage` (texto del servidor, p. ej. "sin persona"). */
  messageKey?: string;
  rawMessage?: string;
  /** Si tiene sentido ofrecer "Reintentar" de inmediato. */
  retryable: boolean;
  /** Foto rechazada (sin ropa/persona): las pantallas muestran una alerta y no reintentan. */
  invalidImage?: boolean;
}

type TFunction = (key: string, params?: Record<string, string | number>) => string;

const textOf = (error: unknown): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const e = error as { message?: unknown };
    if (typeof e.message === 'string') return e.message;
  }
  return String(error);
};

export function friendlyError(error: unknown): FriendlyError {
  const raw = textOf(error);
  const text = raw.toLowerCase();
  const info = typeof error === 'object' && error !== null ? (error as { kind?: string; code?: string }) : {};
  const kind = info.kind;

  if (kind === 'aborted' || text.includes('cancelad') || text.includes('cancelled')) {
    return { titleKey: 'jobs.err.cancelled.title', messageKey: 'jobs.err.cancelled.message', retryable: true };
  }
  if (text.includes('enough credit') || text.includes('"code":2010') || text.includes('purchase more credit')) {
    return { titleKey: 'jobs.err.credits.title', messageKey: 'jobs.err.credits.message', retryable: false };
  }
  if (text.includes('rate limit') || text.includes('429') || text.includes('too many')) {
    return { titleKey: 'jobs.err.busy.title', messageKey: 'jobs.err.busy.message', retryable: true };
  }
  if (kind === 'task_not_found' || text.includes('ya no existe') || text.includes('no encontrada')) {
    return { titleKey: 'jobs.err.lost.title', messageKey: 'jobs.err.lost.message', retryable: true };
  }
  if (kind === 'timeout' || text.includes('tardó demasiado') || text.includes('timeout')) {
    return { titleKey: 'jobs.err.timeout.title', messageKey: 'jobs.err.timeout.message', retryable: true };
  }
  if (kind === 'network' || text.includes('network request failed') || text.includes('conexión') || text.includes('conectar') || text.includes('connection')) {
    return { titleKey: 'jobs.err.network.title', messageKey: 'jobs.err.network.message', retryable: true };
  }
  if (info.code === 'image_no_person' || info.code === 'image_no_garment' || text.includes('persona') || text.includes('no detectamos ropa') ||
    text.includes("doesn't look like a person") || text.includes("couldn't detect clothing")) {
    // El mensaje (en el idioma del usuario) lo da la clave auth.code.* según el código; si no hay, el texto del servidor.
    return {
      titleKey: 'jobs.err.invalidImage.title',
      messageKey: info.code ? `auth.code.${info.code}` : undefined,
      rawMessage: raw,
      retryable: false,
      invalidImage: true,
    };
  }
  // Nunca mostrar JSON crudo al usuario.
  const looksLikeJson = raw.trim().startsWith('{') || raw.includes('{"');
  if (looksLikeJson || !raw) {
    return { titleKey: 'jobs.err.generic.title', messageKey: 'jobs.err.generic.message', retryable: true };
  }
  return { titleKey: 'jobs.err.generic.title', rawMessage: raw, retryable: true };
}

/** Título y mensaje traducidos de un error de generación. */
export function errorText(error: FriendlyError | undefined, t: TFunction): { title: string; message: string } {
  if (!error) return { title: t('jobs.err.generic.title'), message: t('jobs.err.generic.message') };
  const message = error.messageKey ? t(error.messageKey) : error.rawMessage || t('jobs.err.generic.message');
  return { title: t(error.titleKey), message };
}
