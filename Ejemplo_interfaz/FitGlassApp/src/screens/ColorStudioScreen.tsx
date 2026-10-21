import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface ColorStudioScreenProps {
  navigation?: any;
  onViewRecommendations?: () => void;
  onOpenProfile?: () => void;
  onRecalibrate?: () => void;
}

export const ColorStudioScreen: React.FC<ColorStudioScreenProps> = ({
  navigation,
  onViewRecommendations,
  onOpenProfile,
  onRecalibrate,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { colorProfile, userPhotoUri } = useUser();

  const [activeHex, setActiveHex] = useState<string | null>(
    colorProfile.recommended_colors[0] || null
  );

  const handleRecalibrate = () => {
    if (onRecalibrate) {
      onRecalibrate();
    } else if (navigation) {
      navigation.navigate('BodyProfile');
    }
  };

  const handleOpenWardrobe = () => {
    if (onViewRecommendations) {
      onViewRecommendations();
    } else if (navigation) {
      navigation.navigate('Wardrobe');
    }
  };

  const handleOpenFittingRoom = () => {
    if (navigation) {
      navigation.navigate('FittingRoom');
    }
  };

  const handleCopyHex = (hex: string) => {
    setActiveHex(hex);
  };

  // Glassmorphic surface helpers
  const glassSurface = {
    backgroundColor: isDark ? 'rgba(30, 30, 36, 0.72)' : 'rgba(255, 255, 255, 0.82)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
  };

  return (
    <View style={styles.container}>
      <VibrantBackground />
      <Header
        title="Estudio de Color"
        subtitle="Armonía Espectral & Colorimetría IA"
        showAvatar
        onAvatarPress={onOpenProfile || (() => navigation?.navigate('Profile'))}
        rightAction={{
          icon: 'camera-outline',
          onPress: handleRecalibrate,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Glassmorphic Season Badge Hero Card */}
        <GlassCard style={styles.glassHeroCard}>
          <View style={styles.seasonTagRow}>
            <View
              style={[
                styles.seasonPill,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Ionicons name="sparkles" size={13} color={colors.primaryText} />
              <Text style={[styles.seasonPillText, { color: colors.primaryText }]}>
                {colorProfile.season.toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.recalibrateBtnMini}
              onPress={handleRecalibrate}
              activeOpacity={0.7}
            >
              <Ionicons name="scan-outline" size={14} color={colors.secondaryText} />
              <Text style={[styles.recalibrateBtnMiniText, { color: colors.secondaryText }]}>
                Recalibrar
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.paletteName, { color: colors.primaryText }]}>
            {colorProfile.palette_name || `Paleta ${colorProfile.season}`}
          </Text>

          {/* Abstract Spectral Dispersion Ring Graphic */}
          <View style={styles.chromaRingBox}>
            <View
              style={[
                styles.outerOrb,
                { borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' },
              ]}
            >
              <View
                style={[
                  styles.innerOrb,
                  { borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)' },
                ]}
              >
                <View
                  style={[
                    styles.centerCore,
                    {
                      backgroundColor:
                        activeHex || colorProfile.recommended_colors[0] || colors.primaryText,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Orbiting spectral color dots */}
            <View style={styles.orbitRow}>
              {colorProfile.recommended_colors.slice(0, 5).map((hex, i) => (
                <View
                  key={i}
                  style={[
                    styles.orbitDot,
                    {
                      backgroundColor: hex,
                      borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        {/* Biometric Base Tones: Skin Tone, Hair & Eyes */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
            Fisiología & Subtono Base
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Parámetros extraídos por Gemini Vision a partir de tu fotografía frontal
          </Text>

          <View style={styles.baseTonesGrid}>
            {/* Piel */}
            <GlassCard style={styles.baseToneCard}>
              <View
                style={[
                  styles.toneCircularSwatch,
                  {
                    backgroundColor: colorProfile.skin_tone.split(' ')[0],
                    borderColor: colors.borderLight,
                  },
                ]}
              />
              <View style={styles.toneTextCol}>
                <Text style={[styles.toneTypeLabel, { color: colors.tertiaryText }]}>
                  TONO DE PIEL
                </Text>
                <Text style={[styles.toneValueText, { color: colors.primaryText }]} numberOfLines={1}>
                  {colorProfile.skin_tone}
                </Text>
              </View>
            </GlassCard>

            {/* Cabello */}
            <GlassCard style={styles.baseToneCard}>
              <View
                style={[
                  styles.toneCircularSwatch,
                  {
                    backgroundColor: colorProfile.hair_color.split(' ')[0],
                    borderColor: colors.borderLight,
                  },
                ]}
              />
              <View style={styles.toneTextCol}>
                <Text style={[styles.toneTypeLabel, { color: colors.tertiaryText }]}>
                  COLOR DE CABELLO
                </Text>
                <Text style={[styles.toneValueText, { color: colors.primaryText }]} numberOfLines={1}>
                  {colorProfile.hair_color}
                </Text>
              </View>
            </GlassCard>

            {/* Ojos si está disponible */}
            {colorProfile.eye_color ? (
              <GlassCard style={styles.baseToneCard}>
                <View
                  style={[
                    styles.toneCircularSwatch,
                    {
                      backgroundColor: colorProfile.eye_color.split(' ')[0],
                      borderColor: colors.borderLight,
                    },
                  ]}
                />
                <View style={styles.toneTextCol}>
                  <Text style={[styles.toneTypeLabel, { color: colors.tertiaryText }]}>
                    COLOR DE OJOS
                  </Text>
                  <Text style={[styles.toneValueText, { color: colors.primaryText }]} numberOfLines={1}>
                    {colorProfile.eye_color}
                  </Text>
                </View>
              </GlassCard>
            ) : null}
          </View>
        </View>

        {/* AI Stylist Explanation Card */}
        <GlassCard style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primaryText} />
            <Text style={[styles.explanationLabel, { color: colors.primaryText }]}>
              Dictamen Estético de Colorimetría
            </Text>
          </View>
          <Text style={[styles.explanationBody, { color: colors.secondaryText }]}>
            "{colorProfile.description}"
          </Text>
        </GlassCard>

        {/* Circular Swatches: Recommended Garment Colors */}
        <View style={styles.sectionWrapper}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              Colores Óptimos de Ropa
            </Text>
            <Text style={[styles.badgeCount, { color: colors.tertiaryText }]}>
              {colorProfile.recommended_colors.length} TONOS
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Selecciona una muestra circular para ver el código HEX de diseño textil
          </Text>

          <View style={styles.swatchesContainer}>
            {colorProfile.recommended_colors.map((hex, index) => {
              const isSelected = activeHex === hex;
              return (
                <TouchableOpacity
                  key={`${hex}-${index}`}
                  style={[
                    styles.swatchCard,
                    glassSurface,
                    isSelected && {
                      borderColor: colors.primaryText,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleCopyHex(hex)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.circularSwatch,
                      {
                        backgroundColor: hex,
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                      },
                      isSelected && styles.circularSwatchSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.swatchHexCode,
                      { color: isSelected ? colors.primaryText : colors.secondaryText },
                      isSelected && { fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {hex.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Swatch Highlight Card */}
        {activeHex && (
          <GlassCard style={styles.selectedSwatchCard}>
            <View
              style={[
                styles.largeSwatchBlock,
                {
                  backgroundColor: activeHex,
                  borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
                },
              ]}
            />
            <View style={styles.selectedSwatchDetails}>
              <Text style={[styles.selectedSwatchLabel, { color: colors.tertiaryText }]}>
                CÓDIGO HEX SELECCIONADO
              </Text>
              <Text style={[styles.selectedSwatchHex, { color: colors.primaryText }]}>
                {activeHex.toUpperCase()}
              </Text>
              <Text style={[styles.selectedSwatchHint, { color: colors.secondaryText }]}>
                Filtro cromático activo para el probador y recomendaciones de prendas.
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Colores a Evitar */}
        {colorProfile.colors_to_avoid && colorProfile.colors_to_avoid.length > 0 ? (
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              Colores Desaconsejados
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
              Matices que restan luminosidad o generan tono apagado en tu subtono
            </Text>

            <View style={styles.avoidChipsRow}>
              {colorProfile.colors_to_avoid.map((hex, i) => (
                <View key={`avoid-${i}`} style={[styles.avoidChip, glassSurface]}>
                  <View style={[styles.avoidDot, { backgroundColor: hex }]} />
                  <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginLeft: 4 }} />
                  <Text style={[styles.avoidHexText, { color: colors.secondaryText }]}>
                    {hex.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Acciones principales */}
        <View style={styles.actionButtonsCol}>
          <PrimaryButton
            label="Ver Prendas Armonizadas en Armario"
            onPress={handleOpenWardrobe}
            icon="shirt-outline"
          />
          <SecondaryButton
            label="Abrir Probador Virtual 3D"
            onPress={handleOpenFittingRoom}
            icon="sparkles-outline"
            style={{ marginTop: Spacing.sm }}
          />
        </View>
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
    paddingBottom: Spacing.huge,
  },
  glassHeroCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  seasonTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  seasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 6,
  },
  seasonPillText: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  recalibrateBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recalibrateBtnMiniText: {
    ...Typography.micro,
    fontSize: 11,
  },
  paletteName: {
    ...Typography.title1,
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  chromaRingBox: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    position: 'relative',
  },
  outerOrb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerOrb: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  orbitRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    gap: 10,
  },
  orbitDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  sectionWrapper: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    ...Typography.title2,
    fontSize: 17,
    fontWeight: '700',
  },
  badgeCount: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  baseTonesGrid: {
    gap: Spacing.sm,
  },
  baseToneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  toneCircularSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    marginRight: Spacing.md,
  },
  toneTextCol: {
    flex: 1,
  },
  toneTypeLabel: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
  },
  toneValueText: {
    ...Typography.callout,
    fontWeight: '600',
    marginTop: 2,
  },
  explanationCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  explanationLabel: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  explanationBody: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  swatchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  swatchCard: {
    width: (Dimensions.get('window').width - Spacing.xl * 2 - Spacing.sm * 3) / 4,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  circularSwatchSelected: {
    transform: [{ scale: 1.08 }],
  },
  swatchHexCode: {
    ...Typography.micro,
    fontSize: 9,
    textAlign: 'center',
  },
  selectedSwatchCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  largeSwatchBlock: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  selectedSwatchDetails: {
    flex: 1,
  },
  selectedSwatchLabel: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
  },
  selectedSwatchHex: {
    ...Typography.title2,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  selectedSwatchHint: {
    ...Typography.micro,
    fontSize: 10,
    marginTop: 2,
  },
  avoidChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  avoidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  avoidDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  avoidHexText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtonsCol: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
});
