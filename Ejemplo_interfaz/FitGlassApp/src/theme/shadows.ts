// src/theme/shadows.ts
/**
 * Canonical Luxury Fashion Editorial Ambient Shadows & Elevations — FitGlass Atelier
 *
 * Soft, diffuse ambient lighting tinted with Basalt Charcoal (#1A1C1D) for light mode
 * and deep Obsidian (#000000) for dark mode, mimicking museum/gallery directional
 * studio lighting rather than muddy drop-shadows.
 */

export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const Shadows = {
  ambient: {
    shadowColor: '#1A1C1D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
  },
  subtle: {
    shadowColor: '#1A1C1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#1A1C1D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  sheet: {
    shadowColor: '#1A1C1D',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export const DarkShadows = {
  ambient: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 2,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 4,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export type ShadowElevation = keyof typeof Shadows;

export const getShadow = (elevation: ShadowElevation, isDark = false): ShadowToken => {
  return isDark ? DarkShadows[elevation] : Shadows[elevation];
};
