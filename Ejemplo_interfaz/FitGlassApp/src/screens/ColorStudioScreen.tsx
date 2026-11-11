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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Typography, Spacing, Radius } from '../theme';
import { LiquidGlassView } from '../components/LiquidGlassView';
import { VibrantBackground } from '../components/VibrantBackground';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { getAuthToken } from '../services/auth/secureStorage';
import { analyzeColorimetry, updateUserColorimetry } from '../services/ai/garmentAnalyzer';
import { logHandledError } from '../utils/logging';
import { colorLabel, colorNameFor } from '../utils/colorNames.ts';
import { useColorDisplayMode } from '../utils/colorDisplayPref';
import { filterHarmoniousGarments, getSeasonEducationalInfo } from '../utils/colorHarmony';
import { Garment } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCREEN_GUTTER = 16;

const extractHexSafe = (val?: string | null, fallback: string = '#E8BEAC'): string => {
  if (!val || typeof val !== 'string') return fallback;
  const match = val.match(/#[0-9A-Fa-f]{6}\b/);
  if (match) return match[0];
  const first = val.trim().split(' ')[0];
  return first.startsWith('#') ? first : fallback;
};

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
  const { t, language } = useTranslation();
  const { colors, isDark } = useTheme();
  const { colorProfile, wardrobe_items, updateColorProfile } = useUser();

  const [isRecalibrateModalOpen, setIsRecalibrateModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);
  // Ver los colores como NOMBRE (por defecto) o como CÓDIGO HEX; se recuerda entre sesiones
  const [displayMode, setDisplayMode] = useColorDisplayMode();

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

  const educationalInfo = useMemo(() => {
    return getSeasonEducationalInfo(colorProfile?.season);
  }, [colorProfile?.season]);

  const harmoniousGarments = useMemo(() => {
    return filterHarmoniousGarments(wardrobe_items || [], recommendedColors, 72);
  }, [wardrobe_items, recommendedColors]);

  const toggleGuide = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsGuideExpanded(!isGuideExpanded);
  };

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
          Alert.alert(t('perm.title'), t('cs.perm.camera'));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('perm.title'), t('perm.gallery'));
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

      const colorRes = await analyzeColorimetry(b64);
      if (!colorRes.success || !colorRes.data) {
        throw new Error(colorRes.error || t('cs.err.extract'));
      }

      const updatedProfile = colorRes.data;
      if (updatedProfile.is_valid_image === false || String(updatedProfile.is_valid_image).toLowerCase() === 'false') {
        const valMsg =
          updatedProfile.validation_error_message ||
          t('auth.invalidImage.default');
        const valErr: any = new Error(valMsg);
        valErr.status = 400;
        throw valErr;
      }

      const token = await getAuthToken();
      if (token) {
        await updateUserColorimetry({ color_profile: updatedProfile }, token).catch((err) => {
          console.warn('[ColorStudioScreen] Error al sincronizar colorimetría con backend:', err);
        });
      }

      updateColorProfile(updatedProfile);
      setIsRecalibrateModalOpen(false);
      setActiveHex(updatedProfile.recommended_colors?.[0] || null);

      Alert.alert(
        t('cs.done.title'),
        t('cs.done.message', { season: updatedProfile.season, palette: updatedProfile.palette_name || updatedProfile.season })
      );
    } catch (err: any) {
      logHandledError('[ColorStudioScreen] Error en recalibración:', err);
      const isValidationErr =
        err?.status === 400 ||
        (err?.message &&
          (err.message.toLowerCase().includes('person') ||
            err.message.toLowerCase().includes('rostro') ||
            err.message.toLowerCase().includes('image')));
      Alert.alert(
        isValidationErr ? t('cs.err.invalidPhoto') : t('common.error'),
        err?.message || t('cs.err.process')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHarmoniousGarment = (garment: Garment) => {
    if (navigation) {
      navigation.navigate('FittingRoom', { garmentId: garment.id });
    }
  };

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
        {/* HERO CARD REDISEÑADA: Identidad Cromática */}
        <LiquidGlassView style={styles.glassHeroCard} intensity={85} borderRadius={Radius.xl}>
          
          <View style={styles.seasonTagRow}>
            <View style={styles.headerPill}>
               <Ionicons name="sparkles" size={14} color={colors.primaryText} />
               <Text style={[styles.headerPillText, { color: colors.primaryText }]}>
                 {t('cs.profileBadge')}
               </Text>
            </View>
          </View>

          <Text style={[styles.paletteName, { color: colors.primaryText }]}>
            {colorProfile.season}
          </Text>

          {/* Selector: ver los colores por nombre o por código */}
          <View style={[styles.displayToggle, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]}>
            {([
              { key: 'name', label: t('cs.display.name'), icon: 'text-outline' },
              { key: 'code', label: t('cs.display.code'), icon: 'code-slash-outline' },
            ] as const).map((option) => {
              const active = displayMode === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Ver colores por ${option.label.toLowerCase()}`}
                  onPress={() => setDisplayMode(option.key)}
                  activeOpacity={0.8}
                  style={[styles.displayToggleOption, active && { backgroundColor: colors.primary }]}
                >
                  <Ionicons name={option.icon} size={14} color={active ? colors.ctaText : colors.secondaryText} />
                  <Text style={[styles.displayToggleText, { color: active ? colors.ctaText : colors.secondaryText }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* LA PALETA ES LA PROTAGONISTA (Fila de bloques de color) */}
          <View style={styles.paletteRow}>
            {recommendedColors.map((hex, index) => {
              const isSelected = activeHex === hex;
              return (
                <TouchableOpacity
                  key={`${hex}-${index}`}
                  style={styles.paletteBlockWrapper}
                  onPress={() => setActiveHex(hex)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.paletteBlock,
                      { backgroundColor: hex },
                      isSelected && styles.paletteBlockSelected
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.buttons.overlayText} style={styles.paletteCheckIcon} />
                    )}
                  </View>
                  <Text
                    style={[styles.paletteHexText, { color: isSelected ? colors.primaryText : colors.tertiaryText }]}
                    numberOfLines={2}
                  >
                    {displayMode === 'code' ? hex.replace('#', '').toUpperCase() : colorNameFor(hex, 'general', language)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeHex ? (
            <View style={styles.selectedColorRow}>
              <View style={[styles.selectedColorDot, { backgroundColor: activeHex, borderColor: colors.borderLight }]} />
              <Text style={[styles.selectedColorText, { color: colors.primaryText }]} numberOfLines={1}>
                {colorNameFor(activeHex, 'general', language)}
                <Text style={{ color: colors.tertiaryText }}>{`  ·  ${activeHex.toUpperCase()}`}</Text>
              </Text>
            </View>
          ) : null}

          <Text style={[styles.paletteDesc, { color: colors.secondaryText }]}>
            "{colorProfile.description}"
          </Text>

          {/* Fisiología Base (Piel, Cabello, Ojos) */}
          <View style={[styles.baseTonesRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <View style={styles.toneCompactItem}>
              <View style={[styles.toneCompactSwatch, { backgroundColor: extractHexSafe(colorProfile?.skin_tone, '#E8BEAC') }]} />
              <View>
                <Text style={[styles.toneLabelMini, { color: colors.tertiaryText }]}>{t('cs.skin')}</Text>
                <Text style={[styles.toneValueMini, { color: colors.primaryText }]}>{displayMode === 'code' ? extractHexSafe(colorProfile?.skin_tone, 'N/A') : colorLabel(colorProfile?.skin_tone, 'name', 'skin', language)}</Text>
              </View>
            </View>
            <View style={styles.toneCompactItem}>
              <View style={[styles.toneCompactSwatch, { backgroundColor: extractHexSafe(colorProfile?.hair_color, '#2C1B18') }]} />
              <View>
                <Text style={[styles.toneLabelMini, { color: colors.tertiaryText }]}>{t('cs.hair')}</Text>
                <Text style={[styles.toneValueMini, { color: colors.primaryText }]}>{displayMode === 'code' ? extractHexSafe(colorProfile?.hair_color, 'N/A') : colorLabel(colorProfile?.hair_color, 'name', 'hair', language)}</Text>
              </View>
            </View>
            {colorProfile?.eye_color && (
              <View style={styles.toneCompactItem}>
                <View style={[styles.toneCompactSwatch, { backgroundColor: extractHexSafe(colorProfile?.eye_color, '#3B261C') }]} />
                <View>
                  <Text style={[styles.toneLabelMini, { color: colors.tertiaryText }]}>{t('cs.eyes')}</Text>
                  <Text style={[styles.toneValueMini, { color: colors.primaryText }]}>{displayMode === 'code' ? extractHexSafe(colorProfile?.eye_color, 'N/A') : colorLabel(colorProfile?.eye_color, 'name', 'eye', language)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* NUEVO BOTÓN DE RECALIBRAR PROMINENTE */}
          <TouchableOpacity 
            style={[
              styles.prominentRecalibrateBtn, 
              { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
            ]} 
            onPress={handleRecalibrate} 
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={18} color={colors.primaryText} />
            <Text style={[styles.prominentRecalibrateText, { color: colors.primaryText }]}>
              {t('cs.recalibrateAI')}
            </Text>
          </TouchableOpacity>

        </LiquidGlassView>

        {/* ACORDEÓN: Guía de Estilismo (Progressive Disclosure) */}
        <LiquidGlassView style={[styles.explanationCard, { padding: 0, overflow: 'hidden' }]} intensity={75} borderRadius={Radius.lg}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            onPress={toggleGuide}
            activeOpacity={0.8}
          >
            <View style={styles.explanationHeader}>
              <Ionicons name="ribbon-outline" size={20} color={colors.primaryText} />
              <Text style={[styles.explanationLabel, { color: colors.primaryText }]}>
                Guía de Estilismo {educationalInfo.familyTitle}
              </Text>
            </View>
            <Ionicons name={isGuideExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.secondaryText} />
          </TouchableOpacity>

          {isGuideExpanded && (
            <View style={styles.accordionBody}>
              <Text style={[styles.accordionSubtitle, { color: colors.secondaryText }]}>
                {educationalInfo.undertoneDescription}
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

              <View style={styles.metalRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                <View style={styles.metalTextCol}>
                  <Text style={[styles.metalLabel, { color: colors.tertiaryText }]}>
                    {t('cs.metals')}
                  </Text>
                  <Text style={[styles.metalValue, { color: colors.primaryText }]}>
                    {educationalInfo.recommendedMetals}
                  </Text>
                </View>
              </View>

              <View style={styles.combosSection}>
                <Text style={[styles.comboLabel, { color: colors.tertiaryText }]}>
                  {t('cs.combos')}
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

              {colorsToAvoid.length > 0 && (
                <View style={styles.avoidSection}>
                   <Text style={[styles.comboLabel, { color: colors.tertiaryText, marginTop: Spacing.md }]}>
                    {t('cs.avoid')}
                  </Text>
                  <View style={styles.avoidChipsRow}>
                    {colorsToAvoid.map((hex, i) => (
                      <View key={`avoid-${i}`} style={[styles.avoidChip, glassSurface]}>
                        <View style={[styles.avoidDot, { backgroundColor: hex }]} />
                        <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginLeft: 4 }} />
                        <Text style={[styles.avoidHexText, { color: colors.secondaryText }]}>
                          {displayMode === 'code' ? hex.toUpperCase() : colorNameFor(hex, 'general', language)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </LiquidGlassView>

        {/* SECCIÓN: Prendas Armonizadas */}
        <View style={styles.sectionWrapper}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              {t('cs.harmonized.title')}
            </Text>
            <Text style={[styles.badgeCount, { color: colors.tertiaryText }]}>
              {t('cs.harmonized.count', { count: harmoniousGarments.length })}
            </Text>
          </View>

          {harmoniousGarments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.garmentCarouselContainer}
            >
              {harmoniousGarments.map((garment) => (
                <TouchableOpacity
                  key={`harm-${garment.id}`}
                  activeOpacity={0.85}
                  onPress={() => handleSelectHarmoniousGarment(garment)}
                >
                  <LiquidGlassView style={styles.garmentCard} intensity={80} borderRadius={Radius.lg}>
                    <View style={styles.garmentImageWrap}>
                      {garment.imageUrl ? (
                        <Image source={{ uri: garment.imageUrl }} style={styles.garmentImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.garmentPlaceholder}>
                          <Ionicons name="shirt-outline" size={28} color={colors.secondaryText} />
                        </View>
                      )}
                      <View style={styles.harmonyBadgePill}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={styles.harmonyBadgeText}>{t('savedLook.harmony')}</Text>
                      </View>
                    </View>

                    <View style={styles.garmentMeta}>
                      <View style={styles.garmentColorRow}>
                        <View style={[styles.garmentColorDot, { backgroundColor: garment.colorHex || '#000000', borderColor: colors.borderLight }]} />
                        <Text style={[styles.garmentCategoryText, { color: colors.tertiaryText }]}>
                          {garment.category?.toUpperCase() || 'PRENDA'}
                        </Text>
                      </View>
                      <Text style={[styles.garmentNameText, { color: colors.primaryText }]} numberOfLines={1}>
                        {garment.name}
                      </Text>
                      <Text style={[styles.tryOnLink, { color: colors.primary }]}>
                        Probar en 3D →
                      </Text>
                    </View>
                  </LiquidGlassView>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <LiquidGlassView style={styles.emptyHarmoniousCard} intensity={75} borderRadius={Radius.lg}>
              <Ionicons name="sparkles-outline" size={28} color={colors.tertiaryText} />
              <Text style={[styles.emptyHarmoniousTitle, { color: colors.primaryText }]}>
                {t('cs.harmonized.emptyTitle')}
              </Text>
              <Text style={[styles.emptyHarmoniousBody, { color: colors.secondaryText }]}>
                {t('cs.harmonized.emptyBody')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: colors.primaryText }]}
                onPress={() => navigation?.navigate('AddGarment')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.bg} />
                <Text style={[styles.emptyAddBtnText, { color: colors.bg }]}>
                  {t('home.addClothing')}
                </Text>
              </TouchableOpacity>
            </LiquidGlassView>
          )}
        </View>
      </ScrollView>

      {/* MODAL IN-SCREEN: Recalibración */}
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
          <LiquidGlassView style={styles.modalContainer} intensity={90} borderRadius={Radius.xl}>
            {isAnalyzing ? (
              <View style={styles.analyzingWrapper}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.analyzingTitle, { color: colors.primaryText }]}>
                  {t('cs.analyzing.title')}
                </Text>
                <Text style={[styles.analyzingSubtitle, { color: colors.secondaryText }]}>
                  {t('cs.analyzing.body')}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalTitleBox}>
                    <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                      {t('cs.modal.title')}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
                      {t('cs.modal.subtitle')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsRecalibrateModalOpen(false)} style={styles.modalCloseBtn}>
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
                        {t('cs.modal.camera')}
                      </Text>
                      <Text style={[styles.modalOptionDesc, { color: colors.secondaryText }]}>
                        {t('cs.modal.cameraDesc')}
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
                        {t('cs.modal.gallery')}
                      </Text>
                      <Text style={[styles.modalOptionDesc, { color: colors.secondaryText }]}>
                        {t('cs.modal.galleryDesc')}
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
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </LiquidGlassView>
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
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  headerPillText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paletteName: {
    ...Typography.headlineMd,
    fontFamily: Typography.bodoni.bold,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: Spacing.lg,
  },
  
  // PALETA PROTAGONISTA (BLOQUES)
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  paletteBlockWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  paletteBlock: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paletteBlockSelected: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  paletteCheckIcon: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  paletteHexText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    minHeight: 26,
  },
  displayToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
    marginBottom: Spacing.md,
  },
  displayToggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 34,
    borderRadius: 999,
  },
  displayToggleText: { fontSize: 13, fontWeight: '700' },
  selectedColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  selectedColorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  selectedColorText: { flex: 1, fontSize: 15, fontWeight: '700' },

  paletteDesc: {
    ...Typography.bodySm,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  baseTonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginBottom: Spacing.lg,
  },
  toneCompactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toneCompactSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  toneLabelMini: {
    ...Typography.micro,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toneValueMini: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },

  // NUEVO BOTÓN DE RECALIBRAR DESTACADO
  prominentRecalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.05)', // Fondo sutil que resalta sobre el vidrio
  },
  prominentRecalibrateText: {
    ...Typography.labelMd,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  explanationCard: {
    marginHorizontal: SCREEN_GUTTER,
    marginTop: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  explanationLabel: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontSize: 14,
  },
  accordionBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    paddingTop: Spacing.md,
  },
  accordionSubtitle: {
    ...Typography.bodySm,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
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
  avoidSection: {
    marginTop: Spacing.sm,
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
  sectionWrapper: {
    marginHorizontal: SCREEN_GUTTER,
    marginTop: Spacing.xl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  sectionHeading: {
    ...Typography.headlineMd,
    fontFamily: Typography.bodoni.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  badgeCount: {
    ...Typography.labelSm,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
  },
  garmentCarouselContainer: {
    gap: Spacing.sm,
    paddingVertical: 4,
    marginTop: Spacing.xs,
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
    marginTop: Spacing.sm,
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
