// src/theme/radii.ts
/**
 * Canonical Pearl & Tiffany Atelier Border Radii Tokens
 */
export const RadiusTokens = {
  sm: 8,
  default: 16,
  md: 24,
  lg: 32,
  xl: 48,
  pill: 9999,
} as const;

export const Radius = {
  xs: 6,
  sm: RadiusTokens.sm,
  default: RadiusTokens.default,
  md: RadiusTokens.default,
  lg: RadiusTokens.md,
  xl: RadiusTokens.lg,
  xxl: RadiusTokens.xl,
  full: RadiusTokens.pill,
  pill: RadiusTokens.pill,
};
