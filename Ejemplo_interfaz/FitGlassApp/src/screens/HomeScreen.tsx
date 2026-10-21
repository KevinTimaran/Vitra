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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.subhead,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  statusBox: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusBoxTitle: {
    ...Typography.micro,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  statusText: {
    ...Typography.caption,
  },
  statusContent: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
    marginBottom: Spacing.xs,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  badgeSuccessText: {
    ...Typography.caption,
    color: '#15803D',
    fontWeight: '600',
  },
  badgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
    marginBottom: Spacing.xs,
  },
  statusDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  badgeErrorText: {
    ...Typography.caption,
    color: '#B91C1C',
    fontWeight: '600',
  },
  detailText: {
    ...Typography.caption,
  },
  bold: {
    fontWeight: '600',
  },
  errorText: {
    ...Typography.caption,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.callout,
    fontWeight: '600',
    fontSize: 13,
  },
  quickActionsContainer: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  primaryActionBtnText: {
    ...Typography.callout,
    fontWeight: '600',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  secondaryActionBtnText: {
    ...Typography.callout,
    fontWeight: '600',
  },
});
