// Núcleo de traducción (sin React Native): se prueba con node. Ver src/i18n/__tests__/translate.test.mjs.

export type Language = 'en' | 'es';
export type Dictionary = Record<string, string>;
export type Params = Record<string, string | number>;

export const SUPPORTED_LANGUAGES: Language[] = ['es', 'en'];
export const DEFAULT_LANGUAGE: Language = 'es';

/** Idioma de la app a partir de un locale del sistema ("es-CO", "en_US"…). Desconocido => español. */
export const languageFromLocale = (locale?: string | null): Language => {
  const code = (locale || '').toLowerCase().replace('_', '-').split('-')[0];
  return code === 'en' ? 'en' : code === 'es' ? 'es' : DEFAULT_LANGUAGE;
};

const interpolate = (template: string, params?: Params): string =>
  params
    ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
    : template;

/**
 * Traduce `key`:
 *  1. idioma actual, 2. inglés como respaldo, 3. la propia clave (y se avisa UNA vez con `onMissing`).
 * Plurales: si `params.count` existe se prueba `key_one` (count === 1) o `key_other` antes que `key`.
 * Interpolación: `{nombre}` se sustituye por `params.nombre`.
 */
export function translate(
  dictionaries: Record<Language, Dictionary>,
  language: Language,
  key: string,
  params?: Params,
  onMissing?: (key: string, language: Language) => void
): string {
  const candidates: string[] = [];
  if (params && typeof params.count === 'number') candidates.push(`${key}_${params.count === 1 ? 'one' : 'other'}`);
  candidates.push(key);

  for (const candidate of candidates) {
    const current = dictionaries[language]?.[candidate];
    if (typeof current === 'string') return interpolate(current, params);
  }
  for (const candidate of candidates) {
    const fallback = dictionaries.en?.[candidate];
    if (typeof fallback === 'string') {
      onMissing?.(key, language);
      return interpolate(fallback, params);
    }
  }
  onMissing?.(key, language);
  return key;
}

/** Marcadores {nombre} de un texto (para comprobar que ES y EN usan los mismos). */
export const placeholdersOf = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
