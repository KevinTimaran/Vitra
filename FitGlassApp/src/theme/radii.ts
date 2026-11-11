// src/theme/radii.ts
/**
 * Canonical Luxury Fashion Editorial Border Radii Tokens — FitGlass Atelier
 *
 * Subtle, architectural rounding prioritizing craftsmanship over bubbly generic shapes:
 * - 6px (xs): Micro-elements, badges
 * - 8px (sm): Compact buttons, internal card chips
 * - 16px (default / md / card): Canonical tactile card radius
 * - 24px (lg / sheet): Floating surfaces, bottom sheets, prominent containers
 * - 32px (xl / modal): Hero modal containers
 * - 48px (xxl): Large sculptural preview panels
 * - 9999px (pill / full / tag): Pure circular icons, capsule filters, pill CTAs
 */
export const RadiusTokens = {
  xs: 6,
  sm: 8,
  default: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 48,
  pill: 9999,
} as const;

export const Radius = {
  // Canonical scale (backward-compatible)
  xs: RadiusTokens.xs,
  sm: RadiusTokens.sm,
  default: RadiusTokens.default,
  md: RadiusTokens.default, // 16px canonical tactile radius
  lg: RadiusTokens.md,      // 24px container radius
  xl: RadiusTokens.lg,      // 32px modal radius
  xxl: RadiusTokens.xl,     // 48px sculptural radius
  full: RadiusTokens.pill,
  pill: RadiusTokens.pill,

  // Semantic component aliases
  card: RadiusTokens.default,
  sheet: RadiusTokens.md,
  modal: RadiusTokens.lg,
  tag: RadiusTokens.pill,
};

export type RadiusType = typeof Radius;
export type RadiusTokensType = typeof RadiusTokens;
