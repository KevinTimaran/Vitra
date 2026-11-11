// src/theme/index.ts
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './radii';
export * from './shadows';

// Backwards-compatible named and default exports for Colors matching active light theme
import { lightThemeColors, darkThemeColors } from './colors';
import { Typography } from './typography';
import { Spacing } from './spacing';
import { Radius } from './radii';
import { Shadows, DarkShadows } from './shadows';

export const Colors = lightThemeColors;
export const darkColors = darkThemeColors;

export const DesignSystem = {
  Colors,
  darkColors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  DarkShadows,
} as const;

export default Colors;
