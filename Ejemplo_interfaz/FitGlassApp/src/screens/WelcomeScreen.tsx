import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onSignIn,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header / Brand Stamp */}
      <View style={styles.topHeader}>
        <Text style={[styles.brandBadge, { color: colors.tertiaryText }]}>
          {t('welcome.brandBadge')}
        </Text>
      </View>

      {/* Main Brand Area */}
      <View style={styles.brandSection}>
        <Text style={[styles.wordmark, { color: colors.primaryText }]}>
          {t('welcome.wordmark')}
        </Text>
        <Text style={[styles.tagline, { color: colors.secondaryText }]}>
          {t('welcome.tagline')}
        </Text>
      </View>

      {/* Abstract Minimal Visual Canvas (Digital Wardrobe + Precision Fit) */}
      <View
        style={[
          styles.visualCanvas,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        {/* Subtle grid lines */}
        <View style={styles.gridBox}>
          <View style={[styles.gridLineV, { backgroundColor: colors.borderLight }]} />
          <View style={[styles.gridLineV, { left: '70%', backgroundColor: colors.borderLight }]} />
          <View style={[styles.gridLineH, { backgroundColor: colors.borderLight }]} />
          <View style={[styles.gridLineH, { top: '65%', backgroundColor: colors.borderLight }]} />
        </View>

        {/* Abstract Silhouette & Caliper Measurement Graphic */}
        <View style={styles.abstractFigureWrapper}>
          <View style={[styles.abstractHead, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]} />
          <View style={[styles.abstractTorso, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <View style={[styles.measurementRing, { borderColor: colors.secondaryText }]} />
            <View style={[styles.measurementRing, { top: 48, width: 78, borderColor: colors.secondaryText }]} />
          </View>
          <View style={[styles.verticalAxis, { backgroundColor: colors.border }]} />
          {/* Caliper ticks */}
          <View style={[styles.caliperTick, { top: 70, left: 10, backgroundColor: colors.primaryText }]} />
          <View style={[styles.caliperTick, { top: 70, right: 10, backgroundColor: colors.primaryText }]} />
          <View style={[styles.caliperTick, { top: 110, left: 18, backgroundColor: colors.primaryText }]} />
          <View style={[styles.caliperTick, { top: 110, right: 18, backgroundColor: colors.primaryText }]} />
        </View>

        {/* Floating Calibration Stamp */}
        <View
          style={[
            styles.calibrationTag,
            { backgroundColor: isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderColor: colors.border },
          ]}
        >
          <Ionicons name="scan-outline" size={13} color={colors.primaryText} />
          <Text style={[styles.calibrationText, { color: colors.primaryText }]}>
            {t('welcome.calibration')}
          </Text>
        </View>
      </View>

      {/* Pillars / Feature Highlights */}
      <View style={styles.featuresRow}>
        <View style={styles.featureItem}>
          <Text style={[styles.featureIndex, { color: colors.tertiaryText }]}>01</Text>
          <Text style={[styles.featureTitle, { color: colors.primaryText }]}>
            {t('welcome.feature1Title')}
          </Text>
          <Text style={[styles.featureDesc, { color: colors.secondaryText }]}>
            {t('welcome.feature1Desc')}
          </Text>
        </View>
        <View style={[styles.featureDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.featureItem}>
          <Text style={[styles.featureIndex, { color: colors.tertiaryText }]}>02</Text>
          <Text style={[styles.featureTitle, { color: colors.primaryText }]}>
            {t('welcome.feature2Title')}
          </Text>
          <Text style={[styles.featureDesc, { color: colors.secondaryText }]}>
            {t('welcome.feature2Desc')}
          </Text>
        </View>
        <View style={[styles.featureDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.featureItem}>
          <Text style={[styles.featureIndex, { color: colors.tertiaryText }]}>03</Text>
          <Text style={[styles.featureTitle, { color: colors.primaryText }]}>
            {t('welcome.feature3Title')}
          </Text>
          <Text style={[styles.featureDesc, { color: colors.secondaryText }]}>
            {t('welcome.feature3Desc')}
          </Text>
        </View>
      </View>

      {/* Action Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          label={t('welcome.getStarted')}
          onPress={onGetStarted}
          icon="arrow-forward"
        />
        <TextButton
          label={t('welcome.haveAccount')}
          onPress={onSignIn}
          style={{ marginTop: Spacing.xs }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  topHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  brandBadge: {
    ...Typography.micro,
    letterSpacing: 1.5,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  wordmark: {
    fontFamily: 'System',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 6,
  },
  tagline: {
    ...Typography.callout,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 260,
    lineHeight: 20,
  },
  visualCanvas: {
    height: 220,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridBox: {
    ...StyleSheet.absoluteFill,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '30%',
    width: StyleSheet.hairlineWidth,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '35%',
    height: StyleSheet.hairlineWidth,
  },
  abstractFigureWrapper: {
    alignItems: 'center',
    position: 'relative',
    height: 140,
    width: 100,
    justifyContent: 'center',
  },
  abstractHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  abstractTorso: {
    width: 66,
    height: 90,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  measurementRing: {
    position: 'absolute',
    top: 24,
    width: 72,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  verticalAxis: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  caliperTick: {
    position: 'absolute',
    width: 8,
    height: 1,
  },
  calibrationTag: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    borderWidth: 1,
    gap: 5,
  },
  calibrationText: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  featureDivider: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    marginTop: 6,
  },
  featureIndex: {
    ...Typography.micro,
    fontWeight: '700',
  },
  featureTitle: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  featureDesc: {
    ...Typography.micro,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
  footer: {
    paddingBottom: Spacing.sm,
  },
});
