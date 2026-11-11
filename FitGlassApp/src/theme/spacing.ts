// src/theme/spacing.ts
/**
 * Canonical Luxury Fashion Editorial Spacing Hierarchy — FitGlass Atelier
 *
 * Designed with a harmonious rhythmic modular scale:
 * - 6px (xs): Micro-spacing, tag padding, icon gaps
 * - 12px (sm): Compact padding, card inline elements, containerGap
 * - 16px (gutterMobile / cardPadding): Standard mobile margin & tactile card padding
 * - 20px (md / screenPadding / sectionMarginMobile): Comfortable sectional flow
 * - 24px (xxl / gutterDesktop): Generous desktop gutter & card separation
 * - 32px (lg / xxxl / sectionGap): Generous editorial whitespace & section separation
 * - 48px (huge / sectionMarginDesktop): Hero section spacing & desktop breathing room
 * - 56px (xl): Dramatic editorial breaks
 */
export const SpacingTokens = {
  xs: 6,
  sm: 12,
  gutterMobile: 16,
  md: 20,
  xxl: 24,
  gutterDesktop: 24,
  lg: 32,
  xxxl: 32,
  huge: 48,
  sectionMarginMobile: 20,
  sectionMarginDesktop: 48,
  xl: 56,
} as const;

export const Spacing = {
  // Base scale tokens (backward-compatible)
  xs: SpacingTokens.xs,
  sm: SpacingTokens.sm,
  md: SpacingTokens.md,
  lg: SpacingTokens.lg,
  xl: SpacingTokens.xl,
  xxl: SpacingTokens.xxl,
  xxxl: SpacingTokens.xxxl,
  huge: SpacingTokens.huge,

  // Layout & Responsive tokens
  gutterMobile: SpacingTokens.gutterMobile,
  gutterDesktop: SpacingTokens.gutterDesktop,
  sectionMarginMobile: SpacingTokens.sectionMarginMobile,
  sectionMarginDesktop: SpacingTokens.sectionMarginDesktop,

  // Semantic layout aliases
  screenPadding: SpacingTokens.sectionMarginMobile,
  cardPadding: SpacingTokens.gutterMobile,
  containerGap: SpacingTokens.sm,
  sectionGap: SpacingTokens.lg,
};

export type SpacingType = typeof Spacing;
export type SpacingTokensType = typeof SpacingTokens;
