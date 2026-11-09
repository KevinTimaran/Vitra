// src/components/LiquidGlassView.tsx
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

export interface LiquidGlassViewProps extends ViewProps {
  /**
   * Children components wrapped in the liquid glass container.
   */
  children?: React.ReactNode;
  /**
   * Custom style properties applied to the container.
   * Layout, margins, positioning, dimensions, and shadows are mapped to the outer wrapper,
   * while padding and flex alignments are applied to the inner frosted surface.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * High blur intensity from expo-blur (0 - 100).
   * Inspired by 0kzh/glisse high-diffusion frosted glass aesthetic.
   * @default 80
   */
  intensity?: number;
  /**
   * Blur tint ('light', 'dark', etc.).
   * If not specified, automatically reflects active theme.
   */
  tint?: BlurTint;
  /**
   * Smooth rounded corner radius.
   * @default 24
   */
  borderRadius?: number;
  /**
   * Translucent rim border width.
   * @default 1
   */
  borderWidth?: number;
  /**
   * Translucent border color mimicking liquid glass reflection rim.
   * @default 'rgba(255, 255, 255, 0.2)'
   */
  borderColor?: string;
  /**
   * Translucent tint color layered over the blur view for liquid depth.
   */
  backgroundColor?: string;
  /**
   * Whether to include subtle drop shadow for depth.
   * @default true
   */
  hasShadow?: boolean;
}

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
 * LiquidGlassView — Native "Liquid Glass" UI Primitive
 *
 * Inspired by 0kzh/glisse iOS Liquid Glass design language:
 * - High blur intensity (intensity={80})
 * - Subtle, translucent inner borders (borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)')
 * - Smooth rounded corners (borderRadius: 24)
 * - Subtle drop shadow for depth
 * - Non-clipping shadow separation (outer wrapper for shadows, inner BlurView for blur)
 */
export const LiquidGlassView: React.FC<LiquidGlassViewProps> = ({
  children,
  style,
  intensity = 80,
  tint,
  borderRadius = 24,
  borderWidth = 1,
  borderColor,
  backgroundColor,
  hasShadow = true,
  ...restProps
}) => {
  const { isDark } = useTheme();

  const effectiveTint: BlurTint = tint || (isDark ? 'dark' : 'light');

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
    } else if (key !== 'borderRadius' && key !== 'borderWidth' && key !== 'borderColor' && key !== 'backgroundColor') {
      (innerStyle as any)[key] = value;
    }
  });

  // Translucent inner border mimicking liquid glass refraction
  // Task spec: borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)'
  const defaultBorderColor = 'rgba(255, 255, 255, 0.2)';
  const resolvedBorderColor =
    borderColor || (flattenedStyle.borderColor as string) || defaultBorderColor;

  const resolvedBorderWidth =
    typeof flattenedStyle.borderWidth === 'number'
      ? flattenedStyle.borderWidth
      : borderWidth;

  // Liquid translucent surface background
  const defaultBgColor = isDark
    ? 'rgba(20, 22, 28, 0.50)'
    : 'rgba(255, 255, 255, 0.60)';
  const resolvedBgColor =
    backgroundColor || (flattenedStyle.backgroundColor as string) || defaultBgColor;

  // Subtle ambient drop shadow for depth
  const shadowStyle: ViewStyle = hasShadow
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.30 : 0.08,
        shadowRadius: 18,
        elevation: 4,
      }
    : {};

  const fillParentStyle: Record<string, any> = {};
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
        },
        shadowStyle,
        outerStyle,
        { backgroundColor: 'transparent' }, // Outer wrapper must stay transparent to preserve blur
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
            backgroundColor: resolvedBgColor,
            borderColor: resolvedBorderColor,
            borderWidth: resolvedBorderWidth,
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

export default LiquidGlassView;
