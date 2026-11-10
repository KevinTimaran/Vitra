// src/theme/colors.ts
/**
 * Luxury Fashion Editorial Design System Tokens — FitGlass Atelier
 *
 * Core Editorial Palette:
 * - Warm Alabaster: #FAF8F5 (Primary light canvas & pure off-white paper base)
 * - Fine Sand:      #EDE7DF (Tactile limestone, secondary containers & borders)
 * - Basalt Charcoal:#1A1C1D (Deep architectural contrast, high-fashion typography)
 * - Petrol Teal:    #2C4C59 (Distinguished atelier statement hue & primary CTA)
 * - Soft Sage:      #7D998F (Organic botanical accent & subtle status confirmation)
 */

export const luxuryEditorialColors = {
  // Canonical Luxury Fashion Editorial Core Palette
  warmAlabaster: '#FAF8F5',
  fineSand: '#EDE7DF',
  fineSandLight: '#F5F1EB',
  fineSandDark: '#DDD6CA',
  basaltCharcoal: '#1A1C1D',
  basaltMuted: '#44494D',
  petrolTeal: '#2C4C59',
  petrolTealLight: '#456E7F',
  petrolTealContainer: '#B8D3DE',
  softSage: '#7D998F',
  softSageLight: '#A3BBB3',
  softSageContainer: '#D4E3DE',

  // Material & Surface Hierarchy (Light Mode)
  surface: '#FAF8F5',
  surfaceDim: '#DDD6CA',
  surfaceBright: '#FAF8F5',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F5F1EB',
  surfaceContainer: '#EDE7DF',
  surfaceContainerHigh: '#E6DFD4',
  surfaceContainerHighest: '#DDD6CA',

  onSurface: '#1A1C1D',
  onSurfaceVariant: '#44494D',

  inverseSurface: '#2B2E30',
  inverseOnSurface: '#FAF8F5',

  outline: '#72797C',
  outlineVariant: '#C8C1B7',

  // Semantic Role Mappings
  surfaceTint: '#2C4C59',
  primary: '#2C4C59',
  onPrimary: '#FFFFFF',
  primaryContainer: '#B8D3DE',
  onPrimaryContainer: '#122730',
  inversePrimary: '#96BED0',

  secondary: '#7D998F',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D4E3DE',
  onSecondaryContainer: '#223831',

  tertiary: '#6C5B52',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#C1ACA1',
  onTertiaryContainer: '#4F4037',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  // Fixed Tones & Containers
  primaryFixed: '#B8D3DE',
  primaryFixedDim: '#96BED0',
  onPrimaryFixed: '#001F29',
  onPrimaryFixedVariant: '#1F4756',

  secondaryFixed: '#D4E3DE',
  secondaryFixedDim: '#A3BBB3',
  onSecondaryFixed: '#03201A',
  onSecondaryFixedVariant: '#2F4A42',

  tertiaryFixed: '#F6DED2',
  tertiaryFixedDim: '#D9C2B6',
  onTertiaryFixed: '#251912',
  onTertiaryFixedVariant: '#53443B',

  background: '#FAF8F5',
  onBackground: '#1A1C1D',
  surfaceVariant: '#EDE7DF',

  // Backward compatibility & decorative palette
  tiffany: '#8EB6C7',
  powderedMint: '#7D998F',
  taupe: '#B8A398',
  pastelTurquoise: '#7AA6AD',
  brightPlatinum: '#A9B2BA',

  deepSlateCharcoal: '#1A1C1D',
  slateGray: '#4A5157',
  mutedSlate: '#656C73', // Calibrated to 5.06:1 contrast against Warm Alabaster

  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Canonical Dark Atelier Palette Tokens
 */
export const darkEditorialColors = {
  // Core Dark Atelier Palette
  warmAlabaster: '#FAF8F5',
  fineSand: '#EDE7DF',
  basaltCharcoal: '#1A1C1D',
  petrolTeal: '#64A3B8', // Luminous Petrol Teal for accessible dark buttons
  softSage: '#9BB4AA',

  // Surfaces & Canvas
  canvas: '#121415',
  surface: '#1A1C1D',
  surfaceSubtle: '#242729',
  surfaceElevated: '#2A2E30',
  surfaceContainerLowest: '#101213',
  surfaceContainerLow: '#1A1C1D',
  surfaceContainer: '#242729',
  surfaceContainerHigh: '#2B2F31',
  surfaceContainerHighest: '#33373A',

  // Typography
  onSurface: '#FAF8F5',
  onSurfaceVariant: '#C8C1B7',
  mutedSlate: '#868D92',

  // Interactive CTAs
  cta: '#64A3B8',
  ctaText: '#0A1B22', // High-contrast deep basalt petrol (6.56:1 contrast)
  ctaContainer: '#1B313B',
  onCtaContainer: '#B8D3DE',

  // Borders & Dividers
  outline: '#72797C',
  outlineVariant: '#363B3E',
  borderLight: 'rgba(114, 121, 124, 0.25)',

  // Glassmorphism overlays
  glass: 'rgba(26, 28, 29, 0.88)',
  glassDark: 'rgba(18, 20, 21, 0.75)',
  glassBorder: 'rgba(114, 121, 124, 0.28)',

  // Status
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
} as const;

/**
 * Backward compatibility alias for legacy imports referencing pearlTiffanyColors
 */
export const pearlTiffanyColors = luxuryEditorialColors;
export const luxuryEditorialPalette = luxuryEditorialColors;

/**
 * Semantic colors for every non-glass interactive control.
 *
 * Keep button and control colors here instead of inside screens. Glass surfaces
 * deliberately remain owned by GlassCard/LiquidGlassView and their related
 * components because their translucent values are part of the visual effect.
 */
export interface ButtonColors {
  primaryBackground: string;
  primaryText: string;
  primaryBorder: string;
  secondaryBackground: string;
  secondaryText: string;
  secondaryBorder: string;
  neutralBackground: string;
  neutralText: string;
  neutralMutedText: string;
  neutralBorder: string;
  subtleBackground: string;
  linkText: string;
  dangerBackground: string;
  dangerText: string;
  dangerSoftBackground: string;
  dangerBorder: string;
  successBackground: string;
  successText: string;
  successStrongText: string;
  warningBackground: string;
  warningText: string;
  favorite: string;
  favoriteBackground: string;
  accentBackground: string;
  accentText: string;
  accentDisabledBackground: string;
  overlayBackground: string;
  overlayText: string;
  floatingBackground: string;
  floatingBorder: string;
  cameraBackground: string;
  cameraText: string;
  cameraMutedText: string;
  cameraBorder: string;
  cameraSecondaryBackground: string;
  cameraSecondaryBorder: string;
  cameraOverlayBackground: string;
  cameraOverlayBorder: string;
  cameraActiveBackground: string;
  cameraCancelText: string;
  cameraShutterBackground: string;
  cameraShutterCore: string;
  authBackground: string;
  authText: string;
  authBorder: string;
  authGradient: readonly [string, string];
  authSecondaryBackground: string;
  authSecondaryText: string;
  authSecondaryBorder: string;
  google: string;
  apple: string;
  facebook: string;
  disabledOpacity: number;
}

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  disabled: string;
  cta: string;
  ctaText: string;
  ctaContainer: string;
  onCtaContainer: string;
  primary: string;
  tiffany: string;
  powderedMint: string;
  glass: string;
  glassDark: string;
  glassBorder: string;
  tintSoft: string;
  accentSubtle: string;
  badge: string;
  successSubtle: string;
  palette: typeof luxuryEditorialColors;

  // Canonical Luxury Editorial tokens
  warmAlabaster: string;
  fineSand: string;
  basaltCharcoal: string;
  petrolTeal: string;
  softSage: string;

  // Semantic status tokens
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  success: string;
  onSuccess: string;
  buttons: ButtonColors;
}

