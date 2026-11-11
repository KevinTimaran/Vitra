// fetch hacia el backend con la cabecera Accept-Language del idioma elegido en la app:
// así la IA (colorimetría, análisis de prendas) y los mensajes de error responden en ese idioma.
import { getActiveLanguage } from '../../contexts/LanguageContext';

export const withLanguageHeader = (init: RequestInit = {}): RequestInit => {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has('Accept-Language')) headers.set('Accept-Language', getActiveLanguage());
  return { ...init, headers };
};

export const fetchWithLanguage = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
  fetch(input, withLanguageHeader(init));
