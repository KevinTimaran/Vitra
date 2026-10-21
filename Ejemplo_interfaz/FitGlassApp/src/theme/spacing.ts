// src/theme/spacing.ts
/**
 * Canonical Pearl & Tiffany Atelier Spacing Hierarchy
 */
export const SpacingTokens = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 56,
  gutterMobile: 16,
  gutterDesktop: 24,
  sectionMarginMobile: 20,
  sectionMarginDesktop: 48,
} as const;

export const Spacing = {
  xs: SpacingTokens.xs,
  sm: SpacingTokens.sm,
  md: SpacingTokens.md,
  lg: SpacingTokens.lg,
  xl: SpacingTokens.xl,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  gutterMobile: SpacingTokens.gutterMobile,
  gutterDesktop: SpacingTokens.gutterDesktop,
  sectionMarginMobile: SpacingTokens.sectionMarginMobile,
  sectionMarginDesktop: SpacingTokens.sectionMarginDesktop,
};
