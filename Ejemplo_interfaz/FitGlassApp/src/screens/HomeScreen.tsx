import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkHealth, HealthStatusResponse } from '../services/ai/garmentAnalyzer';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';

export const HomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [healthStatus, setHealthStatus] = useState<HealthStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const performHealthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[HomeScreen] Iniciando verificación de salud con FitGlassAI...');
      const response = await checkHealth();
      console.log('[HomeScreen] Respuesta de /health recibida con éxito:', response);
      setHealthStatus(response);
    } catch (err: any) {
      console.error('[HomeScreen] Error al conectar con /health de FitGlassAI:', err);
      setError(err?.message || 'Error de conexión desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
  }, []);

  return (
    <View style={styles.container}>
      <VibrantBackground />
      <GlassCard style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSubtle }]}>
          <Ionicons name="home-outline" size={38} color={colors.primaryText} />
        </View>

        <Text style={[styles.title, { color: colors.primaryText }]}>
          {t('tabs.home')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          {t('welcome.tagline')}
        </Text>

        {/* Indicador de Conexión con el Backend */}
        <View
          style={[
            styles.statusBox,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.statusBoxTitle, { color: colors.tertiaryText }]}>
            {t('home.serverStatus')}
          </Text>

          {loading && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.primaryText} />
              <Text style={[styles.statusText, { color: colors.secondaryText }]}>
                {t('home.checkingServer')}
              </Text>
            </View>
          )}

          {!loading && healthStatus && (
            <View style={styles.statusContent}>
              <View style={styles.badgeSuccess}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.badgeSuccessText}>{t('home.connected')}</Text>
              </View>
              <Text style={[styles.detailText, { color: colors.secondaryText }]}>
                {t('home.status')}: <Text style={[styles.bold, { color: colors.primaryText }]}>{healthStatus.status}</Text>
              </Text>
              {healthStatus.message && (
                <Text style={[styles.detailText, { color: colors.secondaryText }]}>
                  {t('home.message')}: <Text style={[styles.bold, { color: colors.primaryText }]}>{healthStatus.message}</Text>
                </Text>
              )}
            </View>
          )}

          {!loading && error && (
            <View style={styles.statusContent}>
              <View style={styles.badgeError}>
                <View style={styles.statusDotRed} />
                <Text style={styles.badgeErrorText}>{t('home.disconnected')}</Text>
              </View>
              <Text style={styles.errorText} numberOfLines={2}>
                {error}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.cta }]}
            onPress={performHealthCheck}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.ctaText} />
            <Text style={[styles.retryButtonText, { color: colors.ctaText }]}>
              {loading ? t('home.connecting') : t('home.retry')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.cta }]}
            onPress={() => (navigation ? navigation.navigate('ColorStudio') : null)}
            activeOpacity={0.8}
          >
            <Ionicons name="color-palette-outline" size={18} color={colors.ctaText} />
            <Text style={[styles.primaryActionBtnText, { color: colors.ctaText }]}>
              {t('home.biometricScan')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryActionBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
            onPress={() => (navigation ? navigation.navigate('AddGarment') : null)}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={18} color={colors.primaryText} />
            <Text style={[styles.secondaryActionBtnText, { color: colors.primaryText }]}>
              {t('home.digitalizeGarment')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryActionBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
            onPress={() => (navigation ? navigation.navigate('FittingRoom') : null)}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.primaryText} />
            <Text style={[styles.secondaryActionBtnText, { color: colors.primaryText }]}>
              {t('home.openFittingRoom')}
            </Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  title: {
    ...Typography.headlineLg,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 290,
  },
  statusBox: {
    width: '100%',
    borderRadius: Radius.default,
    padding: Spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusBoxTitle: {
    ...Typography.labelSm,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  statusText: {
    ...Typography.bodySm,
  },
  statusContent: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CAE9DF', // secondaryContainer
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    gap: 6,
    marginBottom: Spacing.xs,
  },
  statusDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#48645C', // secondary
  },
  badgeSuccessText: {
    ...Typography.labelMd,
    color: '#03201A',
    fontWeight: '600',
  },
  badgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDAD6', // errorContainer
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    gap: 6,
    marginBottom: Spacing.xs,
  },
  statusDotRed: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#BA1A1A', // error
  },
  badgeErrorText: {
    ...Typography.labelMd,
    color: '#93000A',
    fontWeight: '600',
  },
  detailText: {
    ...Typography.bodySm,
  },
  bold: {
    fontWeight: '600',
  },
  errorText: {
    ...Typography.bodySm,
    color: '#BA1A1A',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.labelMd,
    fontWeight: '600',
  },
  quickActionsContainer: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryActionBtnText: {
    ...Typography.labelLg,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
  },
  secondaryActionBtnText: {
    ...Typography.labelLg,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
