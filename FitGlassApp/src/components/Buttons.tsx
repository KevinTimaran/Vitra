import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger' | 'tiffany';
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  variant = 'primary',
}) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) colors = themeCtx.colors;
  } catch (e) {}

  const isDanger = variant === 'danger';
  const isTiffany = variant === 'tiffany';

  const bgColor = isDanger
    ? colors.buttons.dangerBackground
    : isTiffany
    ? colors.palette.tiffany
    : colors.buttons.primaryBackground;

  const textColor = isDanger
    ? colors.buttons.dangerText
    : isTiffany
    ? colors.palette.onPrimaryFixed
    : colors.buttons.primaryText;

  return (
    <TouchableOpacity
      style={[
        styles.primary,
        { backgroundColor: bgColor },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={textColor}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text style={[styles.primaryText, { color: textColor }, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  variant = 'secondary',
}) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) colors = themeCtx.colors;
  } catch (e) {}

  const isDanger = variant === 'danger';
  const backgroundColor = isDanger
    ? colors.buttons.dangerSoftBackground
    : colors.buttons.secondaryBackground;
  const borderColor = isDanger
    ? colors.buttons.dangerBorder
    : colors.buttons.secondaryBorder;
  const foregroundColor = isDanger
    ? colors.buttons.dangerBackground
    : colors.buttons.secondaryText;

  return (
    <TouchableOpacity
      style={[
        styles.secondary,
        {
          backgroundColor,
          borderColor,
        },
        disabled && styles.disabledSecondary,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={foregroundColor}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text style={[styles.secondaryText, { color: foregroundColor }, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const TextButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  style,
  textStyle,
}) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) colors = themeCtx.colors;
  } catch (e) {}

  return (
    <TouchableOpacity
      style={[styles.textButton, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text
        style={[
          styles.textButtonText,
          { color: colors.buttons.linkText },
          disabled && { color: colors.disabled },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const IconButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
}> = ({ icon, onPress, size = 20, color, style }) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) colors = themeCtx.colors;
  } catch (e) {}

  const iconColor = color || colors.buttons.secondaryText;

  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        {
          backgroundColor: colors.buttons.neutralBackground,
          borderColor: colors.buttons.neutralBorder,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primary: {
    height: 50,
    backgroundColor: DefaultColors.cta,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryText: {
    ...Typography.headline,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: DefaultColors.ctaText,
  },
  secondary: {
    height: 50,
    backgroundColor: DefaultColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: DefaultColors.borderLight,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
  },
  secondaryText: {
    ...Typography.headline,
    fontWeight: '500',
    letterSpacing: 0.1,
    color: DefaultColors.primaryText,
  },
  textButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonText: {
    ...Typography.callout,
    color: DefaultColors.secondaryText,
    fontWeight: '500',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: DefaultColors.surface,
    borderWidth: 1,
    borderColor: DefaultColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: DefaultColors.buttons.disabledOpacity,
  },
  disabledSecondary: {
    borderColor: DefaultColors.borderLight,
    opacity: DefaultColors.buttons.disabledOpacity,
  },
});
