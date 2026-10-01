export const Colors = {
  bg: '#FAFAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F2F2F7',
  surfaceElevated: '#FFFFFF',
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
  primaryText: '#111113',
  secondaryText: '#71717A',
  tertiaryText: '#A1A1AA',
  disabled: '#D4D4D8',
  cta: '#111113',
  ctaText: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassDark: 'rgba(17, 17, 19, 0.04)',
  tintSoft: '#F4F4F6',
  accentSubtle: '#27272A',
  badge: '#E4E4E7',
  successSubtle: '#27272A',
};

export const Typography = {
  display: {
    fontSize: 34,
    fontWeight: '300' as const,
    letterSpacing: -0.8,
    lineHeight: 42,
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  title1: {
    fontSize: 22,
    fontWeight: '500' as const,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  title2: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  headline: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  callout: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  subhead: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const Radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
};

export const Shadows = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
};
