import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { PrimaryButton } from '../components/Buttons';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface GarmentProcessingScreenProps {
  onComplete: () => void;
}

export const GarmentProcessingScreen: React.FC<GarmentProcessingScreenProps> = ({
  onComplete,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStepIndex(2), 1100);
    const timer2 = setTimeout(() => setCurrentStepIndex(3), 2200);
    const timer3 = setTimeout(() => {
      setCurrentStepIndex(4);
      setIsFinished(true);
    }, 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const STEPS = [
    { id: 1, label: t('garmentProcessing.step1'), detail: t('garmentProcessing.step1Desc') },
    { id: 2, label: t('garmentProcessing.step2'), detail: t('garmentProcessing.step2Desc') },
    { id: 3, label: t('garmentProcessing.step3'), detail: t('garmentProcessing.step3Desc') },
    { id: 4, label: t('garmentProcessing.step4'), detail: t('garmentProcessing.step4Desc') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={[styles.badgeText, { color: colors.tertiaryText }]}>
          {t('garmentProcessing.badge')}
        </Text>
        <Text style={[Typography.largeTitle, styles.title, { color: colors.primaryText }]}>
          {t('garmentProcessing.title')}
        </Text>
        <Text style={[Typography.body, styles.subtitle, { color: colors.secondaryText }]}>
          {t('garmentProcessing.subtitle')}
        </Text>
      </View>

      {/* Visual Progress Disc */}
      <View style={styles.centerGraphicArea}>
        <View style={[styles.outerRing, { borderColor: colors.borderLight }]}>
          <View style={[styles.innerBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons
              name={isFinished ? 'checkmark-circle-outline' : 'scan-outline'}
              size={48}
              color={colors.primaryText}
            />
          </View>
        </View>

        <View style={styles.progressPercentRow}>
          {!isFinished ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
          )}
          <Text style={[styles.percentText, { color: colors.secondaryText }]}>
            {isFinished ? t('garmentProcessing.complete') : `${t('common.step')} 0${currentStepIndex} / 04`}
          </Text>
        </View>
      </View>

      {/* Steps List */}
      <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isDone = currentStepIndex > stepNumber || isFinished;
          const isCurrent = currentStepIndex === stepNumber && !isFinished;

          return (
            <View key={step.id} style={styles.stepRow}>
              <View
                style={[
                  styles.stepStatusDot,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  isDone && [styles.stepStatusDotDone, { backgroundColor: colors.cta, borderColor: colors.cta }],
                  isCurrent && [styles.stepStatusDotActive, { borderColor: colors.primaryText }],
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={12} color={colors.ctaText} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumberText,
                      { color: colors.tertiaryText },
                      isCurrent && { color: colors.primaryText },
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>

              <View style={styles.stepInfo}>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: colors.tertiaryText },
                    (isDone || isCurrent) && [styles.stepLabelActive, { color: colors.primaryText }],
                  ]}
                >
                  {step.label}
                </Text>
                <Text style={[styles.stepDetail, { color: colors.secondaryText }]}>{step.detail}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <PrimaryButton
          label={isFinished ? t('garmentProcessing.viewExtracted') : '...'}
          onPress={onComplete}
          disabled={!isFinished}
          icon={isFinished ? 'arrow-forward' : undefined}
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingTop: Spacing.md,
  },
  badgeText: {
    ...Typography.micro,
    letterSpacing: 1.2,
  },
  title: {
    marginTop: Spacing.xs,
  },
  subtitle: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  centerGraphicArea: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  outerRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.lg,
  },
  percentText: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepsCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepStatusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: Spacing.md,
  },
  stepStatusDotDone: {},
  stepStatusDotActive: {
    borderWidth: 2,
  },
  stepNumberText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  stepLabelActive: {
    fontWeight: '600',
  },
  stepDetail: {
    ...Typography.micro,
    fontSize: 10,
    marginTop: 1,
  },
  footer: {
    paddingBottom: Spacing.sm,
  },
});
