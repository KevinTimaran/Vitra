import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { getAuthToken } from '../services/auth/secureStorage';
import { analyzeColorimetry, updateUserColorimetry } from '../services/ai/garmentAnalyzer';
import { filterHarmoniousGarments, getSeasonEducationalInfo } from '../utils/colorHarmony';
import { Garment } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCREEN_GUTTER = 12;

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
  const { colorProfile, wardrobe_items, updateColorProfile } = useUser();

  const [isRecalibrateModalOpen, setIsRecalibrateModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const recommendedColors = useMemo(() => {
    return Array.isArray(colorProfile?.recommended_colors) && colorProfile.recommended_colors.length > 0
      ? colorProfile.recommended_colors
      : ['#854D0E', '#047857', '#C2410C', '#B45309', '#1E3A8A', '#0F766E'];
  }, [colorProfile?.recommended_colors]);

  const colorsToAvoid = useMemo(() => {
    return Array.isArray(colorProfile?.colors_to_avoid) ? colorProfile.colors_to_avoid : [];
  }, [colorProfile?.colors_to_avoid]);

  const [activeHex, setActiveHex] = useState<string | null>(
    recommendedColors[0] || null
  );

  // Guía educativa y consejos estilísticos derivados de la estación activa
  const educationalInfo = useMemo(() => {
    return getSeasonEducationalInfo(colorProfile?.season);
  }, [colorProfile?.season]);

  // Filtro de prendas armoniosas del armario utilizando el algoritmo perceptual
  const harmoniousGarments = useMemo(() => {
    return filterHarmoniousGarments(wardrobe_items || [], recommendedColors, 72);
  }, [wardrobe_items, recommendedColors]);

  const handleRecalibrate = () => {
    if (onRecalibrate) {
      onRecalibrate();
    } else {
      setIsRecalibrateModalOpen(true);
    }
  };

  const handlePickRecalibrateImage = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Se requiere acceso a la cámara para capturar tu fotografía frontal.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Se requiere acceso a la galería para seleccionar una fotografía.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsAnalyzing(true);
      const asset = result.assets[0];
      let b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (manipulated.base64) {
          b64 = `data:image/jpeg;base64,${manipulated.base64}`;
        }
      } catch (mErr) {
        console.warn('[ColorStudioScreen] Advertencia optimizando imagen:', mErr);
      }

      // 1. Invocar Gemini Vision en backend
      const colorRes = await analyzeColorimetry(b64);
      if (!colorRes.success || !colorRes.data) {
        throw new Error(colorRes.error || 'No fue posible extraer la colorimetría de la imagen.');
      }

      const updatedProfile = colorRes.data;
      if (updatedProfile.is_valid_image === false || String(updatedProfile.is_valid_image).toLowerCase() === 'false') {
        const valMsg =
          updatedProfile.validation_error_message ||
          'Esta imagen no parece ser de una persona. Por favor sube una foto tuya.';
        const valErr: any = new Error(valMsg);
        valErr.status = 400;
        throw valErr;
      }

      // 2. Persistir en backend endpoint PUT /api/users/colorimetry
      const token = await getAuthToken();
      if (token) {
        await updateUserColorimetry({ color_profile: updatedProfile }, token).catch((err) => {
          console.warn('[ColorStudioScreen] Error al sincronizar colorimetría con backend:', err);
        });
      }

      // 3. Actualizar UserContext & SecureStore/localStorage
      updateColorProfile(updatedProfile);
      setIsRecalibrateModalOpen(false);

      Alert.alert(
        '¡Análisis Completado!',
        `Se ha detectado tu estación: ${updatedProfile.season}.\nPaleta asignada: ${updatedProfile.palette_name || updatedProfile.season}`
      );
    } catch (err: any) {
      console.error('[ColorStudioScreen] Error en recalibración:', err);
      const isValidationErr =
        err?.status === 400 ||
        (err?.message &&
          (err.message.toLowerCase().includes('persona') ||
            err.message.toLowerCase().includes('rostro') ||
            err.message.toLowerCase().includes('imagen')));
      Alert.alert(
        isValidationErr ? 'Foto no válida' : 'Error',
        err?.message || 'Ocurrió un error al procesar la imagen.'
      );
    } finally {
      setIsAnalyzing(false);
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

  const handleSelectHarmoniousGarment = (garment: Garment) => {
    if (navigation) {
      navigation.navigate('FittingRoom', { garmentId: garment.id });
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
                        activeHex || recommendedColors[0] || colors.primaryText,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Orbiting spectral color dots */}
            <View style={styles.orbitRow}>
              {recommendedColors.slice(0, 5).map((hex, i) => (
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
                    backgroundColor: typeof colorProfile?.skin_tone === 'string' && colorProfile.skin_tone.trim()
                      ? colorProfile.skin_tone.split(' ')[0]
                      : '#E8BEAC',
                    borderColor: colors.borderLight,
                  },
                ]}
              />
              <View style={styles.toneTextCol}>
                <Text style={[styles.toneTypeLabel, { color: colors.tertiaryText }]}>
                  TONO DE PIEL
                </Text>
                <Text style={[styles.toneValueText, { color: colors.primaryText }]} numberOfLines={1}>
                  {colorProfile?.skin_tone || '#E8BEAC'}
                </Text>
              </View>
            </GlassCard>

            {/* Cabello */}
            <GlassCard style={styles.baseToneCard}>
              <View
                style={[
                  styles.toneCircularSwatch,
                  {
                    backgroundColor: typeof colorProfile?.hair_color === 'string' && colorProfile.hair_color.trim()
                      ? colorProfile.hair_color.split(' ')[0]
                      : '#2C1B18',
                    borderColor: colors.borderLight,
                  },
                ]}
              />
              <View style={styles.toneTextCol}>
                <Text style={[styles.toneTypeLabel, { color: colors.tertiaryText }]}>
                  COLOR DE CABELLO
                </Text>
                <Text style={[styles.toneValueText, { color: colors.primaryText }]} numberOfLines={1}>
                  {colorProfile?.hair_color || '#2C1B18'}
                </Text>
              </View>
            </GlassCard>

            {/* Ojos si está disponible */}
            {colorProfile?.eye_color ? (
              <GlassCard style={styles.baseToneCard}>
                <View
                  style={[
                    styles.toneCircularSwatch,
                    {
                      backgroundColor: typeof colorProfile.eye_color === 'string' && colorProfile.eye_color.trim()
                        ? colorProfile.eye_color.split(' ')[0]
                        : '#3B261C',
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

        {/* SECCIÓN EDUCATIVA: Guía de Estilismo de la Estación */}
        <View style={styles.sectionWrapper}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              {educationalInfo.familyTitle}
            </Text>
            <View style={[styles.taglineBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="ribbon-outline" size={13} color={colors.primary} />
              <Text style={[styles.taglineText, { color: colors.primaryText }]}>
                {educationalInfo.tagline}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            {educationalInfo.undertoneDescription}
          </Text>

          {/* Tarjeta de Guía Editorial */}
          <GlassCard style={styles.editorialCard}>
            <Text style={[styles.blockTitle, { color: colors.primaryText }]}>
              Claves de Estilo para tu Estación
            </Text>
            <View style={styles.tipsList}>
              {educationalInfo.stylingTips.map((tip, idx) => (
                <View key={`tip-${idx}`} style={styles.tipRow}>
                  <View style={[styles.tipBullet, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.tipText, { color: colors.primaryText }]}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>

            {/* Metales recomendados */}
            <View style={styles.metalRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <View style={styles.metalTextCol}>
                <Text style={[styles.metalLabel, { color: colors.tertiaryText }]}>
                  JOYERÍA & METALES RECOMENDADOS
                </Text>
                <Text style={[styles.metalValue, { color: colors.primaryText }]}>
                  {educationalInfo.recommendedMetals}
                </Text>
              </View>
            </View>

            {/* Combinaciones clave */}
            <View style={styles.combosSection}>
              <Text style={[styles.comboLabel, { color: colors.tertiaryText }]}>
                COMBINACIONES CROMÁTICAS CLAVE
              </Text>
              <View style={styles.comboChipsWrap}>
                {educationalInfo.bestCombinations.map((combo, idx) => (
                  <View key={`combo-${idx}`} style={[styles.comboChip, glassSurface]}>
                    <Ionicons name="color-palette-outline" size={12} color={colors.primary} />
                    <Text style={[styles.comboChipText, { color: colors.primaryText }]}>
                      {combo}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Circular Swatches: Recommended Garment Colors */}
        <View style={styles.sectionWrapper}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              Colores Óptimos de Ropa
            </Text>
            <Text style={[styles.badgeCount, { color: colors.tertiaryText }]}>
              {recommendedColors.length} TONOS
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Selecciona una muestra circular para ver el código HEX de diseño textil
          </Text>

          <View style={styles.swatchesContainer}>
            {recommendedColors.map((hex, index) => {
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
        {colorsToAvoid.length > 0 ? (
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              Colores Desaconsejados
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
              Matices que restan luminosidad o generan tono apagado en tu subtono
            </Text>

            <View style={styles.avoidChipsRow}>
              {colorsToAvoid.map((hex, i) => (
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

        {/* RECOMENDACIONES DE PRENDAS ARMONIOSAS */}
        <View style={styles.sectionWrapper}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              Prendas de tu Armario Armonizadas
            </Text>
            <Text style={[styles.badgeCount, { color: colors.tertiaryText }]}>
              {harmoniousGarments.length} DE {(wardrobe_items || []).length} PRENDAS
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Prendas que armonizan con tu paleta estacional mediante comparación perceptual de color
          </Text>

          {harmoniousGarments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.garmentCarouselContainer}
            >
              {harmoniousGarments.map((garment) => (
                <TouchableOpacity
                  key={`harm-${garment.id}`}
                  style={[styles.garmentCard, glassSurface]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectHarmoniousGarment(garment)}
                >
                  <View style={styles.garmentImageWrap}>
                    {garment.imageUrl ? (
                      <Image
                        source={{ uri: garment.imageUrl }}
                        style={styles.garmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.garmentPlaceholder}>
                        <Ionicons name="shirt-outline" size={28} color={colors.secondaryText} />
                      </View>
                    )}
                    <View style={styles.harmonyBadgePill}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.harmonyBadgeText}>Armonía</Text>
                    </View>
                  </View>

                  <View style={styles.garmentMeta}>
                    <View style={styles.garmentColorRow}>
                      <View
                        style={[
                          styles.garmentColorDot,
                          {
                            backgroundColor: garment.colorHex || '#000000',
                            borderColor: colors.borderLight,
                          },
                        ]}
                      />
                      <Text style={[styles.garmentCategoryText, { color: colors.tertiaryText }]}>
                        {garment.category?.toUpperCase() || 'PRENDA'}
                      </Text>
                    </View>
                    <Text
                      style={[styles.garmentNameText, { color: colors.primaryText }]}
                      numberOfLines={1}
                    >
                      {garment.name}
                    </Text>
                    <Text style={[styles.tryOnLink, { color: colors.primary }]}>
                      Probar en 3D →
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <GlassCard style={styles.emptyHarmoniousCard}>
              <Ionicons name="sparkles-outline" size={28} color={colors.tertiaryText} />
              <Text style={[styles.emptyHarmoniousTitle, { color: colors.primaryText }]}>
                Aún no hay prendas armonizadas
              </Text>
              <Text style={[styles.emptyHarmoniousBody, { color: colors.secondaryText }]}>
                Ninguna de tus prendas actuales coincide de forma óptima con tu estación. Añade prendas con los tonos sugeridos arriba para verlas aquí.
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: colors.primaryText }]}
                onPress={() => navigation?.navigate('AddGarment')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.bg} />
                <Text style={[styles.emptyAddBtnText, { color: colors.bg }]}>
                  Añadir Prenda a Armario
                </Text>
              </TouchableOpacity>
            </GlassCard>
          )}
        </View>

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

      {/* MODAL IN-SCREEN: Recalibración con Cámara / Galería */}
      <Modal
        visible={isRecalibrateModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isAnalyzing) {
            setIsRecalibrateModalOpen(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContainer}>
            {isAnalyzing ? (
              <View style={styles.analyzingWrapper}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.analyzingTitle, { color: colors.primaryText }]}>
                  Analizando Colorimetría con IA
                </Text>
                <Text style={[styles.analyzingSubtitle, { color: colors.secondaryText }]}>
                  Gemini Vision está examinando tu tono de piel, contraste de cabello y estación cromática óptima...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalTitleBox}>
                    <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                      Recalibrar Colorimetría
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
                      Captura o selecciona una foto frontal iluminada con luz natural uniforme para recalcular tu paleta.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsRecalibrateModalOpen(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalOptionsCol}>
                  <TouchableOpacity
                    style={[styles.modalActionOption, glassSurface]}
                    onPress={() => handlePickRecalibrateImage('camera')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalOptionIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                      <Ionicons name="camera-outline" size={22} color={colors.primaryText} />
                    </View>
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={[styles.modalOptionTitle, { color: colors.primaryText }]}>
                        Tomar Foto con Cámara
                      </Text>
                      <Text style={[styles.modalOptionDesc, { color: colors.secondaryText }]}>
                        Foto frontal con rostro despejado
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.tertiaryText} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionOption, glassSurface, { marginTop: Spacing.sm }]}
                    onPress={() => handlePickRecalibrateImage('gallery')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalOptionIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                      <Ionicons name="images-outline" size={22} color={colors.primaryText} />
                    </View>
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={[styles.modalOptionTitle, { color: colors.primaryText }]}>
                        Elegir de la Galería
                      </Text>
                      <Text style={[styles.modalOptionDesc, { color: colors.secondaryText }]}>
                        Selecciona un retrato nítido existente
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.tertiaryText} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsRecalibrateModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.secondaryText }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        </View>
      </Modal>
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
    paddingTop: Spacing.md,
    paddingBottom: 95,
  },
  glassHeroCard: {
    marginHorizontal: SCREEN_GUTTER,
    marginTop: Spacing.xs,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
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
    ...Typography.headlineMd,
    fontSize: 24,
    lineHeight: 32,
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
    marginHorizontal: SCREEN_GUTTER,
    marginTop: Spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    ...Typography.headlineMd,
    fontSize: 18,
    lineHeight: 24,
  },
  badgeCount: {
    ...Typography.labelSm,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    ...Typography.bodySm,
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
    marginHorizontal: SCREEN_GUTTER,
    marginTop: Spacing.md,
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
    width: (Dimensions.get('window').width - SCREEN_GUTTER * 2 - Spacing.sm * 3) / 4,
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
    marginHorizontal: SCREEN_GUTTER,
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
    marginHorizontal: SCREEN_GUTTER,
    marginTop: Spacing.lg,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  taglineText: {
    ...Typography.micro,
    fontSize: 11,
    fontWeight: '600',
  },
  editorialCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  blockTitle: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  tipsList: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipText: {
    ...Typography.bodySm,
    flex: 1,
    lineHeight: 18,
  },
  metalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    marginBottom: Spacing.sm,
  },
  metalTextCol: {
    flex: 1,
  },
  metalLabel: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
  },
  metalValue: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 1,
  },
  combosSection: {
    marginTop: Spacing.xs,
  },
  comboLabel: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 6,
  },
  comboChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  comboChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 5,
  },
  comboChipText: {
    ...Typography.micro,
    fontSize: 11,
    fontWeight: '500',
  },
  garmentCarouselContainer: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  garmentCard: {
    width: 150,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  garmentImageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.04)',
    position: 'relative',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  garmentPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harmonyBadgePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  harmonyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  garmentMeta: {
    padding: Spacing.sm,
  },
  garmentColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  garmentColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  garmentCategoryText: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  garmentNameText: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 1,
  },
  tryOnLink: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyHarmoniousCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyHarmoniousTitle: {
    ...Typography.headlineSm,
    fontSize: 15,
    marginTop: Spacing.sm,
  },
  emptyHarmoniousBody: {
    ...Typography.bodySm,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    gap: 6,
  },
  emptyAddBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SCREEN_GUTTER * 2,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  analyzingWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  analyzingTitle: {
    ...Typography.headlineSm,
    marginTop: Spacing.md,
  },
  analyzingSubtitle: {
    ...Typography.bodySm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  modalTitleBox: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  modalTitle: {
    ...Typography.headlineSm,
    fontSize: 18,
  },
  modalSubtitle: {
    ...Typography.bodySm,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalOptionsCol: {
    marginTop: Spacing.xs,
  },
  modalActionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  modalOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  modalOptionTextWrap: {
    flex: 1,
  },
  modalOptionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 14,
  },
  modalOptionDesc: {
    ...Typography.micro,
    fontSize: 11,
    marginTop: 2,
  },
  modalCancelBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modalCancelBtnText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
