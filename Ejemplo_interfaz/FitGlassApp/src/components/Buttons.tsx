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
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) colors = themeCtx.colors;
  } catch (e) {}

  return (
    <TouchableOpacity
      style={[
        styles.primary,
        { backgroundColor: colors.cta },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={colors.ctaText} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={colors.ctaText}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text style={[styles.primaryText, { color: colors.ctaText }, textStyle]}>{label}</Text>
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
}) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) colors = themeCtx.colors;
  } catch (e) {}

  return (
    <TouchableOpacity
      style={[
        styles.secondary,
        { backgroundColor: colors.surface, borderColor: colors.border },
        disabled && styles.disabledSecondary,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryText} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={colors.primaryText}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text style={[styles.secondaryText, { color: colors.primaryText }, textStyle]}>{label}</Text>
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
          { color: colors.secondaryText },
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

  const iconColor = color || colors.primaryText;

  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
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
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
  },
  primaryText: {
    ...Typography.headline,
    color: DefaultColors.ctaText,
  },
  secondary: {
    height: 50,
    backgroundColor: DefaultColors.surface,
    borderWidth: 1,
    borderColor: DefaultColors.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
  },
  secondaryText: {
    ...Typography.headline,
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
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: DefaultColors.surface,
    borderWidth: 1,
    borderColor: DefaultColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: DefaultColors.disabled,
  },
  disabledSecondary: {
    borderColor: DefaultColors.borderLight,
    opacity: 0.5,
  },
});