/**
 * Light theme semantic tokens mapped directly to Luxury Fashion Editorial Atelier
 */
export const lightThemeColors: ThemeColors = {
  // Navigation & structural backgrounds
  bg: luxuryEditorialColors.warmAlabaster,
  surface: luxuryEditorialColors.surfaceContainerLowest,
  surfaceSubtle: luxuryEditorialColors.surfaceContainerLow,
  surfaceElevated: luxuryEditorialColors.surfaceContainerLowest,

  // Borders & Dividers
  border: luxuryEditorialColors.outlineVariant,
  borderLight: 'rgba(200, 193, 183, 0.45)',

  // Typography
  primaryText: luxuryEditorialColors.basaltCharcoal,
  secondaryText: luxuryEditorialColors.onSurfaceVariant,
  tertiaryText: luxuryEditorialColors.mutedSlate, // #656C73 (5.06:1 AA compliance)
  disabled: luxuryEditorialColors.surfaceDim,

  // CTAs & Interactive Controls
  cta: luxuryEditorialColors.petrolTeal,
  ctaText: luxuryEditorialColors.onPrimary,
  ctaContainer: luxuryEditorialColors.primaryContainer,
  onCtaContainer: luxuryEditorialColors.onPrimaryContainer,

  // Direct brand references
  primary: luxuryEditorialColors.petrolTeal,
  tiffany: luxuryEditorialColors.tiffany,
  powderedMint: luxuryEditorialColors.softSage,

  // Glassmorphism overlays
  glass: 'rgba(250, 248, 245, 0.92)',
  glassDark: 'rgba(26, 28, 29, 0.05)',
  glassBorder: 'rgba(221, 214, 202, 0.70)',

  // Accents
  tintSoft: luxuryEditorialColors.surfaceContainer,
  accentSubtle: luxuryEditorialColors.softSage,
  badge: luxuryEditorialColors.surfaceContainerHigh,
  successSubtle: luxuryEditorialColors.secondaryContainer,

  // Raw palette access
  palette: luxuryEditorialColors,

  // Canonical Luxury Editorial tokens
  warmAlabaster: luxuryEditorialColors.warmAlabaster,
  fineSand: luxuryEditorialColors.fineSand,
  basaltCharcoal: luxuryEditorialColors.basaltCharcoal,
  petrolTeal: luxuryEditorialColors.petrolTeal,
  softSage: luxuryEditorialColors.softSage,

  // Semantic status tokens
  error: luxuryEditorialColors.error,
  onError: luxuryEditorialColors.onError,
  errorContainer: luxuryEditorialColors.errorContainer,
  onErrorContainer: luxuryEditorialColors.onErrorContainer,
  success: luxuryEditorialColors.softSage,
  onSuccess: '#FFFFFF',

  buttons: {
    primaryBackground: luxuryEditorialColors.petrolTeal,
    primaryText: luxuryEditorialColors.onPrimary,
    primaryBorder: luxuryEditorialColors.petrolTeal,
    secondaryBackground: luxuryEditorialColors.surfaceContainerLow,
    secondaryText: luxuryEditorialColors.basaltCharcoal,
    secondaryBorder: luxuryEditorialColors.outlineVariant,
    neutralBackground: '#FFFFFF',
    neutralText: '#334155',
    neutralMutedText: '#64748B',
    neutralBorder: '#C1C7CB',
    subtleBackground: '#F1F5F9',
    linkText: '#3C6473',
    dangerBackground: '#EF4444',
    dangerText: '#FFFFFF',
    dangerSoftBackground: 'rgba(239, 68, 68, 0.10)',
    dangerBorder: 'rgba(239, 68, 68, 0.40)',
    successBackground: '#10B981',
    successText: '#FFFFFF',
    successStrongText: '#15803D',
    warningBackground: '#F59E0B',
    warningText: '#FBBF24',
    favorite: '#EF4444',
    favoriteBackground: '#FEE2E2',
    accentBackground: '#8B5CF6',
    accentText: '#FFFFFF',
    accentDisabledBackground: 'rgba(139, 92, 246, 0.45)',
    overlayBackground: 'rgba(0, 0, 0, 0.65)',
    overlayText: '#FFFFFF',
    floatingBackground: 'rgba(255, 255, 255, 0.95)',
    floatingBorder: 'rgba(0, 0, 0, 0.10)',
    cameraBackground: '#D4AF37',
    cameraText: '#0D0D0D',
    cameraMutedText: '#E5C778',
    cameraBorder: '#D4AF37',
    cameraSecondaryBackground: 'rgba(255, 255, 255, 0.06)',
    cameraSecondaryBorder: 'rgba(255, 255, 255, 0.12)',
    cameraOverlayBackground: 'rgba(0, 0, 0, 0.65)',
    cameraOverlayBorder: 'rgba(255, 255, 255, 0.30)',
    cameraActiveBackground: 'rgba(212, 175, 55, 0.20)',
    cameraCancelText: 'rgba(255, 255, 255, 0.50)',
    cameraShutterBackground: '#FFFFFF',
    cameraShutterCore: '#F0E6D2',
    authBackground: '#3C6473',
    authText: '#FFFFFF',
    authBorder: '#3C6473',
    authGradient: ['#3C6473', '#2E505E'],
    authSecondaryBackground: '#F9F9F7',
    authSecondaryText: '#41484B',
    authSecondaryBorder: '#C1C7CB',
    google: '#EA4335',
    apple: '#000000',
    facebook: '#1877F2',
    disabledOpacity: 0.45,
  },
};

