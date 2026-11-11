import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { errorText } from '../../services/jobs/jobErrors.ts';
import type { Job } from '../../services/jobs/jobStore.ts';
import { gamePalette } from '../../theme/gamePalette';
import { RONNIE_SKATE_HTML } from './ronnieSkateHtml';

interface Props {
  /** Trabajo que se está generando; se usa para mostrar el progreso y avisar cuando termina. */
  job?: Job;
  /** Cierra el juego y vuelve a la pantalla de espera. */
  onClose: () => void;
  /** Lleva al resultado cuando el modelo termina mientras se juega. */
  onViewResult?: () => void;
  /** Ocupa todo el espacio disponible (pantalla aparte): sin cabecera propia ni bordes. */
  fullscreen?: boolean;
  /** Mejor puntuación guardada del usuario: se inyecta en el juego como "récord a superar". */
  record?: number;
  /** Puntuación enviada por el juego (durante la partida, al superar el récord y al terminar). */
  onScore?: (score: number) => void;
}

// Los tipos de react-native-webview 14 no son compatibles con los de React 19 (props: never): se tipa de forma laxa.
const WebView = RNWebView as unknown as React.ComponentType<any>;

const BASE_URL = 'https://vitra.local/'; // origen estable: permite localStorage (récord) dentro del WebView

/**
 * "Modo juego" para las esperas de generación 3D. El juego corre en un WebView (canvas 2D, sin dependencias de red
 * en la versión compilada). Cuando el trabajo termina se pausa el juego y aparece un aviso nativo.
 */
export const WaitingGame: React.FC<Props> = ({ job, onClose, onViewResult, fullscreen = false, record = 0, onScore }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const webViewRef = useRef<{ injectJavaScript: (script: string) => void } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bestScore, setBestScore] = useState(0);

  const finished = job?.status === 'done' || job?.status === 'failed';

  // Pausa el juego en cuanto el modelo termina (o falla) para que el aviso no se pierda en plena partida.
  useEffect(() => {
    if (finished) webViewRef.current?.injectJavaScript('window.__vitraPause && window.__vitraPause(); true;');
  }, [finished]);

  useEffect(() => {
    setBannerDismissed(false);
  }, [job?.id, job?.status]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (
        (message?.type === 'score' || message?.type === 'record' || message?.type === 'gameover') &&
        typeof message.score === 'number'
      ) {
        setBestScore((previous) => Math.max(previous, message.score));
        onScore?.(message.score);
      }
    } catch {
      // mensajes ajenos al puente: se ignoran
    }
  }, [onScore]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.secondaryText, padding: 16, textAlign: 'center' }}>
          {t('game.webOnly')}
        </Text>
      </View>
    );
  }

  const percent = job ? Math.round(job.progress * 100) : 0;
  const showBanner = finished && !bannerDismissed;

  return (
    <View
      style={[
        styles.container,
        fullscreen ? styles.containerFull : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {fullscreen ? null : (
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]} numberOfLines={1}>
            {job?.status === 'running' || !job ? t('game.playing', { percent }) : t('game.finished')}
          </Text>
          {bestScore > 0 ? (
            <Text style={[styles.headerSub, { color: colors.tertiaryText }]}>{t('game.bestScore', { score: bestScore })}</Text>
          ) : null}
        </View>
        <Pressable accessibilityLabel={t('game.closeA11y')} hitSlop={10} onPress={onClose}>
          <Ionicons name="close-circle" size={26} color={colors.tertiaryText} />
        </Pressable>
      </View>
      )}

      <View style={[styles.webWrap, fullscreen && styles.webWrapFull]}>
        <WebView
          ref={webViewRef}
          source={{ html: RONNIE_SKATE_HTML, baseUrl: BASE_URL }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
          scrollEnabled={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          setSupportMultipleWindows={false}
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded={`window.__VITRA_RECORD = ${Math.max(0, Math.floor(record))}; true;`}
          style={styles.web}
        />

        {showBanner ? (
          <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: job?.status === 'done' ? colors.success : colors.error }]}>
            <Text style={[styles.bannerTitle, { color: colors.primaryText }]}>
              {job?.status === 'done' ? t('game.modelReady') : errorText(job?.error, t).title}
            </Text>
            {job?.status === 'failed' ? (
              <Text style={[styles.bannerText, { color: colors.secondaryText }]} numberOfLines={3}>
                {errorText(job.error, t).message}
              </Text>
            ) : null}
            <View style={styles.bannerActions}>
              <Pressable style={[styles.btnGhost, { borderColor: colors.border }]} onPress={() => setBannerDismissed(true)}>
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('game.keepPlaying')}</Text>
              </Pressable>
              {job?.status === 'done' && onViewResult ? (
                <Pressable style={[styles.btn, { backgroundColor: colors.cta }]} onPress={onViewResult}>
                  <Text style={{ color: colors.ctaText, fontWeight: '700' }}>{t('jobs.view')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  headerTitle: { fontSize: 14, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  containerFull: { flex: 1, borderRadius: 0, borderWidth: 0, backgroundColor: gamePalette.bg },
  webWrap: { height: 380, backgroundColor: gamePalette.bg },
  webWrapFull: { flex: 1, height: undefined },
  web: { flex: 1, backgroundColor: gamePalette.bg },
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 18,
    borderWidth: 2,
    padding: 18,
    gap: 10,
  },
  bannerTitle: { fontSize: 16, fontWeight: '800' },
  bannerText: { fontSize: 13, lineHeight: 18 },
  bannerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  btn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  btnGhost: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
});
