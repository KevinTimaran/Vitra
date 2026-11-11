import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { formatDate, formatNumber } from '../i18n/format.ts';
import { languageFromLocale, translate, type Language, type Params } from '../i18n/translate.ts';

export type { Language } from '../i18n/translate.ts';

const LANGUAGE_PREF_KEY = 'vitra_language_pref';

/** Diccionarios (fuente única en src/i18n/{es,en}.ts). */
export const translations: Record<Language, Record<string, string>> = { en, es };

/** Idioma del teléfono (sin dependencias nativas); la preferencia guardada, si existe, tiene prioridad. */
const detectDeviceLanguage = (): Language => {
  try {
    return languageFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'es';
  }
};

// Idioma activo para código fuera de React (servicios que lanzan errores visibles para el usuario).
let activeLanguage: Language = detectDeviceLanguage();

/** Traduce con el idioma activo de la app; para servicios y utilidades que no pueden usar hooks. */
export const translateNow = (key: string, params?: Params): string =>
  translate(translations, activeLanguage, key, params);

/** Idioma activo de la app (para cabeceras Accept-Language hacia el backend). */
export const getActiveLanguage = (): Language => activeLanguage;

const warnedKeys = new Set<string>();
const warnMissing = (key: string, language: Language) => {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  const id = `${language}:${key}`;
  if (warnedKeys.has(id)) return;
  warnedKeys.add(id);
  console.log(`[i18n] Texto sin traducir (${language}): "${key}"`);
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Params) => string;
  /** Fecha formateada según el idioma elegido. */
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, params?: Params) => translate(translations, 'es', key, params),
  formatDate: (date, options) => formatDate(date, 'es', options),
  formatNumber: (value) => formatNumber(value, 'es'),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectDeviceLanguage);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          saved = localStorage.getItem(LANGUAGE_PREF_KEY);
        } else if (typeof SecureStore?.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
          saved = await SecureStore.getItemAsync(LANGUAGE_PREF_KEY);
        }
        if (saved === 'en' || saved === 'es') {
          setLanguageState(saved);
        }
      } catch (err) {
        console.warn('[LanguageContext] Error cargando idioma guardado:', err);
      }
    };

    loadSavedLanguage();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(LANGUAGE_PREF_KEY, lang);
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync(LANGUAGE_PREF_KEY, lang).catch(() => {});
      }
    } catch {
      // Ignorar fallo de almacenamiento
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'es' : 'en');
  }, [language, setLanguage]);

  activeLanguage = language;

  // El valor cambia con el idioma: todo componente que use useTranslation se vuelve a pintar al cambiarlo.
  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: (key, params) => translate(translations, language, key, params, warnMissing),
      formatDate: (date, options) => formatDate(date, language, options),
      formatNumber: (n) => formatNumber(n, language),
    }),
    [language, setLanguage, toggleLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);

export const useTranslation = () => {
  const { language, setLanguage, toggleLanguage, t, formatDate: fmtDate, formatNumber: fmtNumber } = useLanguage();
  return {
    t,
    language,
    formatDate: fmtDate,
    formatNumber: fmtNumber,
    i18n: {
      language,
      changeLanguage: (lang: Language) => setLanguage(lang),
    },
    toggleLanguage,
  };
};
