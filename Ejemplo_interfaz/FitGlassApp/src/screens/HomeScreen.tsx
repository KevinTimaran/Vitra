import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius, Shadows } from '../theme';
import { Header } from '../components/Header';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Garment, SavedLookItem } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface HomeScreenProps {
  garments: Garment[];
  savedLooks: SavedLookItem[];
  paletteSwatches: { name: string; hex: string }[];
  onOpenFittingRoom: () => void;
  onAddGarment: () => void;
  onOpenColorStudio: () => void;
  onOpenWardrobe: () => void;
  onSelectGarment: (garment: Garment) => void;
  onSelectLook: (look: SavedLookItem) => void;
  onOpenProfile: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  garments,
  savedLooks,
  paletteSwatches,
  onOpenFittingRoom,
  onAddGarment,
  onOpenColorStudio,
  onOpenWardrobe,
  onSelectGarment,
  onSelectLook,
  onOpenProfile,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('header.brand')}
        subtitle={t('header.subtitle')}
        showAvatar
        onAvatarPress={onOpenProfile}
        rightAction={{
          icon: 'sparkles-outline',
          onPress: onOpenColorStudio,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Hero Section */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.heroPreheader, { color: colors.tertiaryText }]}>
            {t('home.heroPreheader')}
          </Text>
          <Text style={[Typography.largeTitle, styles.heroTitle, { color: colors.primaryText }]}>
            {t('home.heroTitle')}
          </Text>
          <Text style={[Typography.body, styles.heroSubtitle, { color: colors.secondaryText }]}>
            {t('home.heroSubtitle')}
          </Text>

          {/* Hero CTAs */}
          <View style={styles.heroButtonsRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <PrimaryButton
                label={t('home.fittingRoom')}
                onPress={onOpenFittingRoom}
                icon="cube-outline"
                style={{ height: 46 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={t('home.addClothing')}
                onPress={onAddGarment}
                icon="camera-outline"
                style={{ height: 46 }}
              />
            </View>
          </View>
        </View>

        {/* Quick Access Action Bar */}
        <View
          style={[
            styles.quickBar,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity
            style={styles.quickItem}
            onPress={onAddGarment}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="camera-outline" size={20} color={colors.primaryText} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.primaryText }]}>
              {t('home.quickAddGarment')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={onOpenFittingRoom}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="cube-outline" size={20} color={colors.primaryText} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.primaryText }]}>
              {t('home.quickFittingRoom')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={onOpenColorStudio}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primaryText} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.primaryText }]}>
              {t('home.quickColorStudio')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={onOpenWardrobe}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="grid-outline" size={20} color={colors.primaryText} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.primaryText }]}>
              {t('home.quickAllClothes')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: Recent Looks */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[Typography.title2, styles.sectionTitle, { color: colors.primaryText }]}>
              {t('home.recentLooks')}
            </Text>
            <Text style={[styles.sectionCaption, { color: colors.secondaryText }]}>
              {t('home.recentLooksSubtitle')}
            </Text>
          </View>
          <TouchableOpacity onPress={onOpenFittingRoom}>
            <Text style={[styles.sectionActionText, { color: colors.primaryText }]}>
              {t('home.buildOutfit')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollList}
        >
          {savedLooks.map((look) => (
            <TouchableOpacity
              key={look.id}
              style={[
                styles.lookCard,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
              onPress={() => onSelectLook(look)}
              activeOpacity={0.88}
            >
              {/* Silhouette composition representation */}
              <View style={[styles.lookVisualBox, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.lookSilhouetteMini}>
                  <Ionicons name="person-outline" size={32} color={colors.primaryText} />
                </View>
                <View style={styles.layerPillsRow}>
                  {look.garments.slice(0, 3).map((g, idx) => (
                    <View
                      key={idx}
                      style={[styles.layerMiniDot, { backgroundColor: g.colorHex }]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.lookInfo}>
                <Text style={[styles.lookTitle, { color: colors.primaryText }]} numberOfLines={1}>
                  {look.title}
                </Text>
                <Text style={[styles.lookMeta, { color: colors.secondaryText }]}>
                  {look.garments.length} {t('home.garmentsCount')} · {look.fitScore}
                </Text>
                <Text style={[styles.lookDate, { color: colors.tertiaryText }]}>{look.date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section: Your Wardrobe (Recent additions) */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[Typography.title2, styles.sectionTitle, { color: colors.primaryText }]}>
              {t('home.yourWardrobe')}
            </Text>
            <Text style={[styles.sectionCaption, { color: colors.secondaryText }]}>
              {t('home.recentGarments')}
            </Text>
          </View>
          <TouchableOpacity onPress={onOpenWardrobe}>
            <Text style={[styles.sectionActionText, { color: colors.primaryText }]}>
              {t('common.viewAll')} ({garments.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollList}
        >
          {garments.map((garment) => (
            <TouchableOpacity
              key={garment.id}
              style={[
                styles.garmentThumbnailCard,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
              onPress={() => onSelectGarment(garment)}
              activeOpacity={0.85}
            >
              <View style={[styles.garmentThumbVisual, { backgroundColor: colors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.garmentColorHalo,
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
                  size={26}
                  color={garment.colorHex === '#FFFFFF' ? '#A1A1AA' : '#27272A'}
                />
                <View style={styles.thumbSizeTag}>
                  <Text style={styles.thumbSizeText}>{garment.size}</Text>
                </View>
              </View>
              <View style={styles.garmentThumbInfo}>
                <Text style={[styles.garmentThumbName, { color: colors.primaryText }]} numberOfLines={1}>
                  {garment.name}
                </Text>
                <Text style={[styles.garmentThumbCategory, { color: colors.secondaryText }]}>
                  {garment.category} · {garment.colorName}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section: Color Palette Harmony */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[Typography.title2, styles.sectionTitle, { color: colors.primaryText }]}>
              {t('home.colorPalette')}
            </Text>
            <Text style={[styles.sectionCaption, { color: colors.secondaryText }]}>
              {t('home.skinUndertone')}
            </Text>
          </View>
          <TouchableOpacity onPress={onOpenColorStudio}>
            <Text style={[styles.sectionActionText, { color: colors.primaryText }]}>
              {t('home.studio')}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.paletteContainer,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.paletteHeaderRow}>
            <Text style={[styles.paletteSubtext, { color: colors.secondaryText }]}>
              {t('home.neutralHarmonies')}
            </Text>
            <Text style={[styles.paletteSubtext, { color: colors.tertiaryText }]}>Cool Mineral</Text>
          </View>
          <View style={styles.swatchesRow}>
            {paletteSwatches.map((item, index) => (
              <View key={index} style={styles.swatchItem}>
                <View
                  style={[
                    styles.swatchCircle,
                    { backgroundColor: item.hex },
                    item.hex === '#FFFFFF' || item.hex === '#F4F4F5'
                      ? { borderWidth: 1, borderColor: colors.border }
                      : null,
                  ]}
                />
                <Text style={[styles.swatchLabel, { color: colors.secondaryText }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            ))}
          </View>
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
  heroCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadows.subtle,
  },
  heroPreheader: {
    ...Typography.micro,
    letterSpacing: 1.2,
  },
  heroTitle: {
    marginTop: Spacing.xs,
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  quickBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  quickItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickLabel: {
    ...Typography.micro,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {},
  sectionCaption: {
    ...Typography.caption,
    marginTop: 2,
  },
  sectionActionText: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  horizontalScrollList: {
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.md,
  },
  lookCard: {
    width: 220,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginRight: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  lookVisualBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lookSilhouetteMini: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerPillsRow: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    gap: 4,
  },
  layerMiniDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  lookInfo: {
    padding: Spacing.md,
  },
  lookTitle: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  lookMeta: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  lookDate: {
    ...Typography.micro,
    marginTop: 4,
  },
  garmentThumbnailCard: {
    width: 140,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginRight: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  garmentThumbVisual: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  garmentColorHalo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0.2,
  },
  thumbSizeTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  thumbSizeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#09090B',
  },
  garmentThumbInfo: {
    padding: Spacing.sm,
  },
  garmentThumbName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  garmentThumbCategory: {
    ...Typography.micro,
    textTransform: 'none',
    marginTop: 2,
  },
  paletteContainer: {
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  paletteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  paletteSubtext: {
    ...Typography.caption,
    fontSize: 11,
  },
  swatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  swatchItem: {
    alignItems: 'center',
    flex: 1,
  },
  swatchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  swatchLabel: {
    ...Typography.micro,
    fontSize: 9,
    textTransform: 'none',
    textAlign: 'center',
    maxWidth: 60,
  },
});
