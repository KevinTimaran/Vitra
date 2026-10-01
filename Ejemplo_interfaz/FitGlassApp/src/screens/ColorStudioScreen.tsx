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
import { COLOR_PALETTE_DATA } from '../data/mockData';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface ColorStudioScreenProps {
  onViewRecommendations: () => void;
  onOpenProfile: () => void;
}

export const ColorStudioScreen: React.FC<ColorStudioScreenProps> = ({
  onViewRecommendations,
  onOpenProfile,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [analyzing, setAnalyzing] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const handleReanalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('colorStudio.title')}
        subtitle={t('colorStudio.subtitle')}
        showAvatar
        onAvatarPress={onOpenProfile}
        rightAction={{
          icon: 'refresh-outline',
          onPress: handleReanalyze,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Abstract Face Analysis Placeholder Graphic */}
        <View
          style={[
            styles.abstractAnalysisCanvas,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          {/* Chromatic Matrix Grid */}
          <View style={styles.chromaGrid}>
            <View style={[styles.chromaRingOuter, { borderColor: colors.border }]} />
            <View style={[styles.chromaRingInner, { borderColor: colors.borderLight }]} />
          </View>

          {/* Neutral Abstract Silhouette Head Profile */}
          <View style={styles.neutralHeadPlaceholder}>
            <View
              style={[
                styles.abstractSilhouetteShape,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.secondaryText },
              ]}
            />
            {/* Spectral Crosshairs */}
            <View style={[styles.targetReticle, { borderColor: colors.primaryText }]} />
            <View style={styles.spectrumBar}>
              <View style={[styles.spectrumDot, { backgroundColor: '#E2D3C4', borderColor: colors.border }]} />
              <View style={[styles.spectrumDot, { backgroundColor: '#71717A', borderColor: colors.border }]} />
              <View style={[styles.spectrumDot, { backgroundColor: '#18181B', borderColor: colors.border }]} />
            </View>
          </View>

          <View
            style={[
              styles.calibrationStamp,
              { backgroundColor: isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(255, 255, 255, 0.92)', borderColor: colors.border },
            ]}
          >
            <Ionicons name="sparkles" size={12} color={colors.primaryText} />
            <Text style={[styles.stampText, { color: colors.primaryText }]}>
              {t('colorStudio.calibration')} · {COLOR_PALETTE_DATA.undertone.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* User's Skin & Undertone Core Profile */}
        <View
          style={[
            styles.profileSummaryCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.toneRow}>
            <View
              style={[
                styles.skinSwatchBig,
                { backgroundColor: COLOR_PALETTE_DATA.skinTone.hex, borderColor: colors.border },
              ]}
            />
            <View style={styles.toneInfo}>
              <Text style={[styles.tonePreheader, { color: colors.tertiaryText }]}>
                {t('colorStudio.primarySkin')}
              </Text>
              <Text style={[Typography.title2, styles.toneTitle, { color: colors.primaryText }]}>
                {COLOR_PALETTE_DATA.skinTone.name}
              </Text>
              <Text style={[styles.undertoneDesc, { color: colors.secondaryText }]}>
                {t('colorStudio.undertone')}: {COLOR_PALETTE_DATA.undertone} · {t('colorStudio.contrast')}: {COLOR_PALETTE_DATA.contrastLevel}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Complementary Palette */}
        <View style={styles.paletteSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              {t('colorStudio.complementaryTitle')}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
              {t('colorStudio.complementarySubtitle')}
            </Text>
          </View>
          <View style={styles.chipsGrid}>
            {COLOR_PALETTE_DATA.complementary.map((color) => {
              const isSelected = activeChip === color.hex;
              return (
                <TouchableOpacity
                  key={color.hex}
                  style={[
                    styles.colorChipCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    isSelected && [styles.colorChipCardActive, { borderColor: colors.primaryText, backgroundColor: colors.surfaceSubtle }],
                  ]}
                  onPress={() => setActiveChip(color.hex)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.chipColorBlock, { backgroundColor: color.hex }]} />
                  <Text style={[styles.chipName, { color: colors.primaryText }]} numberOfLines={1}>
                    {color.name}
                  </Text>
                  <Text style={[styles.chipHex, { color: colors.tertiaryText }]}>{color.hex}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Neutral Palette */}
        <View style={styles.paletteSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              {t('colorStudio.neutralTitle')}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
              {t('colorStudio.neutralSubtitle')}
            </Text>
          </View>
          <View style={styles.chipsGrid}>
            {COLOR_PALETTE_DATA.neutral.map((color) => {
              const isSelected = activeChip === color.hex;
              return (
                <TouchableOpacity
                  key={color.hex}
                  style={[
                    styles.colorChipCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    isSelected && [styles.colorChipCardActive, { borderColor: colors.primaryText, backgroundColor: colors.surfaceSubtle }],
                  ]}
                  onPress={() => setActiveChip(color.hex)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.chipColorBlock,
                      { backgroundColor: color.hex },
                      (color.hex === '#F4F4F5' || color.hex === '#E4E4E7') && {
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                  <Text style={[styles.chipName, { color: colors.primaryText }]} numberOfLines={1}>
                    {color.name}
                  </Text>
                  <Text style={[styles.chipHex, { color: colors.tertiaryText }]}>{color.hex}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Accent Palette */}
        <View style={styles.paletteSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              {t('colorStudio.accentTitle')}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
              {t('colorStudio.accentSubtitle')}
            </Text>
          </View>
          <View style={styles.chipsGrid}>
            {COLOR_PALETTE_DATA.accent.map((color) => {
              const isSelected = activeChip === color.hex;
              return (
                <TouchableOpacity
                  key={color.hex}
                  style={[
                    styles.colorChipCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    isSelected && [styles.colorChipCardActive, { borderColor: colors.primaryText, backgroundColor: colors.surfaceSubtle }],
                  ]}
                  onPress={() => setActiveChip(color.hex)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.chipColorBlock, { backgroundColor: color.hex }]} />
                  <Text style={[styles.chipName, { color: colors.primaryText }]} numberOfLines={1}>
                    {color.name}
                  </Text>
                  <Text style={[styles.chipHex, { color: colors.tertiaryText }]}>{color.hex}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <PrimaryButton
            label={t('colorStudio.viewRecommendations')}
            onPress={onViewRecommendations}
            icon="arrow-forward"
          />
          <SecondaryButton
            label={analyzing ? t('colorStudio.recalibrate') : t('colorStudio.analyzeAgain')}
            onPress={handleReanalyze}
            loading={analyzing}
            icon="scan-outline"
            style={{ marginTop: Spacing.sm }}
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
  abstractAnalysisCanvas: {
    height: 190,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  chromaGrid: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromaRingOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chromaRingInner: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
  },
  neutralHeadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  abstractSilhouetteShape: {
    width: 64,
    height: 80,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  targetReticle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  spectrumBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  spectrumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  calibrationStamp: {
    position: 'absolute',
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  stampText: {
    ...Typography.micro,
    fontSize: 9,
  },
  profileSummaryCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skinSwatchBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.lg,
    borderWidth: 2,
  },
  toneInfo: {
    flex: 1,
  },
  tonePreheader: {
    ...Typography.micro,
    letterSpacing: 1,
  },
  toneTitle: {
    marginTop: 2,
  },
  undertoneDesc: {
    ...Typography.caption,
    marginTop: 2,
    fontSize: 11,
  },
  paletteSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  sectionHeaderRow: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title2,
    fontSize: 16,
  },
  sectionSubtitle: {
    ...Typography.caption,
    fontSize: 11,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorChipCard: {
    flex: 1,
    minWidth: 70,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  colorChipCardActive: {},
  chipColorBlock: {
    width: '100%',
    height: 28,
    borderRadius: 4,
    marginBottom: 6,
  },
  chipName: {
    ...Typography.micro,
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'none',
    fontWeight: '600',
  },
  chipHex: {
    ...Typography.caption,
    fontSize: 9,
    marginTop: 1,
  },
  actionButtons: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
});