/**
 * Coherent dark counterpart preserving Luxury Fashion Editorial Atelier identity
 */
export const darkThemeColors: ThemeColors = {
  // Navigation & structural backgrounds
  bg: darkEditorialColors.canvas,
  surface: darkEditorialColors.surface,
  surfaceSubtle: darkEditorialColors.surfaceSubtle,
  surfaceElevated: darkEditorialColors.surfaceElevated,

  // Borders & Dividers
  border: darkEditorialColors.outlineVariant,
  borderLight: darkEditorialColors.borderLight,

  // Typography
  primaryText: darkEditorialColors.onSurface,
  secondaryText: darkEditorialColors.onSurfaceVariant,
  tertiaryText: darkEditorialColors.mutedSlate,
  disabled: '#444A4D',

  // CTAs & Interactive Controls (Luminous Petrol Teal + Deep Basalt text for 6.56:1 contrast)
  cta: darkEditorialColors.cta,
  ctaText: darkEditorialColors.ctaText,
  ctaContainer: darkEditorialColors.ctaContainer,
  onCtaContainer: darkEditorialColors.onCtaContainer,

  // Direct brand references
  primary: darkEditorialColors.cta,
  tiffany: darkEditorialColors.cta,
  powderedMint: darkEditorialColors.softSage,

  // Glassmorphism overlays
  glass: darkEditorialColors.glass,
  glassDark: darkEditorialColors.glassDark,
  glassBorder: darkEditorialColors.glassBorder,

  // Accents
  tintSoft: darkEditorialColors.surfaceSubtle,
  accentSubtle: darkEditorialColors.softSage,
  badge: '#2B3033',
  successSubtle: '#1E342B',

  // Raw palette access (backward compatibility)
  palette: luxuryEditorialColors,

  // Canonical Luxury Editorial tokens
  warmAlabaster: luxuryEditorialColors.warmAlabaster,
  fineSand: luxuryEditorialColors.fineSand,
  basaltCharcoal: luxuryEditorialColors.basaltCharcoal,
  petrolTeal: darkEditorialColors.petrolTeal,
  softSage: darkEditorialColors.softSage,

  // Semantic status tokens
  error: darkEditorialColors.error,
  onError: darkEditorialColors.onError,
  errorContainer: darkEditorialColors.errorContainer,
  onErrorContainer: darkEditorialColors.onErrorContainer,
  success: darkEditorialColors.softSage,
  onSuccess: '#14382B',

  buttons: {
    primaryBackground: darkEditorialColors.cta,
    primaryText: darkEditorialColors.ctaText,
    primaryBorder: darkEditorialColors.cta,
    secondaryBackground: darkEditorialColors.surfaceSubtle,
    secondaryText: darkEditorialColors.onSurface,
    secondaryBorder: darkEditorialColors.outlineVariant,
    neutralBackground: darkEditorialColors.surfaceElevated,
    neutralText: darkEditorialColors.onSurface,
    neutralMutedText: darkEditorialColors.onSurfaceVariant,
    neutralBorder: darkEditorialColors.outline,
    subtleBackground: darkEditorialColors.surfaceSubtle,
    linkText: darkEditorialColors.cta,
    dangerBackground: '#EF4444',
    dangerText: '#FFFFFF',
    dangerSoftBackground: 'rgba(239, 68, 68, 0.16)',
    dangerBorder: 'rgba(239, 68, 68, 0.50)',
    successBackground: '#10B981',
    successText: '#FFFFFF',
    successStrongText: '#86EFAC',
    warningBackground: '#F59E0B',
    warningText: '#FBBF24',
    favorite: '#EF4444',
    favoriteBackground: 'rgba(239, 68, 68, 0.18)',
    accentBackground: '#8B5CF6',
    accentText: '#FFFFFF',
    accentDisabledBackground: 'rgba(139, 92, 246, 0.45)',
    overlayBackground: 'rgba(0, 0, 0, 0.65)',
    overlayText: '#FFFFFF',
    floatingBackground: 'rgba(26, 28, 35, 0.92)',
    floatingBorder: 'rgba(255, 255, 255, 0.18)',
    cameraBackground: '#D4AF37',
    cameraText: '#0D0D0D',
    cameraMutedText: '#E5C778',
    cameraBorder: '#D4AF37',
    cameraSecondaryBackground: 'rgba(255, 255, 255, 0.06)',
    cameraSecondaryBorder: 'rgba(255, 255, 255, 0.12)',
    cameraOverlayBackground: 'rgba(0, 0, 0, 0.65)',
    cameraOverlayBorder: 'rgba(255, 255, 255, 0.30)',
    cameraActiveBackground: 'rgba(212, 175, 55, 0.20)',
    cameraCancelText: 'rgba(255, 255, 255, 0.50)',
    cameraShutterBackground: '#FFFFFF',
    cameraShutterCore: '#F0E6D2',
    authBackground: '#3C6473',
    authText: '#FFFFFF',
    authBorder: '#3C6473',
    authGradient: ['#3C6473', '#2E505E'],
    authSecondaryBackground: '#F9F9F7',
    authSecondaryText: '#41484B',
    authSecondaryBorder: '#C1C7CB',
    google: '#EA4335',
    apple: '#000000',
    facebook: '#1877F2',
    disabledOpacity: 0.45,
  },
};

export const darkColors: ThemeColors = darkThemeColors;
export const Colors = lightThemeColors;
export default lightThemeColors;
