import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius, Shadows } from '../theme';
import { Header } from '../components/Header';
import { Garment, SavedLookItem } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Viewport3DPlaceholder } from '../components/Viewport3DPlaceholder';

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
  const [selectedCategory, setSelectedCategory] = useState('Todo');

  const categories = [t('common.all'), t('common.outerwear'), t('common.tops'), t('common.pants')];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('header.brand')}
        subtitle=""
        showAvatar
        onAvatarPress={onOpenProfile}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Area */}
        <View style={styles.titleContainer}>
          <Text style={[styles.greetingText, { color: colors.secondaryText }]}>
            BUENOS DÍAS, ELENA
          </Text>
          <Text style={[Typography.largeTitle, styles.mainTitle, { color: colors.primaryText }]}>
            Tu armario,{'\n'}
            <Text style={{ fontStyle: 'italic', color: colors.secondaryText }}>perfectamente</Text>{'\n'}
            entallado.
          </Text>
        </View>

        {/* 3D Viewport Card */}
        <View style={[styles.viewportCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.viewportWrapper}>
            <Viewport3DPlaceholder heightRatio={0.4} onPressModel={onOpenFittingRoom} />
          </View>
        </View>

        {/* Wardrobe Header */}
        <View style={styles.wardrobeHeader}>
          <Ionicons name="shirt-outline" size={24} color={colors.primaryText} />
          <Text style={[Typography.title2, styles.wardrobeTitle, { color: colors.primaryText }]}>
            Tu Guardarropa
          </Text>
          <Text style={[styles.wardrobeSubtitle, { color: colors.secondaryText }]}>
            • Vistiendo: Abrigo Lana Camel
          </Text>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryPill,
                selectedCategory === cat ? { backgroundColor: colors.primaryText } : { backgroundColor: colors.surfaceSubtle }
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat ? { color: colors.bg } : { color: colors.primaryText }
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Garments Carousel */}
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
                <View style={styles.thumbCategoryTag}>
                  <Text style={styles.thumbCategoryText}>
                    {t(`common.${garment.category.toLowerCase()}`)?.toUpperCase() || garment.category.toUpperCase()}
                  </Text>
                </View>
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
                  size={42}
                  color={garment.colorHex === '#FFFFFF' ? '#A1A1AA' : garment.colorHex}
                />
                <View style={[styles.thumbColorDot, { backgroundColor: garment.colorHex }]} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  titleContainer: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  greetingText: {
    ...Typography.micro,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  viewportCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  viewportWrapper: {
    // Fill the card neatly
  },
  wardrobeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  wardrobeTitle: {
    marginLeft: Spacing.sm,
  },
  wardrobeSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    marginTop: 2,
  },
  categoriesScroll: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  horizontalScrollList: {
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.md,
  },
  garmentThumbnailCard: {
    width: 160,
    height: 200,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginRight: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  garmentThumbVisual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  garmentColorHalo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.15,
  },
  thumbCategoryTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  thumbCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#09090B',
  },
  thumbColorDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
