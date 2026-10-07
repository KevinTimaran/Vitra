import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Garment } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';

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
  const { t } = useTranslation();
  
  const translatedCategory = t(`common.${garment.category.toLowerCase()}`) || garment.category;
  const translatedColor = t(`color.${garment.colorName}`) || garment.colorName;
  const translatedFit = t(`fit.${garment.fit}`) || garment.fit;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Visual Product Object Area */}
      <View style={styles.imageCanvas}>
        {/* Abstract Architectural Garment Silhouette */}
        <View style={styles.silhouetteCanvas}>
          <View
            style={[
              styles.colorSwatchBlock,
              { backgroundColor: garment.colorHex },
            ]}
          />
          <View style={styles.productShapeWrapper}>
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
              color={garment.colorHex === '#FFFFFF' ? '#A1A1AA' : '#3F3F46'}
            />
          </View>
        </View>

        {/* Favorite Action */}
        {onFavoriteToggle && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={onFavoriteToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={isFavorite ? Colors.primaryText : Colors.secondaryText}
            />
          </TouchableOpacity>
        )}

        {/* Size Badge */}
        <View style={styles.sizeBadge}>
          <Text style={styles.sizeText}>{garment.size}</Text>
        </View>
      </View>

      {/* Editorial Content */}
      <View style={styles.infoArea}>
        <Text style={[Typography.subhead, styles.name]} numberOfLines={1}>
          {garment.name}
        </Text>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: garment.colorHex },
            ]}
          />
          <Text style={[Typography.caption, styles.metaText]} numberOfLines={1}>
            {translatedCategory} · {translatedColor}
          </Text>
        </View>
        <Text style={[Typography.caption, styles.brandText]}>
          {garment.brand} · {translatedFit}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  imageCanvas: {
    height: 160,
    backgroundColor: Colors.surfaceSubtle,
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
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  sizeText: {
    ...Typography.micro,
    color: Colors.primaryText,
  },
  infoArea: {
    padding: Spacing.md,
  },
  name: {
    color: Colors.primaryText,
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
    borderColor: Colors.border,
  },
  metaText: {
    color: Colors.secondaryText,
    flex: 1,
  },
  brandText: {
    color: Colors.tertiaryText,
    marginTop: 2,
    fontSize: 11,
  },
});
