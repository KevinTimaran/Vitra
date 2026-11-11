import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '../contexts/JobsContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Job } from '../services/jobs/jobStore.ts';
import { gamePalette } from '../theme/gamePalette';
import { useTranslation } from '../contexts/LanguageContext';
import { errorText } from '../services/jobs/jobErrors.ts';

interface Props {
  /** Reabre la pantalla de espera de un trabajo en marcha. */
  onOpenJob: (job: Job) => void;
  /** Lleva al resultado de un trabajo terminado (armario, probador, perfil...). */
  onViewResult: (job: Job) => void;
  /** Reintenta un trabajo fallido (vuelve a la pantalla que lo originó). */
  onRetry?: (job: Job) => void;
  /** Abre la pantalla del juego para un trabajo en marcha. */
  onPlay?: (job: Job) => void;
}


const DONE_AUTO_HIDE_MS = 15000;

const JobImage: React.FC<{ uri?: string; size: number; color: string }> = ({ uri, size, color }) =>
  uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '22' }}>
      <Ionicons name="cube-outline" size={size * 0.55} color={color} />
    </View>
  );

/**
 * Capa global sobre la navegación:
 *  - píldora de progreso mientras se genera un modelo 3D en segundo plano;
 *  - tarjeta tipo notificación cuando termina ("Tu modelo ya está listo") o falla.
 */
export const JobsOverlay: React.FC<Props> = ({ onOpenJob, onViewResult, onRetry, onPlay }) => {
  const { jobs, foregroundJobId, markJobSeen, markAnnounceSeen, dismissJob } = useJobs();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const running = jobs.filter((job) => job.status === 'running' && job.id !== foregroundJobId);
  const finished = jobs.filter((job) => (job.status === 'done' || job.status === 'failed') && !job.seen && job.id !== foregroundJobId);
  const card = finished[finished.length - 1];
  const pill = running[running.length - 1];
  // Tarjeta de bienvenida (una sola vez por generación): explica que se puede jugar o seguir usando la app.
  const intro = !card ? running.find((job) => job.announce && !job.announceSeen) : undefined;

  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(cardAnim, { toValue: card ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
  }, [card?.id, cardAnim]);

  // La tarjeta de éxito se oculta sola (queda el resultado en su pantalla; no se pierde nada).
  useEffect(() => {
    if (!card || card.status !== 'done') return undefined;
    const timer = setTimeout(() => markJobSeen(card.id), DONE_AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [card?.id, card?.status, markJobSeen]);

  if (!card && !pill && !intro) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {card ? (
        <Animated.View
          style={[
            styles.card,
            {
              top: insets.top + 8,
              backgroundColor: colors.surface,
              borderColor: card.status === 'done' ? colors.success : colors.error,
              shadowColor: '#000',
              opacity: cardAnim,
              transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
            },
          ]}
        >
          <View style={styles.row}>
            <JobImage uri={card.thumbnailUri} size={44} color={card.status === 'done' ? colors.success : colors.error} />
            <View style={styles.textBox}>
              <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={1}>
                {card.status === 'done' ? t('jobs.ready', { kind: t(`jobs.kind.${card.kind}`) }) : errorText(card.error, t).title}
              </Text>
              <Text style={[styles.message, { color: colors.secondaryText }]} numberOfLines={3}>
                {card.status === 'done'
                  ? card.result?.warning
                    ? t('jobs.readyWarning', { warning: card.result.warning })
                    : t('jobs.readyMessage')
                  : errorText(card.error, t).message}
              </Text>
            </View>
            <Pressable accessibilityLabel={t('jobs.closeNotice')} hitSlop={10} onPress={() => dismissJob(card.id)}>
              <Ionicons name="close" size={20} color={colors.tertiaryText} />
            </Pressable>
          </View>
          <View style={styles.actions}>
            {card.status === 'done' ? (
              <Pressable
                style={[styles.btn, { backgroundColor: colors.cta }]}
                onPress={() => {
                  markJobSeen(card.id);
                  onViewResult(card);
                }}
              >
                <Text style={[styles.btnText, { color: colors.ctaText }]}>{t('jobs.view')}</Text>
              </Pressable>
            ) : card.error?.retryable && onRetry ? (
              <Pressable
                style={[styles.btn, { backgroundColor: colors.cta }]}
                onPress={() => {
                  dismissJob(card.id);
                  onRetry(card);
                }}
              >
                <Text style={[styles.btnText, { color: colors.ctaText }]}>{t('jobs.retry')}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      {intro ? (
        <View style={[styles.card, styles.introCard, { top: insets.top + 8, backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <View style={styles.row}>
            <JobImage uri={intro.thumbnailUri} size={44} color={colors.primary} />
            <View style={styles.textBox}>
              <Text style={[styles.title, { color: colors.primaryText }]}>{intro.announce?.title}</Text>
              <Text style={[styles.message, { color: colors.secondaryText }]}>{intro.announce?.message}</Text>
            </View>
          </View>
          <View style={styles.introActions}>
            {onPlay ? (
              <Pressable
                style={[styles.introBtn, { backgroundColor: gamePalette.primary }]}
                onPress={() => {
                  markAnnounceSeen(intro.id);
                  onPlay(intro);
                }}
              >
                <Ionicons name="game-controller" size={18} color={gamePalette.white} />
                <Text style={styles.introBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t('wait.play')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.introBtn, styles.introBtnOutline, { borderColor: colors.border }]}
              onPress={() => markAnnounceSeen(intro.id)}
            >
              <Text style={[styles.introBtnText, { color: colors.primaryText }]} numberOfLines={1}>
                {t('jobs.explore')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {pill && !intro ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('jobs.progressA11y')}
          onPress={() => onOpenJob(pill)}
          style={[styles.pill, { bottom: insets.bottom + 92, backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <JobImage uri={pill.thumbnailUri} size={28} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pillTitle, { color: colors.primaryText }]} numberOfLines={1}>
              {pill.title} · {Math.round(pill.progress * 100)}%
            </Text>
            <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
              <View style={[styles.fill, { width: `${Math.max(4, Math.round(pill.progress * 100))}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
          <Ionicons name="chevron-up" size={18} color={colors.tertiaryText} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  introCard: { borderWidth: 2 },
  introActions: { gap: 10 },
  introBtn: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  introBtnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  introBtnText: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textBox: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  message: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  btnText: { fontSize: 13, fontWeight: '700' },
  pill: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pillTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
