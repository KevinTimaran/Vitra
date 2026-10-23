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
import * as ImageManipulator from 'expo-image-manipulator';

import { Typography, Spacing, Radius } from '../theme';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useUser, PRESET_AVATARS } from '../contexts/UserContext';
import { analyzeColorimetry, generateAvatar } from '../services/ai/garmentAnalyzer';

interface BodyProfileScreenProps {
  navigation?: any;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const BodyProfileScreen: React.FC<BodyProfileScreenProps> = ({
  navigation,
  onComplete,
  onSkip,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const {
    gender: contextGender,
    setGender: setContextGender,
    setPresetAvatar,
    updateColorProfile,
    updateAvatarUrl,
    setUserPhotoUri,
    completeOnboarding,
  } = useUser();

  // 1. Género obligatorio (por defecto femenino, seleccionable)
  const [selectedGender, setSelectedGender] = useState<'female' | 'male' | 'non-binary'>(
    (contextGender as any) || 'female'
  );

  // 2. Fotos opcionales (facial para colorimetría y cuerpo entero para avatar 3D)
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);
  const [faceImageBase64, setFaceImageBase64] = useState<string | null>(null);

  const [bodyImageUri, setBodyImageUri] = useState<string | null>(null);
  const [bodyImageBase64, setBodyImageBase64] = useState<string | null>(null);

  // Estados de procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('Iniciando configuración...');
  const [processProgress, setProcessProgress] = useState<number>(0.1);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.1)).current;

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

  const handlePickImage = async (
    target: 'face' | 'body',
    source: 'camera' | 'gallery' | 'sample'
  ) => {
    try {
      if (source === 'sample') {
        if (target === 'face') {
          const sample =
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
          setFaceImageUri(sample);
          setFaceImageBase64(sample);
        } else {
          const sample =
            selectedGender === 'male'
              ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
              : selectedGender === 'non-binary'
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
              : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';
          setBodyImageUri(sample);
          setBodyImageBase64(sample);
        }
        return;
      }

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permiso Requerido',
            'Se requiere acceso a la cámara para capturar la fotografía.'
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permiso Requerido',
            'Se requiere acceso a la galería para seleccionar la fotografía.'
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: target === 'face' ? [1, 1] : [3, 4],
        quality: 0.85,
        base64: true,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        // Comprimir y redimensionar la fotografía para mantener el payload bajo (<250KB)
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
          console.warn('[BodyProfileScreen] Advertencia optimizando imagen:', mErr);
        }

        if (target === 'face') {
          setFaceImageUri(asset.uri);
          setFaceImageBase64(b64);
        } else {
          setBodyImageUri(asset.uri);
          setBodyImageBase64(b64);
        }
      }
    } catch (err: any) {
      console.error('[BodyProfileScreen] Error capturando imagen:', err);
      Alert.alert('Error', 'No se pudo acceder a la imagen seleccionada.');
    }
  };

  // Finalizar onboarding y ejecutar el pipeline biométrico
  const handleCompleteSetup = async () => {
    setContextGender(selectedGender);

    const hasFace = Boolean(faceImageBase64 || faceImageUri);
    const hasBody = Boolean(bodyImageBase64 || bodyImageUri);

    // Si no hay fotos, asignar de inmediato el avatar preset y completar
    if (!hasFace && !hasBody) {
      await setPresetAvatar(selectedGender);
      completeOnboarding({
        gender: selectedGender,
        avatarType: 'preset',
      });
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.navigate('MainTabs');
      }
      return;
    }

    setIsProcessing(true);
    setError(null);
    setIsSuccess(false);

    try {
      let colorResult = null;
      let avatar3DUrl = '';

      // 1. Análisis de Colorimetría si se proporcionó foto de rostro
      if (hasFace) {
        setProcessStep('Analizando colorimetría facial con Gemini Vision...');
        Animated.timing(progressAnim, { toValue: 0.45, duration: 2500, useNativeDriver: false }).start();
        try {
          const colorRes = await analyzeColorimetry(faceImageBase64 || faceImageUri!);
          if (colorRes.success && colorRes.data) {
            colorResult = colorRes.data;
            updateColorProfile(colorRes.data);
          }
        } catch (cErr: any) {
          console.warn('[BodyProfileScreen] Aviso en colorimetría:', cErr?.message);
        }
      }

      // 2. Generación de Avatar 3D si se proporcionó foto de cuerpo entero
      if (hasBody) {
        setProcessStep('Construyendo avatar 3D personalizado con Tripo3D...');
        Animated.timing(progressAnim, { toValue: 0.85, duration: 4000, useNativeDriver: false }).start();
        try {
          const avatarRes = await generateAvatar(bodyImageBase64 || bodyImageUri!);
          avatar3DUrl = avatarRes.avatar_url;
          updateAvatarUrl(avatarRes.avatar_url);
        } catch (aErr: any) {
          console.warn('[BodyProfileScreen] Aviso en avatar 3D (usando preset):', aErr?.message);
          avatar3DUrl = '';
          setPresetAvatar(selectedGender);
        }
      } else {
        // Asignación inicial de silueta preset
        setPresetAvatar(selectedGender);
      }

      Animated.timing(progressAnim, { toValue: 1.0, duration: 500, useNativeDriver: false }).start();
      setProcessStep('Identidad configurada con éxito.');

      completeOnboarding({
        gender: selectedGender,
        facePhotoUri: faceImageUri || undefined,
        bodyPhotoUri: bodyImageUri || undefined,
        avatarUrl: avatar3DUrl || undefined,
        avatarType: avatar3DUrl ? 'custom_3d' : 'preset',
        colorProfile: colorResult || undefined,
      });

      setIsProcessing(false);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[BodyProfileScreen] Error general en onboarding:', err);
      setIsProcessing(false);
      setError(err?.message || 'Error durante la calibración de la identidad.');
    }
  };

  const handleFinishToTabs = () => {
    if (onComplete) {
      onComplete();
    } else if (navigation) {
      navigation.navigate('MainTabs');
    }
  };

  // ==========================================
  // RENDER: PANTALLA DE PROCESAMIENTO / ÉXITO
  // ==========================================
  if (isProcessing || isSuccess || error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <GlassCard style={styles.processingCard}>
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
                  : 'sparkles'
              }
              size={48}
              color={isSuccess ? '#15803D' : error ? '#EF4444' : colors.primary}
            />
          </Animated.View>

          {isSuccess ? (
            <View style={styles.resultBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                ¡Identidad y Gemelo Listos!
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                Tu silueta base ha sido calibrada{' '}
                {bodyImageUri
                  ? 'con tu avatar 3D personalizado generado por Tripo3D.'
                  : 'con la silueta Atelier correspondiente a tu género seleccionado.'}
              </Text>

              <View style={styles.successActions}>
                <PrimaryButton
                  label="Ir a Inicio y Probador Virtual"
                  onPress={handleFinishToTabs}
                  icon="sparkles"
                />
              </View>
            </View>
          ) : error ? (
            <View style={styles.resultBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                Error en la Configuración
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                {error}
              </Text>
              <View style={styles.errorButtonsRow}>
                <TouchableOpacity
                  style={[styles.btnAction, { backgroundColor: colors.cta }]}
                  onPress={handleCompleteSetup}
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
                    Volver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.activeBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                Configurando Identidad
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                {processStep}
              </Text>

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

              <Text style={[styles.latencyHint, { color: colors.tertiaryText }]}>
                FitGlassAI está procesando tus datos biométricos. Por favor espera unos momentos.
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    );
  }

  // ==========================================
  // RENDER: PANTALLA PRINCIPAL DE ONBOARDING
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera de Onboarding */}
        <View style={styles.header}>
          <View style={styles.stepIndicatorRow}>
            <Text style={[styles.stepBadge, { color: colors.tertiaryText }]}>
              FASE 01 · IDENTIDAD Y AVATAR BASE
            </Text>
            <View style={[styles.progressBarMini, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={[styles.progressFillMini, { backgroundColor: colors.primaryText }]} />
            </View>
          </View>

          <Text style={[Typography.largeTitle, styles.title, { color: colors.primaryText }]}>
            Configura tu Gemelo Digital
          </Text>
          <Text style={[Typography.body, styles.subtitle, { color: colors.secondaryText }]}>
            Selecciona tu silueta requerida y añade fotos opcionales para personalizar tu avatar 3D y colorimetría.
          </Text>
        </View>

        {/* 1. SELECCIÓN DE GÉNERO OBLIGATORIA */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              1. Silueta y Género
            </Text>
            <View style={[styles.requiredBadge, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.requiredBadgeText, { color: colors.primaryText }]}>
                REQUERIDO
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Define la estructura anatómica del avatar para la calibración del probador 3D.
          </Text>

          <View style={styles.genderOptionsColumn}>
            {[
              {
                id: 'female' as const,
                title: 'Silueta Femenina Atelier',
                desc: 'Proporciones esbeltas con calibración para vestidos y sastrería.',
                icon: 'woman-outline',
              },
              {
                id: 'male' as const,
                title: 'Silueta Masculina Atelier',
                desc: 'Estructura atlética con hombros definidos y caída recta.',
                icon: 'man-outline',
              },
              {
                id: 'non-binary' as const,
                title: 'Silueta Fluida / Neutra',
                desc: 'Líneas minimalistas y proporciones universales contemporáneas.',
                icon: 'people-outline',
              },
            ].map((option) => {
              const isSelected = selectedGender === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.genderCard,
                    {
                      backgroundColor: isSelected ? colors.surfaceSubtle : 'transparent',
                      borderColor: isSelected ? colors.primaryText : colors.borderLight,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedGender(option.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.genderIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                    <Ionicons name={option.icon as any} size={22} color={colors.primaryText} />
                  </View>
                  <View style={styles.genderTextCol}>
                    <Text style={[styles.genderCardTitle, { color: colors.primaryText }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.genderCardDesc, { color: colors.secondaryText }]}>
                      {option.desc}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primaryText : colors.borderLight,
                        backgroundColor: isSelected ? colors.primaryText : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={12} color={colors.bg} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. FOTO FACIAL (OPCIONAL - COLORIMETRÍA) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              2. Foto Facial (Colorimetría)
            </Text>
            <View style={styles.optionalBadge}>
              <Text style={[styles.optionalBadgeText, { color: colors.secondaryText }]}>
                OPCIONAL
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Gemini Vision analiza tu tono de piel y cabello para extraer tu paleta estacional HEX.
          </Text>

          <GlassCard style={styles.photoCaptureCard}>
            {faceImageUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: faceImageUri }} style={styles.photoThumbCircle} />
                <View style={styles.photoPreviewInfo}>
                  <Text style={[styles.photoCapturedText, { color: colors.primaryText }]}>
                    Fotografía facial seleccionada
                  </Text>
                  <Text style={[styles.photoCapturedSub, { color: colors.secondaryText }]}>
                    Lista para análisis cromático
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnRemovePhoto}
                  onPress={() => {
                    setFaceImageUri(null);
                    setFaceImageBase64(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('face', 'camera')}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('face', 'gallery')}
                >
                  <Ionicons name="images-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('face', 'sample')}
                >
                  <Ionicons name="sparkles-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>Muestra</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        </View>

        {/* 3. FOTO DE CUERPO ENTERO (OPCIONAL - AVATAR 3D) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              3. Foto de Cuerpo Completo (Avatar 3D)
            </Text>
            <View style={styles.optionalBadge}>
              <Text style={[styles.optionalBadgeText, { color: colors.secondaryText }]}>
                OPCIONAL
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Tripo3D construye tu gemelo 3D interactivo (.glb). Si la omites, se asignará el avatar preset correspondiente a tu silueta.
          </Text>

          <GlassCard style={styles.photoCaptureCard}>
            {bodyImageUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: bodyImageUri }} style={styles.photoThumbRect} />
                <View style={styles.photoPreviewInfo}>
                  <Text style={[styles.photoCapturedText, { color: colors.primaryText }]}>
                    Fotografía corporal seleccionada
                  </Text>
                  <Text style={[styles.photoCapturedSub, { color: colors.secondaryText }]}>
                    Lista para reconstrucción tridimensional
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnRemovePhoto}
                  onPress={() => {
                    setBodyImageUri(null);
                    setBodyImageBase64(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('body', 'camera')}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('body', 'gallery')}
                >
                  <Ionicons name="images-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('body', 'sample')}
                >
                  <Ionicons name="sparkles-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>Muestra</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        </View>

        {/* Resumen de Asignación Inicial */}
        <GlassCard style={styles.summaryCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { color: colors.primaryText }]}>
              Asignación Inicial de Avatar
            </Text>
            <Text style={[styles.summaryDesc, { color: colors.secondaryText }]}>
              {bodyImageUri
                ? 'Se generará tu avatar 3D personalizado a través de Tripo3D.'
                : `Se asignará la ${PRESET_AVATARS[selectedGender]?.label || 'Silueta Atelier'} como tu modelo base interactivo.`}
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Footer de Acción */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.borderLight }]}>
        <PrimaryButton
          label="Completar y Asignar Avatar"
          onPress={handleCompleteSetup}
          icon="arrow-forward"
        />
        <TextButton
          label="Continuar solo con silueta base"
          onPress={() => {
            setPresetAvatar(selectedGender);
            completeOnboarding({ gender: selectedGender, avatarType: 'preset' });
            handleFinishToTabs();
          }}
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
    paddingHorizontal: 16,
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
    width: '100%',
    height: '100%',
  },
  title: {
    marginTop: Spacing.xs,
    fontSize: 24,
  },
  subtitle: {
    marginTop: Spacing.xs,
    lineHeight: 20,
    fontSize: 13,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.callout,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionSubtitle: {
    ...Typography.micro,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  requiredBadgeText: {
    ...Typography.micro,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  optionalBadgeText: {
    ...Typography.micro,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  genderOptionsColumn: {
    gap: Spacing.xs,
  },
  genderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  genderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderTextCol: {
    flex: 1,
  },
  genderCardTitle: {
    ...Typography.callout,
    fontWeight: '700',
    fontSize: 13,
  },
  genderCardDesc: {
    ...Typography.micro,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCaptureCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  captureBtnText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  photoThumbCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  photoThumbRect: {
    width: 42,
    height: 56,
    borderRadius: 6,
  },
  photoPreviewInfo: {
    flex: 1,
  },
  photoCapturedText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  photoCapturedSub: {
    ...Typography.micro,
    fontSize: 10,
    marginTop: 1,
  },
  btnRemovePhoto: {
    padding: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryDesc: {
    ...Typography.micro,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  processingCard: {
    flex: 1,
    margin: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
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
  resultBox: {
    width: '100%',
    alignItems: 'center',
  },
  activeBox: {
    width: '100%',
    alignItems: 'center',
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
  latencyHint: {
    ...Typography.micro,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: Spacing.sm,
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
    fontWeight: '600',
  },
});
