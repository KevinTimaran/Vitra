import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { PrimaryButton } from '../components/Buttons';
import { Garment } from '../types';
import { GarmentAnalysis } from '../services/ai/types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface GarmentDetailsScreenProps {
  initialAnalysis: GarmentAnalysis | null;
  onSaveToWardrobe: (newGarment: Garment) => void;
  onCancel: () => void;
}

export const GarmentDetailsScreen: React.FC<GarmentDetailsScreenProps> = ({
  initialAnalysis,
  onSaveToWardrobe,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [name, setName] = useState('Analyzed Garment');
  const [category, setCategory] = useState<'Tops' | 'Outerwear' | 'Pants' | 'Shoes' | 'Accessories'>(
    (initialAnalysis?.category as any) || 'Outerwear'
  );
  const [brand, setBrand] = useState('Unknown Brand');
  const [material, setMaterial] = useState('Unknown Material');

  const defaultColorHex = initialAnalysis?.dominantColor || '#27272A';
  const defaultColorName = initialAnalysis?.dominantColor ? 'Extracted Color' : 'Anthracite Fog';

  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string }>({
    name: defaultColorName,
    hex: defaultColorHex,
  });
  const [size, setSize] = useState<'XS' | 'S' | 'M' | 'L' | 'XL'>('M');
  const [fit, setFit] = useState<'Slim' | 'Regular' | 'Relaxed' | 'Oversized'>(
    (initialAnalysis?.fit as any) || 'Relaxed'
  );
  const [notes, setNotes] = useState('AI analyzed attributes applied.');

  const colorCandidates = [
    { name: defaultColorName, hex: defaultColorHex },
    { name: 'Anthracite Fog', hex: '#27272A' },
    { name: 'Slate Umber', hex: '#3F3F46' },
    { name: 'Cool Greige', hex: '#71717A' },
    { name: 'Mineral White', hex: '#F4F4F5' },
  ];

  const handleSave = () => {
    const garment: Garment = {
      id: `g-${Date.now()}`,
      name,
      category,
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      size,
      fit,
      brand,
      material,
      addedDate: t('common.today'),
      notes,
      silhouetteType: category === 'Tops' ? 'tshirt' : category === 'Outerwear' ? 'jacket' : 'trousers',
      paletteHarmony: true,
    };
    onSaveToWardrobe(garment);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('garmentDetails.title')}
        subtitle={t('garmentDetails.subtitle')}
        onBack={onCancel}
        rightAction={{
          label: t('common.save'),
          onPress: handleSave,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Garment Canvas / Image Object Area */}
        <View
          style={[
            styles.garmentCanvas,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View
            style={[
              styles.colorHalo,
              { backgroundColor: selectedColor.hex },
            ]}
          />
          <View style={styles.silhouetteSymbolBox}>
            <Ionicons
              name={category === 'Outerwear' ? 'layers-outline' : 'shirt-outline'}
              size={54}
              color={selectedColor.hex === '#FFFFFF' ? '#A1A1AA' : colors.primaryText}
            />
          </View>

          <View style={[styles.matteTag, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={[styles.matteTagText, { color: colors.primaryText }]}>
              {t('garmentDetails.matteTag')}
            </Text>
          </View>
        </View>

        {/* Editable Form Group */}
        <View style={styles.formSection}>
          {/* Garment Name Field */}
          <Text style={[styles.fieldLabel, { color: colors.tertiaryText }]}>
            {t('garmentDetails.nameLabel')}
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.primaryText }]}
            value={name}
            onChangeText={setName}
            placeholder={t('garmentDetails.nameLabel')}
            placeholderTextColor={colors.tertiaryText}
          />

          {/* Category Selector */}
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('garmentDetails.categoryLabel')}
          </Text>
          <View style={styles.pillsRow}>
            {(['Tops', 'Outerwear', 'Pants', 'Shoes', 'Accessories'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  category === cat && [styles.pillActive, { backgroundColor: colors.cta, borderColor: colors.cta }],
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: colors.secondaryText },
                    category === cat && [styles.pillTextActive, { color: colors.ctaText }],
                  ]}
                >
                  {cat === 'Tops'
                    ? t('common.tops')
                    : cat === 'Outerwear'
                    ? t('common.outerwear')
                    : cat === 'Pants'
                    ? t('common.pants')
                    : cat === 'Shoes'
                    ? t('common.shoes')
                    : t('common.accessories')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Color Extraction Swatches */}
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('garmentDetails.colorLabel')} ({selectedColor.name})
          </Text>
          <View style={styles.swatchesRow}>
            {colorCandidates.map((c) => {
              const isSelected = selectedColor.hex === c.hex;
              return (
                <TouchableOpacity
                  key={c.hex}
                  style={[
                    styles.swatchWrap,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    isSelected && [styles.swatchWrapSelected, { borderColor: colors.primaryText, backgroundColor: colors.surfaceSubtle }],
                  ]}
                  onPress={() => setSelectedColor(c)}
                >
                  <View style={[styles.swatchDot, { backgroundColor: c.hex }]} />
                  <Text style={[styles.swatchTitle, { color: colors.primaryText }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Size Selector */}
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('garmentDetails.sizeLabel')}
          </Text>
          <View style={styles.pillsRow}>
            {(['XS', 'S', 'M', 'L', 'XL'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.pill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  size === s && [styles.pillActive, { backgroundColor: colors.cta, borderColor: colors.cta }],
                ]}
                onPress={() => setSize(s)}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: colors.secondaryText },
                    size === s && [styles.pillTextActive, { color: colors.ctaText }],
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fit Cut Selector */}
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('garmentDetails.fitLabel')}
          </Text>
          <View style={styles.pillsRow}>
            {(['Slim', 'Regular', 'Relaxed', 'Oversized'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.pill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  fit === f && [styles.pillActive, { backgroundColor: colors.cta, borderColor: colors.cta }],
                ]}
                onPress={() => setFit(f)}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: colors.secondaryText },
                    fit === f && [styles.pillTextActive, { color: colors.ctaText }],
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Brand & Material */}
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('garmentDetails.brandLabel')}
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.primaryText }]}
            value={brand}
            onChangeText={setBrand}
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('garmentDetails.materialLabel')}
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.primaryText }]}
            value={material}
            onChangeText={setMaterial}
          />

          {/* Editorial Notes */}
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('garmentDetails.notesLabel')}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                height: 72,
                textAlignVertical: 'top',
                paddingTop: Spacing.sm,
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                color: colors.primaryText,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <PrimaryButton
            label={t('garmentDetails.save')}
            onPress={handleSave}
            style={{ marginTop: Spacing.xl }}
          />
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
  garmentCanvas: {
    height: 180,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  colorHalo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.25,
  },
  silhouetteSymbolBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  matteTag: {
    position: 'absolute',
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    gap: 4,
  },
  matteTagText: {
    ...Typography.micro,
    fontSize: 9,
    fontWeight: '700',
  },
  formSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  fieldLabel: {
    ...Typography.micro,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  textInput: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.subhead,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  pillActive: {},
  pillText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  pillTextActive: {
    fontWeight: '700',
  },
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  swatchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 6,
  },
  swatchWrapSelected: {
    borderWidth: 1.5,
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  swatchTitle: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '500',
  },
});
