import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Garment } from '../types';
import { Typography, Spacing, Radius, Shadows } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

import { GlassCard } from './GlassCard';

interface GarmentCardProps {
  garment: Garment;
  onPress: () => void;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
}

export const GarmentCard: React.FC<GarmentCardProps> = ({
  garment,
  onPress,
  onFavoriteToggle,
  isFavorite = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const translatedCategory = t(`common.${garment.category.toLowerCase()}`) || garment.category;
  const translatedColor = t(`color.${garment.colorName}`) || garment.colorName;
  const translatedFit = t(`fit.${garment.fit}`) || garment.fit;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{ marginBottom: Spacing.sm }}
    >
      <GlassCard
        borderRadius={Radius.default}
        style={styles.card}
      >
      {/* Visual Product Object Area */}
      <View style={[styles.imageCanvas, { backgroundColor: colors.surfaceSubtle }]}>
        {garment.imageUrl ? (
          <Image source={{ uri: garment.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={styles.silhouetteCanvas}>
            <View
              style={[
                styles.colorSwatchBlock,
                { backgroundColor: garment.colorHex },
              ]}
            />
            <View
              style={[
                styles.productShapeWrapper,
                {
                  backgroundColor: isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name={
                  garment.category === 'Tops'
                    ? 'shirt-outline'
                    : garment.category === 'Outerwear'
                    ? 'layers-outline'
                    : garment.category === 'Pants'
                    ? 'reorder-two-outline'
                    : garment.category === 'Shoes'
                    ? 'footsteps-outline'
                    : 'sparkles-outline'
                }
                size={36}
                color={colors.primaryText}
              />
            </View>
          </View>
        )}

        {/* Favorite Action */}
        {onFavoriteToggle && (
          <TouchableOpacity
            style={[
              styles.favoriteButton,
              { backgroundColor: isDark ? 'rgba(24, 24, 27, 0.85)' : 'rgba(255, 255, 255, 0.85)' },
            ]}
            onPress={onFavoriteToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={isFavorite ? '#EF4444' : colors.secondaryText}
            />
          </TouchableOpacity>
        )}

        {/* Size Badge */}
        <View
          style={[
            styles.sizeBadge,
            {
              backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sizeText, { color: colors.primaryText }]}>{garment.size}</Text>
        </View>
      </View>

      {/* Editorial Content */}
      <View style={styles.infoArea}>
        <Text style={[Typography.subhead, { color: colors.primaryText, fontWeight: '600' }]} numberOfLines={1}>
          {garment.name}
        </Text>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: garment.colorHex, borderColor: colors.border },
            ]}
          />
          <Text style={[Typography.caption, { color: colors.secondaryText, flex: 1 }]} numberOfLines={1}>
            {translatedCategory} · {translatedColor}
          </Text>
        </View>
        <Text style={[Typography.caption, { color: colors.tertiaryText, marginTop: 2, fontSize: 11 }]}>
          {garment.brand} · {translatedFit}
        </Text>
      </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.default,
    overflow: 'hidden',
  },
  imageCanvas: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  silhouetteCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  colorSwatchBlock: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    opacity: 0.18,
  },
  productShapeWrapper: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sizeText: {
    ...Typography.micro,
  },
  infoArea: {
    padding: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
  },
});
