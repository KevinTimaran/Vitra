import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';

export const WardrobeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: isDark ? '#000000' : '#888888',
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSubtle }]}>
          <Ionicons name="shirt-outline" size={38} color={colors.primaryText} />
        </View>
        <Text style={[styles.title, { color: colors.primaryText }]}>
          {t('wardrobe.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          {t('wardrobe.subtitle')}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.tertiaryText }]}>
            {t('wardrobe.phaseBadge')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.cta }]}
          onPress={() => (navigation ? navigation.navigate('AddGarment') : null)}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={18} color={colors.ctaText} />
          <Text style={[styles.addBtnText, { color: colors.ctaText }]}>
            {t('wardrobe.addGarmentBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.subhead,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    width: '100%',
  },
  addBtnText: {
    ...Typography.callout,
    fontWeight: '600',
  },
});
