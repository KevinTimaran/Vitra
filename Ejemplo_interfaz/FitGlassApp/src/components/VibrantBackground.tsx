// src/components/VibrantBackground.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { pearlTiffanyColors } from '../theme/colors';

interface VibrantBackgroundProps {
  children?: React.ReactNode;
}

/**
 * Atelier Luminous Background — Pearl & Tiffany Atelier
 *
 * Genera una atmósfera sutil, luminosa y sofisticada inspirada en un atelier
 * de alta costura parisino. Reemplaza gradientes saturados o púrpuras genéricos
 * por tonos minerales puros, perla, arena fina y reflejos suaves de Tiffany
 * y menta empolvada, permitiendo que las tarjetas GlassCard refracten matices
 * elegantes sin contaminar la composición.
 */
export const VibrantBackground: React.FC<VibrantBackgroundProps> = ({ children }) => {
  const { isDark } = useTheme();

  // Gradiente arquitectónico base (superficie perla mineral o pizarra profunda)
  const gradientColors = isDark
    ? (['#101213', '#151719', '#1A1D1F', '#121415'] as const)
    : (['#FBFBFA', '#F4F4F1', '#ECECE9', '#F9F9F7'] as const);

  // Orbes ambientales tenues (difusión mineral de lujo)
  const tiffanyGlow = isDark
    ? 'rgba(60, 100, 115, 0.18)'
    : 'rgba(142, 182, 199, 0.16)';

  const sandGlow = isDark
    ? 'rgba(108, 91, 82, 0.14)'
    : 'rgba(196, 185, 169, 0.18)';

  const mintGlow = isDark
    ? 'rgba(72, 100, 92, 0.15)'
    : 'rgba(158, 188, 179, 0.14)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Gradiente arquitectónico de fondo */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.05, y: 0.0 }}
        end={{ x: 0.95, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Orbes ambientales suaves */}
      <View style={StyleSheet.absoluteFill}>
        {/* Orbe Tiffany (superior derecho) */}
        <View
          style={[
            styles.orb,
            styles.orbTiffany,
            { backgroundColor: tiffanyGlow },
            Platform.OS === 'web' && ({ filter: 'blur(60px)' } as any),
          ]}
        />

        {/* Orbe Arena Fina / Mineral (inferior izquierdo) */}
        <View
          style={[
            styles.orb,
            styles.orbSand,
            { backgroundColor: sandGlow },
            Platform.OS === 'web' && ({ filter: 'blur(65px)' } as any),
          ]}
        />

        {/* Orbe Menta Empolvada (lateral central) */}
        <View
          style={[
            styles.orb,
            styles.orbMint,
            { backgroundColor: mintGlow },
            Platform.OS === 'web' && ({ filter: 'blur(55px)' } as any),
          ]}
        />
      </View>

      {/* 3. Desenfoque nativo para difusión óptica ultra-suave */}
      <BlurView
        intensity={Platform.OS === 'web' ? 20 : 50}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
  orbTiffany: {
    width: 280,
    height: 280,
    borderRadius: 140,
    top: '5%',
    right: '-10%',
  },
  orbSand: {
    width: 320,
    height: 320,
    borderRadius: 160,
    bottom: '10%',
    left: '-12%',
  },
  orbMint: {
    width: 240,
    height: 240,
    borderRadius: 120,
    top: '45%',
    left: '5%',
  },
});
