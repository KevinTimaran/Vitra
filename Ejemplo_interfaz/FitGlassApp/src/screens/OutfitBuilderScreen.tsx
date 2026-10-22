import React, { useState } from 'react';
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
import { Viewport3DPlaceholder } from '../components/Viewport3DPlaceholder';
import { PrimaryButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { Garment, OutfitLayer, SavedLookItem } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface OutfitBuilderScreenProps {
  allGarments: Garment[];
  onBack: () => void;
  onSaveLook: (look: SavedLookItem) => void;
}

type LayerSlot = 'Top' | 'Outerwear' | 'Bottom' | 'Shoes';

export const OutfitBuilderScreen: React.FC<OutfitBuilderScreenProps> = ({
  allGarments,
  onBack,
  onSaveLook,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  // Initialize layers with garments from wardrobe
  const [layers, setLayers] = useState<OutfitLayer>({
    top: allGarments.find((g) => g.category === 'Tops') || allGarments[0],
    outerwear: allGarments.find((g) => g.category === 'Outerwear'),
    bottom: allGarments.find((g) => g.category === 'Pants'),
    shoes: allGarments.find((g) => g.category === 'Shoes'),
  });

  const [activeSlot, setActiveSlot] = useState<LayerSlot>('Top');

  // Filter garments matching active layer category
  const slotGarments = allGarments.filter((g) => {
    if (activeSlot === 'Top') return g.category === 'Tops';
    if (activeSlot === 'Outerwear') return g.category === 'Outerwear';
    if (activeSlot === 'Bottom') return g.category === 'Pants';
    if (activeSlot === 'Shoes') return g.category === 'Shoes';
    return true;
  });

  const handleSelectGarmentForSlot = (garment: Garment) => {
    if (activeSlot === 'Top') setLayers((prev) => ({ ...prev, top: garment }));
    if (activeSlot === 'Outerwear') setLayers((prev) => ({ ...prev, outerwear: garment }));
    if (activeSlot === 'Bottom') setLayers((prev) => ({ ...prev, bottom: garment }));
    if (activeSlot === 'Shoes') setLayers((prev) => ({ ...prev, shoes: garment }));
  };

  const handleSave = () => {
    const activePieces: Garment[] = [];
    if (layers.top) activePieces.push(layers.top);
    if (layers.outerwear) activePieces.push(layers.outerwear);
    if (layers.bottom) activePieces.push(layers.bottom);
    if (layers.shoes) activePieces.push(layers.shoes);

    const newLook: SavedLookItem = {
      id: `look-${Date.now()}`,
      title: 'Monochrome Tailored Uniform',
      date: t('common.today'),
      garments: activePieces,
      fitScore: 'Balanced · High Precision',
      paletteTheme: 'Cool Mineral & Basalt Harmony',
    };

    onSaveLook(newLook);
  };

  const currentGarment =
    activeSlot === 'Top'
      ? layers.top
      : activeSlot === 'Outerwear'
      ? layers.outerwear
      : activeSlot === 'Bottom'
      ? layers.bottom
      : layers.shoes;

  const getSlotLabel = (slot: LayerSlot) => {
    if (slot === 'Top') return t('outfitBuilder.slotTop');
    if (slot === 'Outerwear') return t('outfitBuilder.slotOuterwear');
    if (slot === 'Bottom') return t('outfitBuilder.slotBottom');
    return t('outfitBuilder.slotShoes');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('outfitBuilder.title')}
        subtitle={t('outfitBuilder.subtitle')}
        onBack={onBack}
        rightAction={{
          label: t('outfitBuilder.save'),
          onPress: handleSave,
        }}
      />

      {/* Main 3D Viewport Placeholder */}
      <View style={[styles.viewportWrapper, { borderBottomColor: colors.borderLight }]}>
        <Viewport3DPlaceholder
          currentGarmentName={currentGarment ? `${getSlotLabel(activeSlot)}: ${currentGarment.name}` : undefined}
          heightRatio={0.46}
        />
      </View>

      {/* Layer Tabs Selector (Top, Outerwear, Bottom, Shoes) */}
      <View style={[styles.layerTabsBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {(['Top', 'Outerwear', 'Bottom', 'Shoes'] as const).map((slot) => {
          const isActive = activeSlot === slot;
          const assigned =
            slot === 'Top'
              ? layers.top
              : slot === 'Outerwear'
              ? layers.outerwear
              : slot === 'Bottom'
              ? layers.bottom
              : layers.shoes;

          return (
            <TouchableOpacity
              key={slot}
              style={[
                styles.layerTab,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                isActive && {
                  backgroundColor: colors.cta,
                  borderColor: colors.cta,
                },
              ]}
              onPress={() => setActiveSlot(slot)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.layerTabLabel,
                  { color: colors.secondaryText },
                  isActive && { color: colors.ctaText, fontWeight: '700' },
                ]}
              >
                {getSlotLabel(slot)}
              </Text>
              {assigned ? (
                <View style={styles.assignedBadge}>
                  <View style={[styles.assignedDot, { backgroundColor: assigned.colorHex }]} />
                  <Text
                    style={[
                      styles.assignedText,
                      { color: colors.primaryText },
                      isActive && { color: colors.ctaText },
                    ]}
                    numberOfLines={1}
                  >
                    {assigned.colorName.split(' ')[0]}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.emptyLayerText, { color: colors.tertiaryText }, isActive && { color: colors.ctaText }]}>
                  —
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horizontal Garment Selector for Selected Slot */}
      <View style={[styles.catalogSection, { backgroundColor: colors.surface }]}>
        <View style={styles.catalogHeader}>
          <Text style={[styles.catalogTitle, { color: colors.tertiaryText }]}>
            {t('outfitBuilder.selectPiece')} {getSlotLabel(activeSlot).toUpperCase()}
          </Text>
          <View style={[styles.pillCounter, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}>
            <Text style={[styles.catalogCount, { color: colors.primaryText }]}>
              {slotGarments.length} {t('wardrobe.pieces')}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catalogScroll}
        >
          {slotGarments.length === 0 ? (
            <View style={styles.emptySlotBox}>
              <Text style={[styles.emptySlotText, { color: colors.secondaryText }]}>
                {t('outfitBuilder.emptySlot')}
              </Text>
            </View>
          ) : (
            slotGarments.map((garment) => {
              const isSelected =
                (activeSlot === 'Top' && layers.top?.id === garment.id) ||
                (activeSlot === 'Outerwear' && layers.outerwear?.id === garment.id) ||
                (activeSlot === 'Bottom' && layers.bottom?.id === garment.id) ||
                (activeSlot === 'Shoes' && layers.shoes?.id === garment.id);

              return (
                <TouchableOpacity
                  key={garment.id}
                  onPress={() => handleSelectGarmentForSlot(garment)}
                  activeOpacity={0.8}
                >
                  <GlassCard
                    variant={isSelected ? 'accent' : 'subtle'}
                    intensity={15}
                    style={[
                      styles.garmentPickCard,
                      isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={[styles.garmentColorBar, { backgroundColor: garment.colorHex }]} />
                    <View style={styles.garmentPickDetails}>
                      <Text
                        style={[styles.garmentPickName, { color: colors.primaryText }]}
                        numberOfLines={1}
                      >
                        {garment.name}
                      </Text>
                      <Text style={[styles.garmentPickMeta, { color: colors.secondaryText }]}>
                        {garment.colorName} · {garment.size}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkedBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </GlassCard>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={styles.saveBtnArea}>
          <PrimaryButton
            label={t('outfitBuilder.saveLookBtn')}
            onPress={handleSave}
            icon="bookmark-outline"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewportWrapper: {
    borderBottomWidth: 1,
  },
  layerTabsBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  layerTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  layerTabLabel: {
    ...Typography.micro,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.5,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  assignedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  assignedText: {
    ...Typography.micro,
    fontSize: 9,
    fontFamily: 'Outfit-Medium',
  },
  emptyLayerText: {
    ...Typography.micro,
    fontSize: 9,
    marginTop: 3,
  },
  catalogSection: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: Spacing.sm,
  },
  catalogTitle: {
    ...Typography.micro,
    letterSpacing: 1.2,
    fontFamily: 'Outfit-Bold',
  },
  pillCounter: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  catalogCount: {
    ...Typography.micro,
    fontSize: 10,
    fontFamily: 'Outfit-Medium',
  },
  catalogScroll: {
    paddingHorizontal: 12,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  emptySlotBox: {
    paddingVertical: Spacing.xl,
  },
  emptySlotText: {
    ...Typography.caption,
    fontFamily: 'Outfit-Regular',
  },
  garmentPickCard: {
    width: 140,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    padding: 0,
  },
  garmentColorBar: {
    height: 60,
    width: '100%',
  },
  garmentPickDetails: {
    padding: Spacing.sm,
  },
  garmentPickName: {
    ...Typography.caption,
    fontFamily: 'Outfit-SemiBold',
  },
  garmentPickMeta: {
    ...Typography.micro,
    fontSize: 9,
    marginTop: 2,
    fontFamily: 'Outfit-Regular',
  },
  checkedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnArea: {
    paddingHorizontal: 12,
    paddingBottom: 85,
    paddingTop: Spacing.sm,
  },
});
