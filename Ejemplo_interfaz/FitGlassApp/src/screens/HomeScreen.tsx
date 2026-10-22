import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkHealth, HealthStatusResponse } from '../services/ai/garmentAnalyzer';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2;

export const HomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { userProfile, colorProfile } = useUser();
  const [healthStatus, setHealthStatus] = useState<HealthStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const performHealthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[HomeScreen] Verificando estado con FitGlassAI...');
      const response = await checkHealth();
      setHealthStatus(response);
    } catch (err: any) {
      console.warn('[HomeScreen] FitGlassAI no disponible:', err?.message);
      setError(err?.message || 'Error de conexión');
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera Editorial & Estado de Conexión Compacto */}
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.brandBadge,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <Text style={[styles.brandBadgeText, { color: colors.secondaryText }]}>
                ATELIER VITRA · A/W 2026
              </Text>
            </View>

            {/* Chip Compacto de Estado de la IA */}
            <TouchableOpacity
              style={[
                styles.statusPillCompact,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
              onPress={performHealthCheck}
              activeOpacity={0.7}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color={colors.secondaryText} style={{ transform: [{ scale: 0.7 }] }} />
                  <Text style={[styles.statusPillText, { color: colors.secondaryText }]}>
                    Conectando...
                  </Text>
                </>
              ) : healthStatus ? (
                <>
                  <View style={styles.dotOnline} />
                  <Text style={[styles.statusPillText, { color: colors.primaryText }]}>
                    IA en Línea
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.dotOffline} />
                  <Text style={[styles.statusPillText, { color: '#EF4444' }]}>
                    Reconectar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Título y Saludo Editorial */}
          <Text style={[styles.editorialHeading, { color: colors.primaryText }]}>
            {userProfile?.name ? `Hola, ${userProfile.name.split(' ')[0]}` : 'Tu Guardarropa Inteligente'}
          </Text>
          <Text style={[styles.editorialSubtitle, { color: colors.secondaryText }]}>
            {t('home.heroSubtitle') || 'Simula caída de tela, tensión y armonía de color en tu silueta 3D.'}
          </Text>
        </View>

        {/* 1. Tarjeta Hero Principal: Probador Virtual 3D */}
        <GlassCard style={styles.heroGlassCard}>
          <View style={styles.heroHeaderRow}>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)',
                },
              ]}
            >
              <Ionicons name="sparkles" size={13} color={colors.primaryText} />
              <Text style={[styles.heroBadgeText, { color: colors.primaryText }]}>
                PROBADOR VIRTUAL 3D
              </Text>
            </View>
            <View style={styles.heroGlowDot} />
          </View>

          <Text style={[styles.heroTitle, { color: colors.primaryText }]}>
            Experimenta tu Silueta Digital
          </Text>
          <Text style={[styles.heroBody, { color: colors.secondaryText }]}>
            Combina tus prendas en tiempo real con simulación tridimensional y física de tejido sobre tu avatar.
          </Text>

          <TouchableOpacity
            style={[styles.heroCtaButton, { backgroundColor: colors.cta }]}
            onPress={() => navigation?.navigate('FittingRoom')}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.ctaText} />
            <Text style={[styles.heroCtaButtonText, { color: colors.ctaText }]}>
              Entrar al Probador 3D
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.ctaText} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </GlassCard>

        {/* 2. Cuadrícula Modular 2x2 de Módulos del Atelier */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.tertiaryText }]}>
            MÓDULOS DEL ATELIER
          </Text>
        </View>

        <View style={styles.modulesGrid}>
          {/* Módulo 1: Estudio de Colorimetría */}
          <TouchableOpacity
            onPress={() => navigation?.navigate('ColorStudio')}
            activeOpacity={0.85}
          >
            <GlassCard style={styles.gridCard}>
              <View
                style={[
                  styles.gridIconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(217, 70, 239, 0.15)' : 'rgba(217, 70, 239, 0.1)',
                    borderColor: isDark ? 'rgba(217, 70, 239, 0.3)' : 'rgba(217, 70, 239, 0.2)',
                  },
                ]}
              >
                <Ionicons name="color-palette-outline" size={24} color="#D946EF" />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.primaryText }]}>
                Colorimetría
              </Text>
              <Text style={[styles.gridCardSubtitle, { color: colors.secondaryText }]}>
                Paleta estacional y tonos de piel
              </Text>
              <View style={styles.gridCardFooter}>
                <Text style={[styles.gridCardTag, { color: '#D946EF' }]}>
                  Espectral
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Módulo 2: Digitalizar Prenda con IA */}
          <TouchableOpacity
            onPress={() => navigation?.navigate('AddGarment')}
            activeOpacity={0.85}
          >
            <GlassCard style={styles.gridCard}>
              <View
                style={[
                  styles.gridIconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)',
                    borderColor: isDark ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)',
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={24} color="#06B6D4" />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.primaryText }]}>
                Añadir Prenda
              </Text>
              <Text style={[styles.gridCardSubtitle, { color: colors.secondaryText }]}>
                Extracción IA con Gemini Vision
              </Text>
              <View style={styles.gridCardFooter}>
                <Text style={[styles.gridCardTag, { color: "#06B6D4" }]}>
                  Cámara IA
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Módulo 3: Guardarropa Digital */}
          <TouchableOpacity
            onPress={() => navigation?.navigate('Wardrobe')}
            activeOpacity={0.85}
          >
            <GlassCard style={styles.gridCard}>
              <View
                style={[
                  styles.gridIconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                    borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
                  },
                ]}
              >
                <Ionicons name="shirt-outline" size={24} color="#8B5CF6" />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.primaryText }]}>
                Guardarropa
              </Text>
              <Text style={[styles.gridCardSubtitle, { color: colors.secondaryText }]}>
                Catálogo curado y combinaciones
              </Text>
              <View style={styles.gridCardFooter}>
                <Text style={[styles.gridCardTag, { color: "#8B5CF6" }]}>
                  Colección
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Módulo 4: Perfil & Gemelo Digital */}
          <TouchableOpacity
            onPress={() => navigation?.navigate('Profile')}
            activeOpacity={0.85}
          >
            <GlassCard style={styles.gridCard}>
              <View
                style={[
                  styles.gridIconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
                  },
                ]}
              >
                <Ionicons name="person-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.primaryText }]}>
                Identidad 3D
              </Text>
              <Text style={[styles.gridCardSubtitle, { color: colors.secondaryText }]}>
                Calibración de medidas corporales
              </Text>
              <View style={styles.gridCardFooter}>
                <Text style={[styles.gridCardTag, { color: "#F59E0B" }]}>
                  Biometría
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* 3. Resonancia Cromática Activa */}
        {colorProfile && (
          <TouchableOpacity
            onPress={() => navigation?.navigate('ColorStudio')}
            activeOpacity={0.85}
          >
            <GlassCard style={styles.paletteSummaryCard}>
              <View style={styles.paletteSummaryHeader}>
                <View>
                  <Text style={[styles.palettePreLabel, { color: colors.tertiaryText }]}>
                    ARMONÍA CROMÁTICA ACTIVA
                  </Text>
                  <Text style={[styles.paletteNameText, { color: colors.primaryText }]}>
                    {colorProfile.season || 'Paleta Estacional'}
                  </Text>
                </View>
                <Ionicons name="sparkles" size={18} color="#D946EF" />
              </View>

              <View style={styles.paletteDotsRow}>
                {colorProfile.recommended_colors.slice(0, 6).map((hex, i) => (
                  <View
                    key={i}
                    style={[
                      styles.paletteDot,
                      {
                        backgroundColor: hex,
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                      },
                    ]}
                  />
                ))}
                <Text style={[styles.paletteExploreLink, { color: colors.secondaryText }]}>
                  Ver estudio →
                </Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.huge + 36,
  },
  headerTop: {
    marginBottom: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  brandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  brandBadgeText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  statusPillCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusPillText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '600',
  },
  dotOnline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dotOffline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  editorialHeading: {
    ...Typography.displayMdMobile,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: Spacing.xs,
  },
  editorialSubtitle: {
    ...Typography.bodyMd,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },

  /* Hero Card */
  heroGlassCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroBadgeText: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06B6D4',
  },
  heroTitle: {
    ...Typography.title1,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  heroBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  heroCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    gap: 8,
  },
  heroCtaButtonText: {
    ...Typography.callout,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Grid de Módulos */
  sectionHeaderRow: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.micro,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    minHeight: 165,
    justifyContent: 'space-between',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  gridCardTitle: {
    ...Typography.headlineSm,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  gridCardSubtitle: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  gridCardTag: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Tarjeta de Paleta */
  paletteSummaryCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  paletteSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  palettePreLabel: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  paletteNameText: {
    ...Typography.title2,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  paletteDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paletteDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  paletteExploreLink: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 'auto',
  },
});
