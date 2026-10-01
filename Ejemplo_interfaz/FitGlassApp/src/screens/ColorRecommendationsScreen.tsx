import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
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
        <View
          style={[
            styles.harmonyHeaderCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={[styles.harmonyIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="color-filter-outline" size={22} color={colors.primaryText} />
          </View>
          <View style={styles.harmonyInfo}>
            <Text style={[styles.harmonyBadgeTitle, { color: colors.primaryText }]}>
              {t('colorRecommendations.matchBadge')}
            </Text>
            <Text style={[styles.harmonyBadgeDesc, { color: colors.secondaryText }]}>
              {harmoniousGarments.length} {t('colorRecommendations.matchDesc')}
            </Text>
          </View>
        </View>

        {/* Section 1: Works well with your palette */}
        <View style={styles.sectionTitleArea}>
          <Text style={[Typography.title2, styles.sectionTitle, { color: colors.primaryText }]}>
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
              style={[
                styles.garmentCard,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
              onPress={() => onSelectGarment(garment)}
              activeOpacity={0.88}
            >
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
                  color={garment.colorHex === '#FFFFFF' ? '#A1A1AA' : '#27272A'}
                />

                <View style={styles.harmonyScorePill}>
                  <Ionicons name="sparkles" size={10} color="#10B981" />
                  <Text style={styles.harmonyScoreText}>HARMONY</Text>
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 2: Explore Other Tones */}
        <View style={[styles.sectionTitleArea, { marginTop: Spacing.xl }]}>
          <Text style={[Typography.title2, styles.sectionTitle, { color: colors.primaryText }]}>
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
              style={[
                styles.garmentCard,
                styles.garmentCardSecondary,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
              onPress={() => onSelectGarment(garment)}
              activeOpacity={0.88}
            >
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
                  color={garment.colorHex === '#FFFFFF' ? '#A1A1AA' : '#27272A'}
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
    borderWidth: 1,
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
    fontWeight: '700',
  },
  harmonyBadgeDesc: {
    ...Typography.caption,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitleArea: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {},
  sectionCaption: {
    ...Typography.caption,
    marginTop: 2,
  },
  garmentGrid: {
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  garmentCard: {
    width: '47.5%',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  garmentCardSecondary: {
    opacity: 0.88,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  harmonyScoreText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#10B981',
  },
  cardDetails: {
    padding: Spacing.sm,
  },
  cardGarmentName: {
    ...Typography.caption,
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
    fontSize: 9,
    flex: 1,
  },
  quickTryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  quickTryText: {
    ...Typography.micro,
    fontWeight: '600',
    fontSize: 10,
  },
});
