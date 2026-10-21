import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

interface VibrantBackgroundProps {
  children?: React.ReactNode;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Fondo ambiental vibrante para Glassmorphism.
 * Inyecta un gradiente profundo (midnight/indigo/violeta en dark mode)
 * y 'blobs' de color puro (fucsia, cian, violeta) con desenfoque nativo,
 * permitiendo que las tarjetas GlassCard refracten y difuminen colores vivos.
 */
export const VibrantBackground: React.FC<VibrantBackgroundProps> = ({ children }) => {
  const { isDark } = useTheme();

  // Gradiente base: en modo oscuro azul medianoche a violeta profundo
  const gradientColors = isDark
    ? (['#060814', '#0D1026', '#160B24', '#090D1E'] as const)
    : (['#F1F5F9', '#EDE9FE', '#FCE7F3', '#E0F2FE'] as const);

  // Paleta de orbes luminosos
  const fuchsiaColor = isDark ? 'rgba(217, 70, 239, 0.45)' : 'rgba(232, 121, 249, 0.35)';
  const cyanColor = isDark ? 'rgba(6, 182, 212, 0.42)' : 'rgba(56, 189, 248, 0.32)';
  const violetColor = isDark ? 'rgba(139, 92, 246, 0.38)' : 'rgba(167, 139, 250, 0.28)';

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* 1. Gradiente de fondo en toda la pantalla */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0.0 }}
        end={{ x: 0.9, y: 1.0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Blobs circulares vibrantes de iluminación ambiental */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Blob Fucsia (superior derecho / detrás de la tarjeta) */}
        <View
          style={[
            styles.blob,
            styles.blobFuchsia,
            { backgroundColor: fuchsiaColor },
            Platform.OS === 'web' && ({ filter: 'blur(50px)' } as any),
          ]}
        />

        {/* Blob Cian / Turquesa Eléctrico (inferior izquierdo) */}
        <View
          style={[
            styles.blob,
            styles.blobCyan,
            { backgroundColor: cyanColor },
            Platform.OS === 'web' && ({ filter: 'blur(55px)' } as any),
          ]}
        />

        {/* Blob Violeta (centro-lateral) */}
        <View
          style={[
            styles.blob,
            styles.blobViolet,
            { backgroundColor: violetColor },
            Platform.OS === 'web' && ({ filter: 'blur(45px)' } as any),
          ]}
        />
      </View>

      {/* 3. Capa de desenfoque nativo sobre los orbes para difusión lumínica */}
      <BlurView
        intensity={Platform.OS === 'web' ? 25 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFillObject}
      />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
  blobFuchsia: {
    width: 250,
    height: 250,
    borderRadius: 125,
    top: '8%',
    right: '-8%',
  },
  blobCyan: {
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: '12%',
    left: '-10%',
  },
  blobViolet: {
    width: 210,
    height: 210,
    borderRadius: 105,
    top: '42%',
    left: '10%',
  },
});
