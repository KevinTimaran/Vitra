import React, { useState } from 'react';
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
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Garment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface GarmentViewScreenProps {
  garment: Garment;
  onBack: () => void;
  onTryOn: (garment: Garment) => void;
  onEdit: (garment: Garment) => void;
}

export const GarmentViewScreen: React.FC<GarmentViewScreenProps> = ({
  garment,
  onBack,
  onTryOn,
  onEdit,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [isFavorite, setIsFavorite] = useState(garment.paletteHarmony);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={garment.name}
        subtitle={`${garment.brand} · ${garment.category}`}
        onBack={onBack}
        rightAction={{
          icon: isFavorite ? 'heart' : 'heart-outline',
          onPress: () => setIsFavorite(!isFavorite),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Editorial Garment Canvas */}
        <View
          style={[
            styles.heroCanvas,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View
            style={[
              styles.colorBackdrop,
              { backgroundColor: garment.colorHex },
            ]}
          />
          <View style={styles.silhouetteSymbolBox}>
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
              size={68}
              color={garment.colorHex === '#FFFFFF' ? '#A1A1AA' : colors.primaryText}
            />
          </View>

          {/* Size Tag Floating */}
          <View
            style={[
              styles.sizeBadge,
              { backgroundColor: isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sizeBadgeText, { color: colors.primaryText }]}>
              {t('garmentView.sizeBadge')} {garment.size}
            </Text>
          </View>

          {/* Palette Harmony Stamp */}
          {garment.paletteHarmony && (
            <View
              style={[
                styles.harmonyStamp,
                { backgroundColor: isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderColor: colors.border },
              ]}
            >
              <Ionicons name="sparkles" size={12} color="#10B981" />
              <Text style={[styles.harmonyStampText, { color: colors.primaryText }]}>
                {t('garmentView.paletteHarmony')}
              </Text>
            </View>
          )}
        </View>

        {/* Primary Information Hierarchy */}
        <View style={styles.infoSection}>
          <View style={styles.brandRow}>
            <Text style={[styles.brandText, { color: colors.tertiaryText }]}>
              {garment.brand.toUpperCase()}
            </Text>
            <Text style={[styles.addedDateText, { color: colors.secondaryText }]}>
              {t('garmentView.added')} {garment.addedDate}
            </Text>
          </View>

          <Text style={[Typography.title1, styles.garmentTitle, { color: colors.primaryText }]}>
            {garment.name}
          </Text>

          {/* Key Attributes Pills */}
          <View style={styles.keyAttributesRow}>
            <View
              style={[
                styles.attrPill,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View
                style={[
                  styles.colorChip,
                  { backgroundColor: garment.colorHex },
                ]}
              />
              <Text style={[styles.attrValue, { color: colors.primaryText }]}>{garment.colorName}</Text>
            </View>

            <View
              style={[
                styles.attrPill,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.attrLabel, { color: colors.tertiaryText }]}>
                {t('garmentView.fitCut').toUpperCase()}
              </Text>
              <Text style={[styles.attrValue, { color: colors.primaryText }]}>{garment.fit}</Text>
            </View>

            <View
              style={[
                styles.attrPill,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.attrLabel, { color: colors.tertiaryText }]}>
                {t('garmentView.sizeBadge')}
              </Text>
              <Text style={[styles.attrValue, { color: colors.primaryText }]}>{garment.size}</Text>
            </View>
          </View>

          {/* Material & Construction */}
          <View
            style={[
              styles.specCard,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.specHeader, { color: colors.tertiaryText }]}>
              {t('garmentView.fabricDetails')}
            </Text>
            <Text style={[styles.specBody, { color: colors.secondaryText }]}>{garment.material}</Text>

            {garment.notes && (
              <>
                <View style={[styles.specDivider, { backgroundColor: colors.borderLight }]} />
                <Text style={[styles.specHeader, { color: colors.tertiaryText }]}>
                  {t('garmentView.editorialNotes')}
                </Text>
                <Text style={[styles.specBody, { color: colors.secondaryText }]}>{garment.notes}</Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.borderLight }]}>
        <View style={{ flex: 1, marginRight: Spacing.sm }}>
          <SecondaryButton
            label={t('garmentView.editAttributes')}
            onPress={() => onEdit(garment)}
            icon="create-outline"
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={t('garmentView.tryOn')}
            onPress={() => onTryOn(garment)}
            icon="cube-outline"
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge + 60,
  },
  heroCanvas: {
    height: 260,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  colorBackdrop: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.22,
  },
  silhouetteSymbolBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  sizeBadgeText: {
    ...Typography.micro,
    fontSize: 9,
    fontWeight: '700',
  },
  harmonyStamp: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    borderWidth: 1,
    gap: 4,
  },
  harmonyStampText: {
    ...Typography.micro,
    fontSize: 9,
    fontWeight: '700',
  },
  infoSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandText: {
    ...Typography.micro,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  addedDateText: {
    ...Typography.micro,
    fontSize: 10,
  },
  garmentTitle: {
    marginTop: 4,
  },
  keyAttributesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  attrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  colorChip: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  attrLabel: {
    ...Typography.micro,
    fontSize: 9,
    fontWeight: '700',
  },
  attrValue: {
    ...Typography.caption,
    fontWeight: '600',
  },
  specCard: {
    marginTop: Spacing.lg,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  specHeader: {
    ...Typography.micro,
    letterSpacing: 1,
    marginBottom: 4,
  },
  specBody: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  specDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
