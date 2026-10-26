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
};

export const darkColors: ThemeColors = darkThemeColors;
export const Colors = lightThemeColors;
export default lightThemeColors;
