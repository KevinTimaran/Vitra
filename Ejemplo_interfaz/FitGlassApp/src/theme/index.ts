// src/theme/index.ts
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './radii';
export * from './shadows';

// Backwards-compatible default export for Colors matching light theme
import { lightThemeColors } from './colors';
export const Colors = lightThemeColors;
