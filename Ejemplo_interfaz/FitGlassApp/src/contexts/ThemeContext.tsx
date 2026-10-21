// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors as LightColors } from '../theme';

const THEME_PREF_KEY = 'vitra_theme_mode_pref';

// Refined dark theme palette designed for OLED screens and premium glassmorphism
export const darkColors: typeof LightColors = {
  bg: '#09090B',
  surface: '#18181B',
  surfaceSubtle: '#27272A',
  surfaceElevated: '#202024',
  border: '#3F3F46',
  borderLight: '#27272A',
  primaryText: '#F4F4F5',
  secondaryText: '#A1A1AA',
  tertiaryText: '#71717A',
  disabled: '#52525B',
  cta: '#FAFAFA',
  ctaText: '#09090B',
  glass: 'rgba(24, 24, 27, 0.85)',
  glassDark: 'rgba(0, 0, 0, 0.65)',
  tintSoft: '#27272A',
  accentSubtle: '#F4F4F5',
  badge: '#3F3F46',
  successSubtle: '#27272A',
};

export type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  colors: typeof LightColors;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  colors: LightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // El tema inicial predeterminado es 'light' (modo claro)
  const [theme, setThemeState] = useState<ThemeMode>('light');

  // Cargar preferencia persistida del usuario desde Ajustes
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          saved = localStorage.getItem(THEME_PREF_KEY);
        } else if (typeof SecureStore?.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
          saved = await SecureStore.getItemAsync(THEME_PREF_KEY);
        }

        if (saved === 'dark' || saved === 'light') {
          setThemeState(saved);
        }
      } catch (err) {
        console.warn('[ThemeContext] Error al cargar preferencia de tema:', err);
      }
    };

    loadSavedTheme();
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(THEME_PREF_KEY, mode);
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync(THEME_PREF_KEY, mode).catch(() => {});
      }
    } catch {
      // Ignorar fallo de almacenamiento
    }
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(nextMode);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
