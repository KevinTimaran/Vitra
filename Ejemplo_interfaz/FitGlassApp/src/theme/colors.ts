// src/theme/colors.ts
/**
 * Vitra Atelier Design System — Ivoire & Pine / Nocturne Pine
 *
 * Core Editorial Palette:
 * The semantic mapping follows a 60/30/10 balance:
 * 60% ambient canvas, 30% structural surfaces, 10% actions and status.
 */

export const luxuryEditorialColors = {
  // Canonical Luxury Fashion Editorial Core Palette
  warmAlabaster: '#FAF9F7',
  fineSand: '#EFECE6',
  fineSandLight: '#F4F3F1',
  fineSandDark: '#E5E2DC',
  basaltCharcoal: '#1A221F',
  basaltMuted: '#707973',
  petrolTeal: '#1A221F',
  petrolTealLight: '#2D4238',
  petrolTealContainer: '#EFECE6',
  softSage: '#2D4238',
  softSageLight: '#4E7864',
  softSageContainer: '#E2E9E4',

  // Material & Surface Hierarchy (Light Mode)
  surface: '#FAF9F7',
  surfaceDim: '#EFECE6',
  surfaceBright: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F4F3F1',
  surfaceContainer: '#EFECE6',
  surfaceContainerHigh: '#EFECE6',
  surfaceContainerHighest: '#E5E2DC',

  onSurface: '#1A221F',
  onSurfaceVariant: '#707973',

  inverseSurface: '#1A221F',
  inverseOnSurface: '#FFFFFF',

  outline: '#707973',
  outlineVariant: '#E5E2DC',

  // Semantic Role Mappings
  surfaceTint: '#2D4238',
  primary: '#1A221F',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EFECE6',
  onPrimaryContainer: '#1A221F',
  inversePrimary: '#E8EBE7',

  secondary: '#2D4238',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E2E9E4',
  onSecondaryContainer: '#1A221F',

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

  background: '#FAF9F7',
  onBackground: '#1A221F',
  surfaceVariant: '#EFECE6',

  // Backward compatibility & decorative palette
  tiffany: '#4E7864',
  powderedMint: '#2D4238',
  taupe: '#B8A398',
  pastelTurquoise: '#7AA6AD',
  brightPlatinum: '#A9B2BA',

  deepSlateCharcoal: '#1A221F',
  slateGray: '#707973',
  mutedSlate: '#707973',

  // Dedicated neutral studio canvas: lighter than structural cards so the
  // garment/avatar silhouette remains the visual focus.
  viewer3DBackground: '#F7F6F3',
  viewer3DGround: '#EFECE6',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Canonical Dark Atelier Palette Tokens
 */
export const darkEditorialColors = {
  // Core Dark Atelier Palette
  warmAlabaster: '#F4F6F4',
  fineSand: '#1F2622',
  basaltCharcoal: '#0F1512',
  petrolTeal: '#E8EBE7',
  softSage: '#4E7864',

  // Surfaces & Canvas
  canvas: '#0F1512',
  surface: '#171D1A',
  surfaceSubtle: '#1F2622',
  surfaceElevated: '#1F2622',
  surfaceContainerLowest: '#0F1512',
  surfaceContainerLow: '#131916',
  surfaceContainer: '#171D1A',
  surfaceContainerHigh: '#1F2622',
  surfaceContainerHighest: '#28332D',

  // Typography
  onSurface: '#F4F6F4',
  onSurfaceVariant: '#9EABA3',
  mutedSlate: '#9EABA3',

  // Interactive CTAs
  cta: '#E8EBE7',
  ctaText: '#0F1512',
  ctaContainer: '#28332D',
  onCtaContainer: '#F4F6F4',

  // Borders & Dividers
  outline: '#4E5C54',
  outlineVariant: '#28332D',
  borderLight: 'rgba(40, 51, 45, 0.78)',

  // Glassmorphism overlays
  glass: 'rgba(15, 21, 18, 0.85)',
  glassDark: 'rgba(15, 21, 18, 0.72)',
  glassBorder: '#28332D',

  // Lifted nocturne studio: deliberately lighter than the app canvas while
  // remaining neutral enough to preserve material and texture perception.
  viewer3DBackground: '#202923',
  viewer3DGround: '#28332D',

  // Status
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
} as const;

/** Explicit role palettes for design handoff and future token maintenance. */
export const atelierIvoirePine = {
  canvas: luxuryEditorialColors.background,
  canvasTint: luxuryEditorialColors.surfaceContainerLow,
  surface: luxuryEditorialColors.surfaceContainerLowest,
  surfaceMuted: luxuryEditorialColors.surfaceContainer,
  border: luxuryEditorialColors.outlineVariant,
  text: luxuryEditorialColors.onSurface,
  textMuted: luxuryEditorialColors.onSurfaceVariant,
  action: luxuryEditorialColors.primary,
  accent: luxuryEditorialColors.secondary,
  viewer3D: luxuryEditorialColors.viewer3DBackground,
} as const;

export const nocturnePineAtelier = {
  canvas: darkEditorialColors.canvas,
  canvasTint: darkEditorialColors.surfaceContainerLow,
  surface: darkEditorialColors.surface,
  surfaceMuted: darkEditorialColors.surfaceElevated,
  border: darkEditorialColors.outlineVariant,
  text: darkEditorialColors.onSurface,
  textMuted: darkEditorialColors.onSurfaceVariant,
  action: darkEditorialColors.cta,
  accent: darkEditorialColors.softSage,
  viewer3D: darkEditorialColors.viewer3DBackground,
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
  shadow: string;
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
  /** Calm, slightly lifted canvas used behind 3D assets. */
  viewer3DBackground: string;
  /** Subtle ground/grid tone for 3D scenes and placeholders. */
  viewer3DGround: string;
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
  surfaceElevated: luxuryEditorialColors.surfaceContainer,

  // Borders & Dividers
  border: luxuryEditorialColors.outlineVariant,
  borderLight: 'rgba(229, 226, 220, 0.72)',

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
  primary: luxuryEditorialColors.softSage,
  tiffany: luxuryEditorialColors.softSage,
  powderedMint: luxuryEditorialColors.softSage,

  // Glassmorphism overlays
  glass: 'rgba(250, 249, 247, 0.85)',
  glassDark: 'rgba(26, 34, 31, 0.05)',
  glassBorder: '#E5E2DC',

  // Accents
  tintSoft: luxuryEditorialColors.surfaceContainer,
  accentSubtle: luxuryEditorialColors.softSage,
  badge: luxuryEditorialColors.surfaceContainerHigh,
  successSubtle: luxuryEditorialColors.secondaryContainer,
  viewer3DBackground: luxuryEditorialColors.viewer3DBackground,
  viewer3DGround: luxuryEditorialColors.viewer3DGround,

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
    neutralText: '#1A221F',
    neutralMutedText: '#707973',
    neutralBorder: '#E5E2DC',
    subtleBackground: '#F4F3F1',
    linkText: '#2D4238',
    dangerBackground: '#EF4444',
    dangerText: '#FFFFFF',
    dangerSoftBackground: 'rgba(239, 68, 68, 0.10)',
    dangerBorder: 'rgba(239, 68, 68, 0.40)',
    successBackground: '#2D4238',
    successText: '#FFFFFF',
    successStrongText: '#2D4238',
    warningBackground: '#F59E0B',
    warningText: '#FBBF24',
    favorite: '#EF4444',
    favoriteBackground: '#FEE2E2',
    accentBackground: '#2D4238',
    accentText: '#FFFFFF',
    accentDisabledBackground: 'rgba(45, 66, 56, 0.45)',
    overlayBackground: 'rgba(0, 0, 0, 0.65)',
    overlayText: '#FFFFFF',
    floatingBackground: 'rgba(250, 249, 247, 0.94)',
    floatingBorder: '#E5E2DC',
    cameraBackground: '#8EB6C7',
    cameraText: '#0F1512',
    cameraMutedText: '#B9D3DE',
    cameraBorder: '#8EB6C7',
    cameraSecondaryBackground: 'rgba(255, 255, 255, 0.06)',
    cameraSecondaryBorder: 'rgba(255, 255, 255, 0.12)',
    cameraOverlayBackground: 'rgba(0, 0, 0, 0.65)',
    cameraOverlayBorder: 'rgba(255, 255, 255, 0.30)',
    cameraActiveBackground: 'rgba(142, 182, 199, 0.22)',
    cameraCancelText: 'rgba(255, 255, 255, 0.50)',
    cameraShutterBackground: '#FFFFFF',
    cameraShutterCore: '#E8EBE7',
    authBackground: '#1A221F',
    authText: '#FFFFFF',
    authBorder: '#1A221F',
    authGradient: ['#1A221F', '#2D4238'],
    authSecondaryBackground: '#F4F3F1',
    authSecondaryText: '#1A221F',
    authSecondaryBorder: '#E5E2DC',
    google: '#EA4335',
    apple: '#000000',
    facebook: '#1877F2',
    disabledOpacity: 0.45,
    shadow: '#1A221F',
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
  disabled: '#3A463F',

  // CTAs & Interactive Controls (Luminous Petrol Teal + Deep Basalt text for 6.56:1 contrast)
  cta: darkEditorialColors.cta,
  ctaText: darkEditorialColors.ctaText,
  ctaContainer: darkEditorialColors.ctaContainer,
  onCtaContainer: darkEditorialColors.onCtaContainer,

  // Direct brand references
  primary: darkEditorialColors.softSage,
  tiffany: darkEditorialColors.softSage,
  powderedMint: darkEditorialColors.softSage,

  // Glassmorphism overlays
  glass: darkEditorialColors.glass,
  glassDark: darkEditorialColors.glassDark,
  glassBorder: darkEditorialColors.glassBorder,

  // Accents
  tintSoft: darkEditorialColors.surfaceContainerLow,
  accentSubtle: darkEditorialColors.softSage,
  badge: '#1F2622',
  successSubtle: '#1F3028',
  viewer3DBackground: darkEditorialColors.viewer3DBackground,
  viewer3DGround: darkEditorialColors.viewer3DGround,

  // Raw palette access (backward compatibility)
  palette: luxuryEditorialColors,

  // Canonical Luxury Editorial tokens
  warmAlabaster: darkEditorialColors.warmAlabaster,
  fineSand: darkEditorialColors.fineSand,
  basaltCharcoal: darkEditorialColors.basaltCharcoal,
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
    neutralBorder: darkEditorialColors.outlineVariant,
    subtleBackground: darkEditorialColors.surfaceSubtle,
    linkText: darkEditorialColors.onSurfaceVariant,
    dangerBackground: '#EF4444',
    dangerText: '#FFFFFF',
    dangerSoftBackground: 'rgba(239, 68, 68, 0.16)',
    dangerBorder: 'rgba(239, 68, 68, 0.50)',
    successBackground: '#4E7864',
    successText: '#F4F6F4',
    successStrongText: '#9EABA3',
    warningBackground: '#F59E0B',
    warningText: '#FBBF24',
    favorite: '#EF4444',
    favoriteBackground: 'rgba(239, 68, 68, 0.18)',
    accentBackground: '#4E7864',
    accentText: '#FFFFFF',
    accentDisabledBackground: 'rgba(78, 120, 100, 0.45)',
    overlayBackground: 'rgba(0, 0, 0, 0.65)',
    overlayText: '#FFFFFF',
    floatingBackground: 'rgba(15, 21, 18, 0.92)',
    floatingBorder: '#28332D',
    cameraBackground: '#8EB6C7',
    cameraText: '#0F1512',
    cameraMutedText: '#B9D3DE',
    cameraBorder: '#8EB6C7',
    cameraSecondaryBackground: 'rgba(255, 255, 255, 0.06)',
    cameraSecondaryBorder: 'rgba(255, 255, 255, 0.12)',
    cameraOverlayBackground: 'rgba(0, 0, 0, 0.65)',
    cameraOverlayBorder: 'rgba(255, 255, 255, 0.30)',
    cameraActiveBackground: 'rgba(142, 182, 199, 0.22)',
    cameraCancelText: 'rgba(255, 255, 255, 0.50)',
    cameraShutterBackground: '#FFFFFF',
    cameraShutterCore: '#E8EBE7',
    authBackground: '#E8EBE7',
    authText: '#0F1512',
    authBorder: '#E8EBE7',
    authGradient: ['#E8EBE7', '#D8DDD9'],
    authSecondaryBackground: '#1F2622',
    authSecondaryText: '#F4F6F4',
    authSecondaryBorder: '#28332D',
    google: '#EA4335',
    apple: '#000000',
    facebook: '#1877F2',
    disabledOpacity: 0.45,
    shadow: '#000000',
  },
};

export const darkColors: ThemeColors = darkThemeColors;
export const Colors = lightThemeColors;
export default lightThemeColors;
