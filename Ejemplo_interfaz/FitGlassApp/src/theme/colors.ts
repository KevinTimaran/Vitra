// src/theme/colors.ts
/**
 * Canonical Pearl & Tiffany Atelier Design System Tokens
 */
export const pearlTiffanyColors = {
  surface: '#F9F9F7',
  surfaceDim: '#DADAD8',
  surfaceBright: '#F9F9F7',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F4F4F2',
  surfaceContainer: '#EEEEEC',
  surfaceContainerHigh: '#E8E8E6',
  surfaceContainerHighest: '#E2E3E1',

  onSurface: '#1A1C1B',
  onSurfaceVariant: '#41484B',

  inverseSurface: '#2F3130',
  inverseOnSurface: '#F1F1EF',

  outline: '#71787C',
  outlineVariant: '#C1C7CB',

  surfaceTint: '#3C6473',
  primary: '#3C6473',
  onPrimary: '#FFFFFF',
  primaryContainer: '#8EB6C7',
  onPrimaryContainer: '#1F4856',
  inversePrimary: '#A4CDDE',

  secondary: '#48645C',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#CAE9DF',
  onSecondaryContainer: '#4E6A62',

  tertiary: '#6C5B52',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#C1ACA1',
  onTertiaryContainer: '#4F4037',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  primaryFixed: '#C0E9FB',
  primaryFixedDim: '#A4CDDE',
  onPrimaryFixed: '#001F29',
  onPrimaryFixedVariant: '#234C5A',

  secondaryFixed: '#CAE9DF',
  secondaryFixedDim: '#AFCFC4',
  onSecondaryFixed: '#03201A',
  onSecondaryFixedVariant: '#314C45',

  tertiaryFixed: '#F6DED2',
  tertiaryFixedDim: '#D9C2B6',
  onTertiaryFixed: '#251912',
  onTertiaryFixedVariant: '#53443B',

  background: '#F9F9F7',
  onBackground: '#1A1C1B',
  surfaceVariant: '#E2E3E1',

  // Additional brand colors for decorative and garment-related accents.
  tiffany: '#8EB6C7',
  powderedMint: '#9EBCB3',
  taupe: '#B8A398',
  fineSand: '#C4B9A9',
  pastelTurquoise: '#86BABD',
  brightPlatinum: '#A9B2BA',

  deepSlateCharcoal: '#2E3238',
  slateGray: '#4A5157',
  mutedSlate: '#8B949E',

  white: '#FFFFFF',
  black: '#000000',
} as const;

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
  glass: string;
  glassDark: string;
  glassBorder: string;
  tintSoft: string;
  accentSubtle: string;
  badge: string;
  successSubtle: string;
  palette: typeof pearlTiffanyColors;
}

/**
 * Light theme semantic tokens mapped directly to Pearl & Tiffany Atelier
 */
export const lightThemeColors: ThemeColors = {
  // Navigation & structural backgrounds
  bg: pearlTiffanyColors.background,
  surface: pearlTiffanyColors.surfaceContainerLowest,
  surfaceSubtle: pearlTiffanyColors.surfaceContainerLow,
  surfaceElevated: pearlTiffanyColors.surfaceContainerLowest,

  // Borders & Dividers
  border: pearlTiffanyColors.outlineVariant,
  borderLight: 'rgba(193, 199, 203, 0.45)',

  // Typography
  primaryText: pearlTiffanyColors.onSurface,
  secondaryText: pearlTiffanyColors.onSurfaceVariant,
  tertiaryText: pearlTiffanyColors.mutedSlate,
  disabled: pearlTiffanyColors.surfaceDim,

  // CTAs & Interactive Controls
  cta: pearlTiffanyColors.primary,
  ctaText: pearlTiffanyColors.onPrimary,
  ctaContainer: pearlTiffanyColors.primaryContainer,
  onCtaContainer: pearlTiffanyColors.onPrimaryContainer,

  // Glassmorphism overlays
  glass: 'rgba(255, 255, 255, 0.92)',
  glassDark: 'rgba(46, 50, 56, 0.05)',
  glassBorder: 'rgba(226, 232, 237, 0.70)',

  // Accents
  tintSoft: pearlTiffanyColors.surfaceContainer,
  accentSubtle: pearlTiffanyColors.powderedMint,
  badge: pearlTiffanyColors.surfaceContainerHigh,
  successSubtle: pearlTiffanyColors.secondaryContainer,

  // Raw palette access
  palette: pearlTiffanyColors,
};

/**
 * Coherent dark counterpart preserving Pearl & Tiffany Atelier luxury identity
 */
export const darkThemeColors: ThemeColors = {
  // Navigation & structural backgrounds
  bg: '#121415',
  surface: '#1A1C1E',
  surfaceSubtle: '#24272A',
  surfaceElevated: '#2A2D31',

  // Borders & Dividers
  border: '#363B3F',
  borderLight: 'rgba(113, 120, 124, 0.25)',

  // Typography
  primaryText: '#F1F1EF',
  secondaryText: pearlTiffanyColors.brightPlatinum,
  tertiaryText: pearlTiffanyColors.mutedSlate,
  disabled: '#4A5157',

  // CTAs & Interactive Controls
  cta: pearlTiffanyColors.tiffany,
  ctaText: '#001F29',
  ctaContainer: '#1F4856',
  onCtaContainer: pearlTiffanyColors.primaryFixed,

  // Glassmorphism overlays
  glass: 'rgba(26, 28, 30, 0.88)',
  glassDark: 'rgba(18, 20, 21, 0.75)',
  glassBorder: 'rgba(113, 120, 124, 0.28)',

  // Accents
  tintSoft: '#24272A',
  accentSubtle: pearlTiffanyColors.powderedMint,
  badge: '#2E3238',
  successSubtle: '#223830',

  // Raw palette access
  palette: pearlTiffanyColors,
};
