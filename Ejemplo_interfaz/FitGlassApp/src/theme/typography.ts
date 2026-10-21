// src/theme/typography.ts
import { TextStyle, Platform } from 'react-native';

export const Fonts = {
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
};

/**
 * Interface Sans Tokens (Outfit)
 */
export const InterfaceTypography = {
  headlineSm: {
    fontFamily: Fonts.interface.medium,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500' as const,
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
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

/**
 * Unified Typography export containing canonical tokens + backwards-compatible aliases
 */
export const Typography = {
  // Canonical tokens
  ...EditorialTypography,
  ...InterfaceTypography,

  // Backwards-compatible aliases mapped to canonical hierarchy
  display: EditorialTypography.displayMdMobile,
  largeTitle: EditorialTypography.headlineLg,
  title1: EditorialTypography.headlineMd,
  title2: InterfaceTypography.headlineSm,
  headline: {
    fontFamily: Fonts.interface.semiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: InterfaceTypography.bodyMd,
  callout: {
    fontFamily: Fonts.interface.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  subhead: InterfaceTypography.bodySm,
  caption: InterfaceTypography.labelMd,
  micro: InterfaceTypography.labelSm,
};
