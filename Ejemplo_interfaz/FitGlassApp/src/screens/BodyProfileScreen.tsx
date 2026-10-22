import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Typography, Spacing, Radius } from '../theme';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { analyzeColorimetry, generateAvatar } from '../services/ai/garmentAnalyzer';

interface BodyProfileScreenProps {
  navigation?: any;
  onComplete?: () => void;
  onSkip?: () => void;
}

const ONBOARDING_STEPS = [
  { id: 1, title: 'Calibrando captura biométrica', detail: 'Verificando resolución y alineación frontal...' },
  { id: 2, title: 'Análisis Gemini Vision', detail: 'Extrayendo tono de piel, color de cabello y estación...' },
  { id: 3, title: 'Extrusión 3D en Tripo3D', detail: 'Construyendo malla anatómica y texturas PBR...' },
  { id: 4, title: 'Optimizando avatar_base.glb', detail: 'Empaquetando modelo tridimensional interactivo...' },
  { id: 5, title: 'Perfil biométrico listo', detail: 'Sincronizando paleta y gemelo digital en FitGlass...' },
];

export const BodyProfileScreen: React.FC<BodyProfileScreenProps> = ({
  navigation,
  onComplete,
  onSkip,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const {
    updateColorProfile,
    updateAvatarUrl,
    setUserPhotoUri,
    completeOnboarding,
  } = useUser();

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.1)).current;

  // Animación de pulso continuo durante el procesamiento
  useEffect(() => {
    let pulse: Animated.CompositeAnimation | null = null;
    if (isProcessing) {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (pulse) pulse.stop();
    };
  }, [isProcessing]);

  // Tomar fotografía frontal con cámara
  const handleLaunchCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso de Cámara',
          'Se requiere acceso a la cámara para capturar tu fotografía frontal y facial.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setImageBase64(b64);
      }
    } catch (err: any) {
      console.error('[BodyProfileScreen] Error de cámara:', err);
      Alert.alert('Error', 'No se pudo inicializar la cámara del dispositivo.');
    }
  };

  // Seleccionar fotografía de la galería
  const handleLaunchGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso de Galería',
          'Se requiere acceso a tus imágenes para seleccionar tu fotografía.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setImageBase64(b64);
      }
    } catch (err: any) {
      console.error('[BodyProfileScreen] Error de galería:', err);
      Alert.alert('Error', 'No se pudo acceder a las fotos del dispositivo.');
    }
  };

  // Pipeline generativo de FASE 4: Colorimetría + Avatar 3D
  const handleRunBiometricPipeline = async () => {
    if (!imageBase64 && !selectedImageUri) {
      Alert.alert('Foto requerida', 'Por favor toma o selecciona una foto frontal antes de continuar.');
      return;
    }

    const imageToSend = imageBase64 || selectedImageUri!;
    setIsProcessing(true);
    setError(null);
    setIsSuccess(false);
    setCurrentStepIndex(0);

    Animated.timing(progressAnim, {
      toValue: 0.25,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    try {
      // Paso 1: Calibración
      setCurrentStepIndex(0);
      await new Promise((res) => setTimeout(res, 600));

      // Paso 2: Análisis de Colorimetría con Gemini Vision
      setCurrentStepIndex(1);
      Animated.timing(progressAnim, {
        toValue: 0.55,
        duration: 3500,
        useNativeDriver: false,
      }).start();

      let colorimetryResult = null;
      try {
        console.log('[BodyProfileScreen] Consultando /api/colorimetry/analyze...');
        const colorRes = await analyzeColorimetry(imageToSend);
        if (colorRes.success && colorRes.data) {
          colorimetryResult = colorRes.data;
          updateColorProfile(colorRes.data);
        }
      } catch (colorErr: any) {
        console.warn('[BodyProfileScreen] Colorimetría aviso:', colorErr?.message);
      }

      // Paso 3 & 4: Generación de Avatar 3D con Tripo3D
      setCurrentStepIndex(2);
      Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: 4000,
        useNativeDriver: false,
      }).start();

      let avatarUrl = '';
      try {
        console.log('[BodyProfileScreen] Consultando /api/avatar/generate...');
        const avatarRes = await generateAvatar(imageToSend);
        avatarUrl = avatarRes.avatar_url;
        updateAvatarUrl(avatarRes.avatar_url);
      } catch (avatarErr: any) {
        console.warn('[BodyProfileScreen] Avatar aviso (usando modelo 3D fallback):', avatarErr?.message);
        avatarUrl = '';
        updateAvatarUrl('');
      }

      // Paso 5: Finalización y guardado en UserContext
      setCurrentStepIndex(4);
      Animated.timing(progressAnim, {
        toValue: 1.0,
        duration: 600,
        useNativeDriver: false,
      }).start();

      if (selectedImageUri) {
        setUserPhotoUri(selectedImageUri);
      }
      completeOnboarding({
        avatarUrl,
        colorProfile: colorimetryResult || undefined,
        photoUri: selectedImageUri || undefined,
      });

      setIsProcessing(false);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[BodyProfileScreen] Fallo general:', err);
      setIsProcessing(false);
      setError(err?.message || 'Error inesperado durante la calibración biométrica.');
    }
  };

  const handleGoToColorStudio = () => {
    if (onComplete) {
      onComplete();
    } else if (navigation) {
      navigation.navigate('ColorStudio');
    }
  };

  const handleGoToMainTabs = () => {
    if (navigation) {
      navigation.navigate('MainTabs');
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else if (navigation) {
      navigation.navigate('MainTabs');
    }
  };

  // ==========================================
  // RENDER: PANTALLA DE PROCESAMIENTO / ÉXITO
  // ==========================================
  if (isProcessing || isSuccess || error) {
    const currentStep = ONBOARDING_STEPS[currentStepIndex] || ONBOARDING_STEPS[0];

    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <GlassCard style={styles.processingCard}>
          {/* Vista previa miniatura de la foto */}
          {selectedImageUri ? (
            <View style={[styles.photoThumbnail, { borderColor: colors.borderLight }]}>
              <Image source={{ uri: selectedImageUri }} style={styles.thumbnailImg} />
            </View>
          ) : null}

          {/* Icono central de estado con pulso */}
          <Animated.View
            style={[
              styles.stateCircle,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderLight,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Ionicons
              name={
                isSuccess
                  ? 'checkmark-circle'
                  : error
                  ? 'alert-circle-outline'
                  : 'scan-circle-outline'
              }
              size={48}
              color={
                isSuccess ? '#15803D' : error ? '#EF4444' : colors.primary
              }
            />
          </Animated.View>

          {/* Estado de Éxito */}
          {isSuccess ? (
            <View style={styles.resultBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                ¡Identidad Creada!
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                Tu avatar 3D ha sido sintetizado y Gemini Vision ha calibrado tu paleta de colorimetría personalizada.
              </Text>

              <View style={styles.successActions}>
                <PrimaryButton
                  label="Ver Mi Estudio de Color"
                  onPress={handleGoToColorStudio}
                  icon="color-palette-outline"
                />
                <SecondaryButton
                  label="Ir al Armario y Probador 3D"
                  onPress={handleGoToMainTabs}
                  icon="shirt-outline"
                  style={{ marginTop: Spacing.sm }}
                />
              </View>
            </View>
          ) : error ? (
            /* Estado de Error */
            <View style={styles.resultBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                Error de Calibración
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                {error}
              </Text>

              <View style={styles.errorButtonsRow}>
                <TouchableOpacity
                  style={[styles.btnAction, { backgroundColor: colors.cta }]}
                  onPress={handleRunBiometricPipeline}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color={colors.ctaText} />
                  <Text style={[styles.btnActionText, { color: colors.ctaText }]}>Reintentar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnActionSecondary, { borderColor: colors.borderLight }]}
                  onPress={() => {
                    setError(null);
                    setIsProcessing(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnActionSecondaryText, { color: colors.secondaryText }]}>
                    Cambiar Foto
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Estado de Procesamiento Activo */
            <View style={styles.activeBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                {currentStep.title}
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                {currentStep.detail}
              </Text>

              {/* Barra de progreso animada */}
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSubtle }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Lista de etapas */}
              <View style={styles.stepsList}>
                {ONBOARDING_STEPS.map((step, idx) => {
                  const isPassed = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <View key={step.id} style={styles.stepItemRow}>
                      <View
                        style={[
                          styles.stepDot,
                          isPassed
                            ? styles.stepDotPassed
                            : isCurrent
                            ? [styles.stepDotCurrent, { backgroundColor: colors.primary }]
                            : styles.stepDotPending,
                        ]}
                      >
                        {isPassed ? (
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          {
                            color: isCurrent
                              ? colors.primaryText
                              : isPassed
                              ? colors.secondaryText
                              : colors.tertiaryText,
                            fontWeight: isCurrent ? '700' : '400',
                          },
                        ]}
                      >
                        {step.title}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.latencyHint, { color: colors.tertiaryText }]}>
                Generando avatar_base.glb y armonía espectral. Este proceso toma entre 10 y 25 segundos.
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    );
  }

  // ==========================================
  // RENDER: PANTALLA PRINCIPAL DE CAPTURA
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Progreso */}
        <View style={styles.header}>
          <View style={styles.stepIndicatorRow}>
            <Text style={[styles.stepBadge, { color: colors.tertiaryText }]}>
              FASE 04 · ONBOARDING BIOMÉTRICO
            </Text>
            <View style={[styles.progressBarMini, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={[styles.progressFillMini, { backgroundColor: colors.primaryText }]} />
            </View>
          </View>

          <Text style={[Typography.largeTitle, styles.title, { color: colors.primaryText }]}>
            Escaneo Frontal
          </Text>
          <Text style={[Typography.body, styles.subtitle, { color: colors.secondaryText }]}>
            Toma una fotografía frontal clara. FitGlass AI extraerá tu avatar 3D y tu estación de colorimetría.
          </Text>
        </View>

        {/* Viewfinder con Guía Óptica Biométrico */}
        <GlassCard style={styles.viewfinderCard}>
          {selectedImageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
              <View style={styles.previewBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#8EB6C7" />
                <Text style={styles.previewBadgeText}>Fotografía Capturada</Text>
              </View>
            </View>
          ) : (
            <View style={styles.guideContainer}>
              {/* Abstract Facial/Body Silhouette Guidelines */}
              <View style={[styles.faceOvalGuide, { borderColor: colors.tiffany }]}>
                <View style={[styles.eyeLineGuide, { backgroundColor: colors.borderLight }]} />
                <View style={[styles.verticalAxisGuide, { backgroundColor: colors.borderLight }]} />
              </View>
              <View style={[styles.shoulderGuide, { borderColor: colors.borderLight }]} />

              <View style={styles.guideInstructionBox}>
                <Ionicons name="camera-reverse-outline" size={24} color={colors.primary} />
                <Text style={[styles.guideInstructionText, { color: colors.secondaryText }]}>
                  Encuadra tu rostro y torso con buena iluminación y fondo neutro
                </Text>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Selector de Captura: Cámara y Galería */}
        <View style={styles.buttonsGroup}>
          <TouchableOpacity
            style={[styles.cameraActionBtn, { backgroundColor: colors.cta }]}
            onPress={handleLaunchCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color={colors.ctaText} />
            <Text style={[styles.cameraActionText, { color: colors.ctaText }]}>
              {selectedImageUri ? 'Tomar Otra Foto con Cámara' : 'Tomar Foto con Cámara'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.galleryActionBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
            onPress={handleLaunchGallery}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.galleryActionText, { color: colors.primaryText }]}>
              Elegir de la Fototeca
            </Text>
          </TouchableOpacity>
        </View>

        {/* Consejos de captura */}
        <GlassCard style={styles.tipsCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.tipsCardText, { color: colors.secondaryText }]}>
            Para una colorimetría precisa, evita sombras duras, lentes oscuros y filtros artificiales.
          </Text>
        </GlassCard>
      </ScrollView>

      {/* Footer de Confirmación */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bg, borderTopColor: colors.borderLight },
        ]}
      >
        <PrimaryButton
          label="Analizar y Generar Avatar 3D"
          onPress={handleRunBiometricPipeline}
          icon="sparkles"
          disabled={!selectedImageUri}
        />
        <TextButton
          label="Omitir por ahora y usar modelo base"
          onPress={handleSkip}
          style={{ marginTop: Spacing.xs }}
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
    paddingHorizontal: 12,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  stepBadge: {
    ...Typography.micro,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  progressBarMini: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillMini: {
    width: '65%',
    height: '100%',
  },
  title: {
    marginTop: Spacing.xs,
  },
  subtitle: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  viewfinderCard: {
    height: 320,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 6,
  },
  previewBadgeText: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  guideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: Spacing.lg,
  },
  faceOvalGuide: {
    width: 140,
    height: 180,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eyeLineGuide: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
  },
  verticalAxisGuide: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    width: 1,
  },
  shoulderGuide: {
    width: 220,
    height: 70,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderStyle: 'dashed',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: 6,
  },
  guideInstructionBox: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 4,
  },
  guideInstructionText: {
    ...Typography.micro,
    textAlign: 'center',
    lineHeight: 14,
  },
  buttonsGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cameraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
  },
  cameraActionText: {
    ...Typography.callout,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
  },
  galleryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  galleryActionText: {
    ...Typography.callout,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  tipsCardText: {
    ...Typography.micro,
    flex: 1,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Processing & Success Styles
  processingCard: {
    flex: 1,
    margin: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  photoThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  stateCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  processingTitle: {
    ...Typography.title2,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  processingSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepsList: {
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotPassed: {
    backgroundColor: '#15803D',
  },
  stepDotCurrent: {},
  stepDotPending: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  stepLabel: {
    ...Typography.caption,
  },
  latencyHint: {
    ...Typography.micro,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: Spacing.sm,
  },
  resultBox: {
    width: '100%',
    alignItems: 'center',
  },
  activeBox: {
    width: '100%',
    alignItems: 'center',
  },
  successActions: {
    width: '100%',
    marginTop: Spacing.md,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
  },
  btnActionText: {
    ...Typography.callout,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
  },
  btnActionSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  btnActionSecondaryText: {
    ...Typography.callout,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
  },
});
