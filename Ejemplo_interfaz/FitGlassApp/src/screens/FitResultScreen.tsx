import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { Viewport3DPlaceholder } from '../components/Viewport3DPlaceholder';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Garment, FitSettings } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface FitResultScreenProps {
  garment: Garment;
  fitSettings: FitSettings;
  onBack: () => void;
  onFineTune: () => void;
  onBuildOutfit: () => void;
}

export const FitResultScreen: React.FC<FitResultScreenProps> = ({
  garment,
  fitSettings,
  onBack,
  onFineTune,
  onBuildOutfit,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('fitResult.title')}
        subtitle={`${garment.name} · Size ${fitSettings.size}`}
        onBack={onBack}
        rightAction={{
          icon: 'checkmark',
          onPress: onBack,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 3D Viewport with highlightFit=true showing tension contours */}
        <View style={[styles.viewportWrapper, { borderBottomColor: colors.borderLight }]}>
          <Viewport3DPlaceholder
            currentGarmentName={`${garment.name} (Evaluated)`}
            highlightFit
            heightRatio={0.42}
          />
        </View>

        {/* Fit Summary Status Card */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={[styles.summaryBadge, { color: colors.tertiaryText }]}>
                {t('fitResult.scoreBadge')}
              </Text>
              <Text style={[Typography.title1, styles.overallScore, { color: colors.primaryText }]}>
                {t('fitResult.scoreValue')}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, { color: colors.primaryText }]}>
                {t('fitResult.scorePercent')}
              </Text>
            </View>
          </View>
          <Text style={[styles.summaryDesc, { color: colors.secondaryText }]}>
            {t('fitResult.scoreDesc')}
          </Text>
        </View>

        {/* Breakdown of Regions */}
        <View style={styles.detailsGroup}>
          <Text style={[styles.groupHeader, { color: colors.tertiaryText }]}>
            {t('fitResult.regionHeader')}
          </Text>

          <View style={[styles.regionRow, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.regionIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="git-commit-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.regionInfo}>
              <Text style={[styles.regionName, { color: colors.primaryText }]}>
                {t('fitResult.chestName')}
              </Text>
              <Text style={[styles.regionMetric, { color: colors.secondaryText }]}>
                {t('fitResult.chestMetric')} ({fitSettings.chest} cm)
              </Text>
            </View>
            <Text style={[styles.regionRating, { color: colors.primaryText }]}>
              {t('fitResult.chestRating')}
            </Text>
          </View>

          <View style={[styles.regionRow, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.regionIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="git-commit-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.regionInfo}>
              <Text style={[styles.regionName, { color: colors.primaryText }]}>
                {t('fitResult.waistName')}
              </Text>
              <Text style={[styles.regionMetric, { color: colors.secondaryText }]}>
                {t('fitResult.waistMetric')} ({fitSettings.waist} cm)
              </Text>
            </View>
            <Text style={[styles.regionRating, { color: colors.primaryText }]}>
              {t('fitResult.waistRating')}
            </Text>
          </View>

          <View style={[styles.regionRow, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.regionIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="git-commit-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.regionInfo}>
              <Text style={[styles.regionName, { color: colors.primaryText }]}>
                {t('fitResult.shoulderName')}
              </Text>
              <Text style={[styles.regionMetric, { color: colors.secondaryText }]}>
                {t('fitResult.shoulderMetric')} ({fitSettings.shoulders} cm)
              </Text>
            </View>
            <Text style={[styles.regionRating, { color: colors.primaryText }]}>
              {t('fitResult.shoulderRating')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <PrimaryButton
            label={t('fitResult.composeOutfit')}
            onPress={onBuildOutfit}
            icon="layers-outline"
          />
          <SecondaryButton
            label={t('fitResult.fineTune')}
            onPress={onFineTune}
            icon="options-outline"
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
  viewportWrapper: {
    borderBottomWidth: 1,
  },
  summaryCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryBadge: {
    ...Typography.micro,
    letterSpacing: 1.2,
  },
  overallScore: {
    marginTop: 2,
    fontSize: 22,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusText: {
    ...Typography.micro,
    fontSize: 9,
    fontWeight: '700',
  },
  summaryDesc: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  detailsGroup: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  groupHeader: {
    ...Typography.micro,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  regionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  regionMetric: {
    ...Typography.caption,
    marginTop: 2,
  },
  regionRating: {
    ...Typography.caption,
    fontWeight: '600',
  },
  actionButtons: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
});
