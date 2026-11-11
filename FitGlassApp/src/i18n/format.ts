// Formato de fechas y números según el idioma de la app (sin dependencias).
import type { Language } from './translate.ts';

const LOCALE: Record<Language, string> = { es: 'es-ES', en: 'en-US' };

export const localeFor = (language: Language): string => LOCALE[language] ?? LOCALE.es;

export const formatDate = (
  date: Date | number,
  language: Language,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string => new Date(date).toLocaleDateString(localeFor(language), options);

export const formatNumber = (value: number, language: Language): string => value.toLocaleString(localeFor(language));
