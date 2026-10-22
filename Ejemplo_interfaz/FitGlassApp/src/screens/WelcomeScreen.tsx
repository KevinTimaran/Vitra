import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface WelcomeScreenProps {
  navigation?: any;
  onGetStarted?: () => void;
  onSignIn?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  navigation,
  onGetStarted,
  onSignIn,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { completeOnboarding } = useUser();

  const handleStartOnboarding = () => {
    if (onGetStarted) {
      onGetStarted();
    } else if (navigation) {
      navigation.navigate('BodyProfile');
    }
  };

  const handleSkipOrGuest = () => {
    completeOnboarding({
      fullName: 'Invitado Atelier',
      gender: 'female',
      avatarType: 'preset',
    });
    if (onSignIn) {
      onSignIn();
    } else if (navigation) {
      navigation.navigate('MainTabs');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Atelier Stamp */}
        <View style={styles.topHeader}>
          <View
            style={[
              styles.pillBadge,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
          >
            <Ionicons name="sparkles" size={12} color={colors.primary} />
            <Text style={[styles.brandBadge, { color: colors.secondaryText }]}>
              VITRA ATELIER · IDENTIDAD BIOMÉTRICA
            </Text>
          </View>
        </View>

        {/* Brand Headline */}
        <View style={styles.brandSection}>
          <Text style={[styles.wordmark, { color: colors.primaryText }]}>VITRA</Text>
          <Text style={[styles.tagline, { color: colors.secondaryText }]}>
            Crea tu identidad biométrica con Inteligencia Artificial: Avatar 3D y Colorimetría de Precisión.
          </Text>
        </View>

        {/* Abstract 3D Optical Hologram Box */}
        <GlassCard style={styles.visualCanvas}>
          {/* Subtle Matrix Lines */}
          <View style={styles.gridBox}>
            <View style={[styles.gridLineV, { backgroundColor: colors.borderLight }]} />
            <View style={[styles.gridLineV, { left: '70%', backgroundColor: colors.borderLight }]} />
            <View style={[styles.gridLineH, { backgroundColor: colors.borderLight }]} />
            <View style={[styles.gridLineH, { top: '65%', backgroundColor: colors.borderLight }]} />
          </View>

          {/* Central Biometric Silhouette with Scanning Ring */}
          <View style={styles.abstractFigureWrapper}>
            <View
              style={[
                styles.abstractHead,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View style={[styles.faceTarget, { borderColor: colors.tiffany }]} />
            </View>
            <View
              style={[
                styles.abstractTorso,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View style={[styles.measurementRing, { borderColor: colors.tiffany }]} />
              <View
                style={[
                  styles.measurementRing,
                  { top: 52, width: 80, borderColor: colors.tiffany },
                ]}
              />
            </View>
            <View style={[styles.verticalAxis, { backgroundColor: colors.borderLight }]} />

            {/* Caliper ticks */}
            <View style={[styles.caliperTick, { top: 65, left: 6, backgroundColor: colors.tiffany }]} />
            <View style={[styles.caliperTick, { top: 65, right: 6, backgroundColor: colors.tiffany }]} />
            <View style={[styles.caliperTick, { top: 105, left: 14, backgroundColor: colors.tiffany }]} />
            <View style={[styles.caliperTick, { top: 105, right: 14, backgroundColor: colors.tiffany }]} />
          </View>

          {/* Calibration Overlay Tag */}
          <View
            style={[
              styles.calibrationTag,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Ionicons name="scan-outline" size={13} color={colors.primary} />
            <Text style={[styles.calibrationText, { color: colors.primaryText }]}>
              ESCÁNER 1:1 · GEMINI VISION & TRIPO 3D
            </Text>
          </View>
        </GlassCard>

        {/* 3 Key Pillars of Phase 4 */}
        <View style={styles.pillarsContainer}>
          <GlassCard style={styles.pillarCard}>
            <View style={[styles.pillarIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.pillarTextContent}>
              <Text style={[styles.pillarTitle, { color: colors.primaryText }]}>
                1. Colorimetría Estacional
              </Text>
              <Text style={[styles.pillarDesc, { color: colors.secondaryText }]}>
                Gemini Vision analiza tu subtono de piel y cabello para definir tu paleta HEX de máxima armonía.
              </Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.pillarCard}>
            <View style={[styles.pillarIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.pillarTextContent}>
              <Text style={[styles.pillarTitle, { color: colors.primaryText }]}>
                2. Avatar Base en 3D
              </Text>
              <Text style={[styles.pillarDesc, { color: colors.secondaryText }]}>
                Reconstrucción tridimensional de tu cuerpo con Tripo3D en un archivo interactivo .glb.
              </Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.pillarCard}>
            <View style={[styles.pillarIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.pillarTextContent}>
              <Text style={[styles.pillarTitle, { color: colors.primaryText }]}>
                3. Probador Virtual Personalizado
              </Text>
              <Text style={[styles.pillarDesc, { color: colors.secondaryText }]}>
                Pruébate cualquier prenda de tu armario sobre tu gemelo digital con drapeado realista.
              </Text>
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bg, borderTopColor: colors.borderLight },
        ]}
      >
        <PrimaryButton
          label="Iniciar Escaneo Biométrico"
          onPress={handleStartOnboarding}
          icon="camera-outline"
        />
        <SecondaryButton
          label="Explorar App como Invitado"
          onPress={handleSkipOrGuest}
          style={{ marginTop: Spacing.sm }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  topHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  brandBadge: {
    ...Typography.micro,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  wordmark: {
    ...Typography.displayLg,
    fontFamily: Typography.bodoni.bold,
    letterSpacing: 8,
    textAlign: 'center',
  },
  tagline: {
    ...Typography.callout,
    fontFamily: Typography.outfit.regular,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 320,
    lineHeight: 20,
  },
  visualCanvas: {
    height: 200,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  gridBox: {
    ...StyleSheet.absoluteFill,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '30%',
    width: StyleSheet.hairlineWidth,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '35%',
    height: StyleSheet.hairlineWidth,
  },
  abstractFigureWrapper: {
    alignItems: 'center',
    position: 'relative',
    height: 130,
    width: 100,
    justifyContent: 'center',
  },
  abstractHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceTarget: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  abstractTorso: {
    width: 70,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  measurementRing: {
    position: 'absolute',
    top: 20,
    width: 76,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  verticalAxis: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  caliperTick: {
    position: 'absolute',
    width: 8,
    height: 1,
  },
  calibrationTag: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  calibrationText: {
    ...Typography.micro,
    fontFamily: Typography.outfit.semiBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  pillarsContainer: {
    gap: Spacing.sm,
  },
  pillarCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  pillarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTextContent: {
    flex: 1,
  },
  pillarTitle: {
    ...Typography.caption,
    fontFamily: Typography.outfit.semiBold,
    fontSize: 13,
    marginBottom: 2,
  },
  pillarDesc: {
    ...Typography.micro,
    fontFamily: Typography.outfit.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
