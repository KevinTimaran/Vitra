// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Appearance } from 'react-native';
import { Colors as LightColors } from '../theme';

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
  const initialTheme: ThemeMode = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
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
