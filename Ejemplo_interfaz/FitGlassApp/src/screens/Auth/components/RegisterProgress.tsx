import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../../../theme';
import { useTranslation } from '../../../contexts/LanguageContext';
import type { RegisterStage } from '../hooks/useAuthFlow';

interface Props {
  stage: RegisterStage;
  /** Hay foto de rostro: se analiza la colorimetría. */
  hasFace: boolean;
  /** Hay foto de cuerpo: el avatar 3D se creará en segundo plano. */
  hasBody: boolean;
}

const STAGE_ORDER: RegisterStage[] = ['account', 'profile', 'finishing'];
const STAGE_PROGRESS: Record<RegisterStage, number> = { idle: 0.05, account: 0.25, profile: 0.6, finishing: 0.92 };

/**
 * Pantalla de progreso del registro (la fase rápida: cuenta, perfil y colorimetría). Sustituye al botón girando.
 * El avatar 3D ya no se espera aquí: se crea en segundo plano y se avisa de que se puede jugar mientras tanto.
 */
export const RegisterProgress: React.FC<Props> = ({ stage, hasFace, hasBody }) => {
  const { t } = useTranslation();
  const progress = useRef(new Animated.Value(STAGE_PROGRESS[stage])).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: STAGE_PROGRESS[stage], duration: 600, useNativeDriver: false }).start();
  }, [stage, progress]);

  const steps = [
    { key: 'account' as const, title: t('regprog.account'), detail: t('regprog.accountDetail') },
    {
      key: 'profile' as const,
      title: hasFace ? t('regprog.color') : t('regprog.profile'),
      detail: hasFace ? t('regprog.colorDetail') : t('regprog.profileDetail'),
    },
    {
      key: 'finishing' as const,
      title: t('regprog.space'),
      detail: hasBody ? t('regprog.spaceAvatar') : t('regprog.spaceDefault'),
    },
  ];
  const currentIndex = Math.max(0, STAGE_ORDER.indexOf(stage));

  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="sparkles" size={34} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{t('regprog.title')}</Text>
      <Text style={styles.subtitle}>{t('regprog.subtitle')}</Text>

      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : active ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, !done && !active && styles.stepPending]}>{step.title}</Text>
                {active ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>

      {hasBody ? (
        <View style={styles.tip}>
          <Ionicons name="game-controller" size={18} color={Colors.primary} />
          <Text style={styles.tipText}>
            {t('regprog.tipBefore')}
            <Text style={styles.tipStrong}>{t('regprog.tipStrong')}</Text>
            {t('regprog.tipAfter')}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: 4,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xs,
  },
  title: { ...Typography.title2, fontFamily: Typography.bodoni.bold, fontWeight: '700', color: Colors.primaryText, textAlign: 'center' },
  subtitle: { ...Typography.body, fontFamily: Typography.outfit.regular, color: Colors.secondaryText, textAlign: 'center' },
  track: { width: '100%', height: 6, borderRadius: 3, backgroundColor: Colors.surfaceSubtle, overflow: 'hidden', marginTop: Spacing.sm },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  steps: { width: '100%', gap: Spacing.sm, marginTop: Spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  dotDone: { backgroundColor: '#8EB6C7' },
  dotActive: { backgroundColor: Colors.primary },
  stepTitle: { fontFamily: Typography.outfit.semiBold, fontSize: 15, fontWeight: '600', color: Colors.primaryText },
  stepPending: { color: Colors.tertiaryText, fontWeight: '400' },
  stepDetail: { fontFamily: Typography.outfit.regular, fontSize: 12, color: Colors.secondaryText, marginTop: 2 },
  tip: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  tipText: { flex: 1, fontFamily: Typography.outfit.regular, fontSize: 12, lineHeight: 18, color: Colors.secondaryText },
  tipStrong: { fontFamily: Typography.outfit.semiBold, fontWeight: '700', color: Colors.primaryText },
});
