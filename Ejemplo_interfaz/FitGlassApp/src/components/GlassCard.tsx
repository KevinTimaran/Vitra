import React from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ViewProps,
} from 'react-native';
import { BlurView, BlurTint } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

export interface GlassCardProps extends ViewProps {
  /**
   * Contenido hijo a renderizar dentro de la tarjeta de cristal.
   */
  children?: React.ReactNode;
  /**
   * Estilos de diseño y posicionamiento opcionales.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Intensidad del efecto de desenfoque (1 - 100).
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
}

/**
 * Propiedades de estilo que corresponden al contenedor exterior para
 * garantizar que sombras y posicionamiento no se corten por el overflow: hidden.
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
 * Componente reutilizable de superficie Glassmorphism para Vitra / FitGlassApp.
 * Utiliza BlurView de expo-blur, bordes finos de refracción y sombra sutil
 * sincronizado automáticamente con el modo claro y oscuro del tema.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 50,
  tint,
  borderRadius = 24,
  ...restProps
}) => {
  const { isDark } = useTheme();

  // Tinte adaptativo según el tema activo si el consumidor no especifica uno
  const effectiveTint: BlurTint = tint || (isDark ? 'dark' : 'light');

  // Separar estilos de contenedor exterior (layout/sombras) de estilos interiores (relleno/alineación)
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

  // Colores translúcidos según especificación Glassmorphism (adaptados a light/dark)
  const defaultBg = isDark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.10)';

  const defaultBorder = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(255, 255, 255, 0.20)';

  return (
    <View
      style={[
        styles.outerShadow,
        {
          borderRadius: resolvedBorderRadius,
          shadowOpacity: isDark ? 0.25 : 0.08,
        },
        outerStyle,
        { backgroundColor: 'transparent' }, // El contenedor exterior debe ser siempre 100% transparente para no bloquear el vidrio
      ]}
      {...restProps}
    >
      <BlurView
        intensity={intensity}
        tint={effectiveTint}
        style={[
          styles.innerSurface,
          {
            borderRadius: resolvedBorderRadius,
            backgroundColor: defaultBg,
            borderColor: defaultBorder,
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
  outerShadow: {
    // Elevación y sombra sutil para separar la tarjeta del fondo sin opacar el cristal
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    backgroundColor: 'transparent',
  },
  innerSurface: {
    overflow: 'hidden',
    borderWidth: 1,
    width: '100%',
  },
});
