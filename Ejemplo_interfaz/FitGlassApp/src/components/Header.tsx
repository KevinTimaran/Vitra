import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    onPress: () => void;
  };
  onAvatarPress?: () => void;
  showAvatar?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  onAvatarPress,
  showAvatar = false,
}) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) {
      colors = themeCtx.colors;
    }
  } catch (e) {
    // Fallback to static colors if rendered outside ThemeProvider
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
        )}
        {title && (
          <View style={styles.titleWrapper}>
            <Text style={[Typography.title2, { color: colors.primaryText }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[Typography.caption, { color: colors.secondaryText, marginTop: 1 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={rightAction.onPress}
            activeOpacity={0.7}
          >
            {rightAction.icon ? (
              <Ionicons name={rightAction.icon} size={22} color={colors.primaryText} />
            ) : (
              <Text style={[Typography.subhead, { color: colors.primaryText }]}>
                {rightAction.label}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {showAvatar && (
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onAvatarPress}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.avatarInner,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="person-outline" size={15} color={colors.primaryText} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  titleWrapper: {
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  avatarButton: {
    marginLeft: Spacing.md,
  },
  avatarInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
