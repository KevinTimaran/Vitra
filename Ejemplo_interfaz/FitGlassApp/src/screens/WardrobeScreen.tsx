import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';

export const WardrobeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <VibrantBackground />
      <GlassCard style={styles.card}>
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
      </GlassCard>
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
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  title: {
    ...Typography.headlineLg,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    marginBottom: Spacing.md,
    maxWidth: 290,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.labelSm,
    letterSpacing: 0.8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: '100%',
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  addBtnText: {
    ...Typography.labelLg,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
