import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { SliderControl } from '../components/SliderControl';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { BodyProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface BodyProfileScreenProps {
  initialProfile: BodyProfile;
  onSave: (profile: BodyProfile) => void;
  onSkip: () => void;
}

export const BodyProfileScreen: React.FC<BodyProfileScreenProps> = ({
  initialProfile,
  onSave,
  onSkip,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<BodyProfile>(initialProfile);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  const updateParam = (key: keyof BodyProfile, val: number) => {
    setProfile((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Navigation / Progress */}
      <View style={styles.header}>
        <View style={styles.stepIndicatorRow}>
          <Text style={[styles.stepBadge, { color: colors.tertiaryText }]}>
            {t('bodyProfile.stepBadge')}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceSubtle }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.cta }]} />
          </View>
        </View>

        <Text style={[Typography.largeTitle, styles.title, { color: colors.primaryText }]}>
          {t('bodyProfile.title')}
        </Text>
        <Text style={[Typography.body, styles.subtitle, { color: colors.secondaryText }]}>
          {t('bodyProfile.subtitle')}
        </Text>

        {/* Unit Segmented Control */}
        <View
          style={[
            styles.segmentedContainer,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segmentItem,
              unit === 'cm' && [styles.segmentItemActive, { backgroundColor: colors.cta }],
            ]}
            onPress={() => setUnit('cm')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                { color: colors.secondaryText },
                unit === 'cm' && [styles.segmentTextActive, { color: colors.ctaText }],
              ]}
            >
              {t('bodyProfile.metric')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              unit === 'in' && [styles.segmentItemActive, { backgroundColor: colors.cta }],
            ]}
            onPress={() => setUnit('in')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                { color: colors.secondaryText },
                unit === 'in' && [styles.segmentTextActive, { color: colors.ctaText }],
              ]}
            >
              {t('bodyProfile.imperial')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Measurement Forms List */}
      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Silhouette Calibration Preview Badge */}
        <View
          style={[
            styles.ratioCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={[styles.ratioIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="finger-print-outline" size={20} color={colors.primaryText} />
          </View>
          <View style={styles.ratioInfo}>
            <Text style={[styles.ratioTitle, { color: colors.primaryText }]}>
              {t('bodyProfile.calibrationBadge')}
            </Text>
            <Text style={[styles.ratioDesc, { color: colors.secondaryText }]}>
              {t('bodyProfile.calibrationDesc')}
            </Text>
          </View>
        </View>

        {/* Sliders for measurements */}
        <SliderControl
          label={t('bodyProfile.height')}
          value={profile.height}
          unit={unit}
          min={140}
          max={210}
          step={1}
          onChange={(val) => updateParam('height', val)}
          leftLabel="140"
          rightLabel="210"
        />

        <SliderControl
          label={t('bodyProfile.chest')}
          value={profile.chest}
          unit={unit}
          min={75}
          max={130}
          step={1}
          onChange={(val) => updateParam('chest', val)}
          leftLabel="75"
          rightLabel="130"
        />

        <SliderControl
          label={t('bodyProfile.waist')}
          value={profile.waist}
          unit={unit}
          min={60}
          max={120}
          step={1}
          onChange={(val) => updateParam('waist', val)}
          leftLabel="60"
          rightLabel="120"
        />

        <SliderControl
          label={t('bodyProfile.hips')}
          value={profile.hips}
          unit={unit}
          min={75}
          max={135}
          step={1}
          onChange={(val) => updateParam('hips', val)}
          leftLabel="75"
          rightLabel="135"
        />

        <SliderControl
          label={t('bodyProfile.shoulders')}
          value={profile.shoulderWidth}
          unit={unit}
          min={35}
          max={60}
          step={1}
          onChange={(val) => updateParam('shoulderWidth', val)}
          leftLabel="35"
          rightLabel="60"
        />
      </ScrollView>

      {/* Action Footer */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.borderLight }]}>
        <PrimaryButton
          label={t('bodyProfile.saveProfile')}
          onPress={() => onSave(profile)}
          icon="checkmark-outline"
        />
        <TextButton
          label={t('bodyProfile.skip')}
          onPress={onSkip}
          style={{ marginTop: Spacing.xs }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    ...Typography.micro,
    letterSpacing: 1.2,
  },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '50%',
    height: '100%',
  },
  title: {
    marginTop: Spacing.xs,
  },
  subtitle: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  segmentItemActive: {},
  segmentText: {
    ...Typography.subhead,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  ratioCard: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  ratioIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  ratioInfo: {
    flex: 1,
  },
  ratioTitle: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ratioDesc: {
    ...Typography.micro,
    marginTop: 2,
    lineHeight: 14,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
