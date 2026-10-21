import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Garment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface ColorRecommendationsScreenProps {
  garments: Garment[];
  onBack: () => void;
  onSelectGarment: (garment: Garment) => void;
  onTryOn: (garment: Garment) => void;
}

export const ColorRecommendationsScreen: React.FC<ColorRecommendationsScreenProps> = ({
  garments,
  onBack,
  onSelectGarment,
  onTryOn,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const harmoniousGarments = garments.filter((g) => g.paletteHarmony);
  const otherTonesGarments = garments.filter((g) => !g.paletteHarmony);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('colorRecommendations.title')}
        subtitle={t('colorRecommendations.subtitle')}
        onBack={onBack}
        rightAction={{
          icon: 'sparkles',
          onPress: () => {},
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Harmony Context Badge */}
        <GlassCard style={styles.harmonyHeaderCard}>
          <View style={[styles.harmonyIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="color-filter-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.harmonyInfo}>
            <Text style={[styles.harmonyBadgeTitle, { color: colors.primaryText }]}>
              {t('colorRecommendations.matchBadge')}
            </Text>
            <Text style={[styles.harmonyBadgeDesc, { color: colors.secondaryText }]}>
              {harmoniousGarments.length} {t('colorRecommendations.matchDesc')}
            </Text>
          </View>
        </GlassCard>

        {/* Section 1: Works well with your palette */}
        <View style={styles.sectionTitleArea}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            {t('colorRecommendations.worksWellTitle')}
          </Text>
          <Text style={[styles.sectionCaption, { color: colors.secondaryText }]}>
            {t('colorRecommendations.worksWellSubtitle')}
          </Text>
        </View>

        <View style={styles.garmentGrid}>
          {harmoniousGarments.map((garment) => (
            <TouchableOpacity
              key={garment.id}
              style={styles.garmentCardWrapper}
              onPress={() => onSelectGarment(garment)}
              activeOpacity={0.88}
            >
              <GlassCard style={styles.garmentCard}>
                <View style={[styles.cardVisualArea, { backgroundColor: colors.surfaceSubtle }]}>
                  <View
                    style={[
                      styles.swatchBackdrop,
                      { backgroundColor: garment.colorHex },
                    ]}
                  />
                  <Ionicons
                    name={
                      garment.category === 'Tops'
                        ? 'shirt-outline'
                        : garment.category === 'Outerwear'
                        ? 'layers-outline'
                        : garment.category === 'Pants'
                        ? 'reorder-two-outline'
                        : 'footsteps-outline'
                    }
                    size={32}
                    color={garment.colorHex === '#FFFFFF' ? '#71787C' : colors.primaryText}
                  />

                  <View style={styles.harmonyScorePill}>
                    <Ionicons name="sparkles" size={10} color={colors.primary} />
                    <Text style={[styles.harmonyScoreText, { color: colors.primary }]}>HARMONY</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <Text style={[styles.cardGarmentName, { color: colors.primaryText }]} numberOfLines={1}>
                    {garment.name}
                  </Text>
                  <View style={styles.swatchRow}>
                    <View
                      style={[
                        styles.colorIndicatorDot,
                        { backgroundColor: garment.colorHex },
                      ]}
                    />
                    <Text style={[styles.cardMetaText, { color: colors.secondaryText }]} numberOfLines={1}>
                      {garment.colorName} · {garment.category}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.quickTryButton, { borderTopColor: colors.borderLight, backgroundColor: colors.surfaceSubtle }]}
                  onPress={() => onTryOn(garment)}
                >
                  <Text style={[styles.quickTryText, { color: colors.primaryText }]}>
                    {t('colorRecommendations.tryOn')} 3D
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.primaryText} />
                </TouchableOpacity>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 2: Explore Other Tones */}
        <View style={[styles.sectionTitleArea, { marginTop: Spacing.xl }]}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            {t('colorRecommendations.otherTonesTitle')}
          </Text>
          <Text style={[styles.sectionCaption, { color: colors.secondaryText }]}>
            {t('colorRecommendations.otherTonesSubtitle')}
          </Text>
        </View>

        <View style={styles.garmentGrid}>
          {otherTonesGarments.map((garment) => (
            <TouchableOpacity
              key={garment.id}
              style={styles.garmentCardWrapper}
              onPress={() => onSelectGarment(garment)}
              activeOpacity={0.88}
            >
              <GlassCard style={styles.garmentCard}>
                <View style={[styles.cardVisualArea, { backgroundColor: colors.surfaceSubtle }]}>
                  <View
                    style={[
                      styles.swatchBackdrop,
                      { backgroundColor: garment.colorHex },
                    ]}
                  />
                  <Ionicons
                    name={
                      garment.category === 'Outerwear'
                        ? 'layers-outline'
                        : garment.category === 'Pants'
                        ? 'reorder-two-outline'
                        : 'shirt-outline'
                    }
                    size={32}
                    color={garment.colorHex === '#FFFFFF' ? '#71787C' : colors.primaryText}
                  />
                </View>

                <View style={styles.cardDetails}>
                  <Text style={[styles.cardGarmentName, { color: colors.primaryText }]} numberOfLines={1}>
                    {garment.name}
                  </Text>
                  <View style={styles.swatchRow}>
                    <View
                      style={[
                        styles.colorIndicatorDot,
                        { backgroundColor: garment.colorHex },
                      ]}
                    />
                    <Text style={[styles.cardMetaText, { color: colors.secondaryText }]} numberOfLines={1}>
                      {garment.colorName} · {garment.category}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.quickTryButton, { borderTopColor: colors.borderLight, backgroundColor: colors.surfaceSubtle }]}
                  onPress={() => onTryOn(garment)}
                >
                  <Text style={[styles.quickTryText, { color: colors.primaryText }]}>
                    {t('colorRecommendations.tryOn')} 3D
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.primaryText} />
                </TouchableOpacity>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge,
  },
  harmonyHeaderCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  harmonyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  harmonyInfo: {
    flex: 1,
  },
  harmonyBadgeTitle: {
    ...Typography.subhead,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '700',
  },
  harmonyBadgeDesc: {
    ...Typography.caption,
    fontFamily: Typography.outfit.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitleArea: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headlineMd,
    fontFamily: Typography.bodoni.bold,
  },
  sectionCaption: {
    ...Typography.caption,
    fontFamily: Typography.outfit.regular,
    marginTop: 2,
  },
  garmentGrid: {
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  garmentCardWrapper: {
    width: '47.5%',
  },
  garmentCard: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardVisualArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swatchBackdrop: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.22,
  },
  harmonyScorePill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  harmonyScoreText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 8,
    fontWeight: '700',
  },
  cardDetails: {
    padding: Spacing.sm,
  },
  cardGarmentName: {
    ...Typography.caption,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  colorIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardMetaText: {
    ...Typography.micro,
    fontFamily: Typography.outfit.regular,
    fontSize: 9,
    flex: 1,
  },
  quickTryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  quickTryText: {
    ...Typography.micro,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
    fontSize: 10,
  },
});
