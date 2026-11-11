import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { WaitingGame } from '../components/WaitingGame/WaitingGame';
import { useForegroundJob, useJob, useJobs } from '../contexts/JobsContext';
import { useTranslation } from '../contexts/LanguageContext';
import { viewJobResult } from '../navigation/jobNavigation';
import { gamePalette } from '../theme/gamePalette';
import { useGameRecord } from '../services/game/useGameRecord';

interface Props {
  route?: { params?: { jobId?: string } | undefined };
  navigation?: any;
}


/**
 * Pantalla aparte para jugar mientras se genera un modelo 3D. Ocupa toda la pantalla (el juego no cabía en la
 * tarjeta de espera) y avisa cuando el trabajo termina, sin interrumpir la partida hasta que el usuario quiera.
 */
export const WaitingGameScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { t, formatNumber } = useTranslation();
  const jobId = route?.params?.jobId;
  const job = useJob(jobId);
  const { markJobSeen } = useJobs();
  const { best, loaded, submitScore } = useGameRecord();
  useForegroundJob(jobId); // mientras se juega, la píldora/tarjeta global no repite el aviso de este trabajo

  const goBack = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.('MainTabs');
  }, [navigation]);

  const handleViewResult = useCallback(() => {
    if (job) {
      markJobSeen(job.id);
      viewJobResult(job);
    } else {
      goBack();
    }
  }, [goBack, job, markJobSeen]);

  const freePlay = !jobId; // abierto desde Ajustes, sin generación en curso
  const percent = job ? Math.round(job.progress * 100) : 100;
  const running = job?.status === 'running';
  const phase = t(job?.phase ? `phase.${job.phase}` : 'phase.generating');

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('game.back')} onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={gamePalette.white} />
          <Text style={styles.backText}>{t('game.back')}</Text>
        </Pressable>
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle} numberOfLines={1}>
            {freePlay
              ? t('game.free')
              : running
              ? `${phase} · ${percent}%`
              : job?.status === 'done'
              ? t('game.ready')
              : job
              ? t('game.finished')
              : t('game.noJob')}
          </Text>
          {freePlay ? null : (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(3, percent)}%` }]} />
            </View>
          )}
        </View>
        <View style={styles.recordBox}>
          <Text style={styles.recordLabel}>🏆 {t('game.record')}</Text>
          <Text style={styles.recordValue}>{best > 0 ? formatNumber(best) : t('game.noRecord')}</Text>
        </View>
      </View>

      <View style={styles.gameArea}>
        {loaded ? (
          <WaitingGame
            job={job}
            fullscreen
            record={best}
            onScore={submitScore}
            onClose={goBack}
            onViewResult={handleViewResult}
          />
        ) : null}
      </View>

      {running ? (
        <Text style={styles.footer}>{t('game.backgroundHint')}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: gamePalette.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: gamePalette.panel,
    borderBottomWidth: 2,
    borderBottomColor: gamePalette.border,
  },
  backBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    paddingLeft: 4,
    borderRadius: 12,
    backgroundColor: gamePalette.surface,
    borderWidth: 1,
    borderColor: gamePalette.borderLight,
  },
  backText: { color: gamePalette.white, fontSize: 14, fontWeight: '700' },
  statusBox: { flex: 1, gap: 6 },
  statusTitle: { color: gamePalette.text, fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: gamePalette.chip, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: gamePalette.cyan },
  recordBox: { alignItems: 'flex-end', minWidth: 78 },
  recordLabel: { color: gamePalette.yellow, fontSize: 10, fontWeight: '800' },
  recordValue: { color: gamePalette.white, fontSize: 15, fontWeight: '800' },
  gameArea: { flex: 1 },
  footer: { color: gamePalette.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 16 },
});
