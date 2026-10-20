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
import { Colors, Typography, Spacing, Radius } from '../theme';

export const HomeScreen: React.FC = () => {
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
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="home-outline" size={38} color={Colors.primaryText} />
        </View>

        <Text style={styles.title}>HomeScreen</Text>
        <Text style={styles.subtitle}>
          Cimientos de Vitra (Arquitectura Generativa)
        </Text>

        {/* Indicador de Conexión con el Backend */}
        <View style={styles.statusBox}>
          <Text style={styles.statusBoxTitle}>ESTADO DEL SERVIDOR BACKEND</Text>

          {loading && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={Colors.primaryText} />
              <Text style={styles.statusText}>
                Comprobando conexión con FitGlassAI...
              </Text>
            </View>
          )}

          {!loading && healthStatus && (
            <View style={styles.statusContent}>
              <View style={styles.badgeSuccess}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.badgeSuccessText}>FitGlassAI Conectado</Text>
              </View>
              <Text style={styles.detailText}>
                Estado: <Text style={styles.bold}>{healthStatus.status}</Text>
              </Text>
              {healthStatus.message && (
                <Text style={styles.detailText}>
                  Mensaje: <Text style={styles.bold}>{healthStatus.message}</Text>
                </Text>
              )}
            </View>
          )}

          {!loading && error && (
            <View style={styles.statusContent}>
              <View style={styles.badgeError}>
                <View style={styles.statusDotRed} />
                <Text style={styles.badgeErrorText}>Desconectado</Text>
              </View>
              <Text style={styles.errorText} numberOfLines={2}>
                {error}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.retryButton}
            onPress={performHealthCheck}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={16} color={Colors.ctaText} />
            <Text style={styles.retryButtonText}>
              {loading ? 'Consultando...' : 'Reintentar Conexión'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    color: Colors.primaryText,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  statusBox: {
    width: '100%',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  statusBoxTitle: {
    ...Typography.micro,
    color: Colors.tertiaryText,
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
    color: Colors.secondaryText,
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
    color: Colors.secondaryText,
  },
  bold: {
    fontWeight: '600',
    color: Colors.primaryText,
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
    backgroundColor: Colors.cta,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.callout,
    color: Colors.ctaText,
    fontWeight: '600',
    fontSize: 13,
  },
});
