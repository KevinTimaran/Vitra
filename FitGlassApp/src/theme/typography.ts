// src/theme/typography.ts
import type { TextStyle } from 'react-native';

export type TypographyToken = TextStyle;

export const Fonts = {
  bodoni: {
    regular: 'BodoniModa_400Regular',
    medium: 'BodoniModa_500Medium',
    semiBold: 'BodoniModa_600SemiBold',
    bold: 'BodoniModa_700Bold',
  },
  outfit: {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semiBold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
  },
  editorial: {
    regular: 'BodoniModa_400Regular',
    medium: 'BodoniModa_500Medium',
    semiBold: 'BodoniModa_600SemiBold',
    bold: 'BodoniModa_700Bold',
  },
  interface: {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semiBold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
  },
};

/**
 * Editorial Serif Tokens (Bodoni Moda)
 * Masthead, display, and high-fashion editorial headlines
 */
export const EditorialTypography = {
  displayLg: {
    fontFamily: Fonts.editorial.regular,
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '400' as const,
    letterSpacing: -1.0,
  },
  displayLgMobile: {
    fontFamily: Fonts.editorial.regular,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '400' as const,
    letterSpacing: -0.7,
  },
  displayMd: {
    fontFamily: Fonts.editorial.regular,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '400' as const,
    letterSpacing: -0.8,
  },
  displayMdMobile: {
    fontFamily: Fonts.editorial.regular,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
  },
  headlineLg: {
    fontFamily: Fonts.editorial.medium,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '500' as const,
    letterSpacing: -0.5,
  },
  headlineMd: {
    fontFamily: Fonts.editorial.medium,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '500' as const,
    letterSpacing: -0.3,
  },
  headlineSmSerif: {
    fontFamily: Fonts.editorial.medium,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500' as const,
    letterSpacing: -0.2,
  },
  quote: {
    fontFamily: Fonts.editorial.regular,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
};

/**
 * Interface Sans Tokens (Outfit)
 * Clean, geometric, legible sans-serif for functional controls and body copy
 */
export const InterfaceTypography = {
  headlineSm: {
    fontFamily: Fonts.interface.medium,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500' as const,
    letterSpacing: -0.2,
  },
  headlineXs: {
    fontFamily: Fonts.interface.semiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  bodyLg: {
    fontFamily: Fonts.interface.regular,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  bodyMd: {
    fontFamily: Fonts.interface.regular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: Fonts.interface.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  labelLg: {
    fontFamily: Fonts.interface.semiBold,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  labelMd: {
    fontFamily: Fonts.interface.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  labelSm: {
    fontFamily: Fonts.interface.semiBold,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  overline: {
    fontFamily: Fonts.interface.semiBold,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
};

/**
 * Unified Typography export containing canonical tokens + backwards-compatible aliases
 */
export const Typography = {
  // Convenient font accessors
  bodoni: Fonts.bodoni,
  outfit: Fonts.outfit,
  fonts: Fonts,

  // Canonical tokens
  ...EditorialTypography,
  ...InterfaceTypography,

  // Backwards-compatible aliases mapped to canonical hierarchy
  display: EditorialTypography.displayMdMobile,
  largeTitle: EditorialTypography.headlineLg,
  title1: EditorialTypography.headlineMd,
  title2: InterfaceTypography.headlineSm,
  title3: EditorialTypography.headlineSmSerif,
  headline: InterfaceTypography.headlineXs,
  body: InterfaceTypography.bodyMd,
  callout: {
    fontFamily: Fonts.interface.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  subhead: InterfaceTypography.bodySm,
  footnote: InterfaceTypography.bodySm,
  caption: InterfaceTypography.labelMd,
  micro: InterfaceTypography.labelSm,
  tag: InterfaceTypography.labelSm,
  button: InterfaceTypography.headlineXs,
  buttonSm: InterfaceTypography.labelLg,
  quote: EditorialTypography.quote,
  overline: InterfaceTypography.overline,
};
