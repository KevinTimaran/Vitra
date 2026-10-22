// src/components/GlassCard.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ViewProps,
  Platform,
} from 'react-native';
import { BlurView, BlurTint } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { Radius, Shadows } from '../theme';

export type GlassCardVariant =
  | 'default'
  | 'elevated'
  | 'subtle'
  | 'tiffany'
  | 'accent';

export interface GlassCardProps extends ViewProps {
  /**
   * Contenido hijo dentro de la tarjeta de cristal.
   */
  children?: React.ReactNode;
  /**
   * Estilos de diseño, margen, dimensiones y posicionamiento opcionales.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Intensidad del efecto de desenfoque de expo-blur (1 - 100).
   * @default 50
   */
  intensity?: number;
  /**
   * Tinte del desenfoque. Si no se especifica, se sincroniza con el tema activo (light/dark).
   */
  tint?: BlurTint;
  /**
   * Radio de curvatura de esquinas.
   * @default 24
   */
  borderRadius?: number;
  /**
   * Grosor de borde de refracción.
   * @default 1
   */
  borderWidth?: number;
  /**
   * Variante estilística de elevación y tintado perimetral.
   * @default 'default'
   */
  variant?: GlassCardVariant;
}

/**
 * Propiedades de estilo que corresponden al contenedor exterior para
 * garantizar que sombras y posicionamiento no se corten por el overflow: hidden del BlurView.
 */
const OUTER_STYLE_KEYS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'alignSelf',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'opacity',
  'transform',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'elevation',
]);

/**
 * Master GlassCard Component — Pearl & Tiffany Atelier
 *
 * Implementa una superficie vítrea de lujo con alta legibilidad,
 * opacidad translúcida calibrada (88-95%), borde de refracción sutil,
 * desenfoque nativo con expo-blur y sombra ambiental suave sin opacar el cristal.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 50,
  tint,
  borderRadius = Radius.md, // 24
  borderWidth = 1,
  variant = 'default',
  ...restProps
}) => {
  const { isDark } = useTheme();

  // Tinte adaptativo según el tema activo
  const effectiveTint: BlurTint = tint || (isDark ? 'dark' : 'light');

  // Separar estilos de contenedor exterior (layout/sombras) de estilos interiores
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const outerStyle: ViewStyle = {};
  const innerStyle: ViewStyle = {};

  const resolvedBorderRadius =
    typeof flattenedStyle.borderRadius === 'number'
      ? flattenedStyle.borderRadius
      : borderRadius;

  Object.entries(flattenedStyle).forEach(([key, value]) => {
    if (OUTER_STYLE_KEYS.has(key)) {
      (outerStyle as any)[key] = value;
    } else {
      (innerStyle as any)[key] = value;
    }
  });

  // 1. Superficie de color base según especificación canónica
  let backgroundColor = isDark
    ? 'rgba(26, 28, 30, 0.88)'
    : 'rgba(255, 255, 255, 0.92)';

  if (variant === 'subtle') {
    backgroundColor = isDark
      ? 'rgba(26, 28, 30, 0.65)'
      : 'rgba(255, 255, 255, 0.78)';
  }

  // 2. Borde perimetral de refracción
  let borderColor = isDark
    ? 'rgba(113, 120, 124, 0.28)'
    : 'rgba(226, 232, 237, 0.70)';

  if (variant === 'tiffany') {
    borderColor = isDark ? 'rgba(142, 182, 199, 0.45)' : 'rgba(142, 182, 199, 0.55)';
  } else if (variant === 'accent') {
    borderColor = isDark ? 'rgba(158, 188, 179, 0.40)' : 'rgba(158, 188, 179, 0.50)';
  }

  // 3. Elevación y sombra ambiental canónica
  const shadowConfig =
    variant === 'elevated'
      ? Shadows.floating
      : Shadows.ambient;

  const shadowColor = isDark ? '#000000' : shadowConfig.shadowColor;
  const shadowOpacity = isDark ? 0.20 : shadowConfig.shadowOpacity;

  const fillParentStyle: ViewStyle = {};
  if (outerStyle.height !== undefined || outerStyle.maxHeight !== undefined) {
    fillParentStyle.height = '100%';
  }
  if (outerStyle.flex !== undefined) {
    fillParentStyle.flex = 1;
  }

  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderRadius: resolvedBorderRadius,
          shadowColor,
          shadowOpacity,
          shadowRadius: shadowConfig.shadowRadius,
          shadowOffset: shadowConfig.shadowOffset,
          elevation: shadowConfig.elevation,
        },
        outerStyle,
        { backgroundColor: 'transparent' }, // El contenedor exterior debe ser siempre 100% transparente
      ]}
      {...restProps}
    >
      <BlurView
        intensity={intensity}
        tint={effectiveTint}
        style={[
          styles.innerSurface,
          fillParentStyle,
          {
            borderRadius: resolvedBorderRadius,
            backgroundColor,
            borderColor,
            borderWidth,
          },
          innerStyle,
        ]}
      >
        {children}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: 'transparent',
  },
  innerSurface: {
    overflow: 'hidden',
    width: '100%',
  },
});
