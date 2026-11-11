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
import { useForegroundJob, useJob, useJobs } from '../contexts/JobsContext';
import { WaitActions } from '../components/WaitActions';
import { openGame } from '../navigation/jobNavigation';
import { CameraSilhouetteModal, ImageCropperModal } from '../components/camera';
import { logHandledError } from '../utils/logging';
import { errorText } from '../services/jobs/jobErrors.ts';

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

  // Modales de captura con guía de silueta A-Pose y recorte
  const [showBodyCamera, setShowBodyCamera] = useState<boolean>(false);
  const [showBodyCropper, setShowBodyCropper] = useState<boolean>(false);
  const [galleryTempUri, setGalleryTempUri] = useState<string | null>(null);
  const [showFaceCropper, setShowFaceCropper] = useState<boolean>(false);
  const [faceTempUri, setFaceTempUri] = useState<string | null>(null);

  // Estados de procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('bp.step.init');
  const [processProgress, setProcessProgress] = useState<number>(0.1);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.1)).current;

  // La generación del avatar 3D vive en el servicio global de trabajos: se puede seguir en segundo plano.
  const { startJob, cancelJob, markJobSeen } = useJobs();
  const [avatarJobId, setAvatarJobId] = useState<string | undefined>(undefined);
  const avatarJob = useJob(avatarJobId);
  useForegroundJob(isProcessing ? avatarJobId : null);
  const pendingColorRef = useRef<any>(null);
  const jobHandledRef = useRef<string | null>(null);

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

      // Para fotografía corporal (Avatar 3D): Lanzar el visor con silueta translúcida A-pose o recortador
      if (target === 'body') {
        if (source === 'camera') {
          setShowBodyCamera(true);
          return;
        }
        if (source === 'gallery') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(t('perm.title'), t('perm.gallery'));
            return;
          }
          const galRes = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.9,
          });
          if (!galRes.canceled && galRes.assets && galRes.assets.length > 0) {
            setGalleryTempUri(galRes.assets[0].uri);
            setShowBodyCropper(true);
          }
          return;
        }
      }

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('perm.title'), t('perm.camera'));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('perm.title'), t('perm.gallery'));
          return;
        }
      }

      // Rostro: se encuadra con el mismo recortador de la app (modo cuadrado/circular)
      const faceOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.9 };
      const faceResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(faceOptions)
          : await ImagePicker.launchImageLibraryAsync(faceOptions);
      if (!faceResult.canceled && faceResult.assets && faceResult.assets.length > 0) {
        setFaceTempUri(faceResult.assets[0].uri);
        setShowFaceCropper(true);
      }
    } catch (err: any) {
      console.error('[BodyProfileScreen] Error capturando imagen:', err);
      Alert.alert(t('common.error'), t('bp.err.image'));
    }
  };

  const finishOnboarding = (avatar3DUrl: string, colorResult: any) => {
    Animated.timing(progressAnim, { toValue: 1.0, duration: 500, useNativeDriver: false }).start();
    setProcessStep('bp.step.done');

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
  };

  // Progreso real del avatar en la barra de esta pantalla
  useEffect(() => {
    if (!avatarJob) return;
    Animated.timing(progressAnim, { toValue: avatarJob.progress, duration: 700, useNativeDriver: false }).start();
  }, [avatarJob?.progress]);

  // Resultado del trabajo del avatar mientras esta pantalla está visible
  useEffect(() => {
    if (!avatarJob || !isProcessing || jobHandledRef.current === avatarJob.id) return;
    if (avatarJob.status === 'done') {
      jobHandledRef.current = avatarJob.id;
      markJobSeen(avatarJob.id);
      finishOnboarding((avatarJob.result as { avatar_url: string }).avatar_url, pendingColorRef.current);
    } else if (avatarJob.status === 'failed') {
      jobHandledRef.current = avatarJob.id;
      markJobSeen(avatarJob.id);
      if (avatarJob.error?.invalidImage) {
        Alert.alert(t('auth.invalidBody.title'), errorText(avatarJob.error, t).message);
        setIsProcessing(false);
      } else {
        // Igual que antes: si Tripo3D falla se continúa con la silueta preset del género elegido.
        setPresetAvatar(selectedGender);
        finishOnboarding('', pendingColorRef.current);
      }
    } else if (avatarJob.status === 'cancelled') {
      jobHandledRef.current = avatarJob.id;
      setIsProcessing(false);
    }
  }, [avatarJob?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Seguir en segundo plano": se completa el onboarding con la silueta preset y el avatar se aplica al terminar.
  const handleContinueInBackground = () => {
    jobHandledRef.current = avatarJob?.id ?? null;
    setPresetAvatar(selectedGender);
    finishOnboarding('', pendingColorRef.current);
    if (onComplete) {
      onComplete();
    } else if (navigation) {
      navigation.navigate('MainTabs');
    }
  };

  const handleCancelAvatar = () => {
    if (avatarJob) cancelJob(avatarJob.id);
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
        setProcessStep('bp.step.color');
        Animated.timing(progressAnim, { toValue: 0.45, duration: 2500, useNativeDriver: false }).start();
        try {
          const colorRes = await analyzeColorimetry(faceImageBase64 || faceImageUri!);
          if (colorRes.data && (colorRes.data.is_valid_image === false || String(colorRes.data.is_valid_image).toLowerCase() === 'false')) {
            const valMsg =
              colorRes.data.validation_error_message ||
              t('auth.invalidImage.default');
            const valErr: any = new Error(valMsg);
            valErr.status = 400;
            throw valErr;
          }
          if (colorRes.success && colorRes.data) {
            colorResult = colorRes.data;
            updateColorProfile(colorRes.data);
          }
        } catch (cErr: any) {
          console.warn('[BodyProfileScreen] Aviso en colorimetría:', cErr?.message);
          if (
            cErr?.status === 400 ||
            (cErr?.message &&
              (cErr.message.toLowerCase().includes('person') ||
                cErr.message.toLowerCase().includes('rostro') ||
                cErr.message.toLowerCase().includes('image')))
          ) {
            Alert.alert(
              t('bp.invalidFace.title'),
              cErr.message || t('auth.invalidImage.default')
            );
            setIsProcessing(false);
            return;
          }
        }
      }

      // 2. Avatar 3D si se proporcionó foto de cuerpo entero: se ejecuta como trabajo global (Tripo3D tarda ~2 min)
      if (hasBody) {
        setProcessStep('bp.step.avatar');
        pendingColorRef.current = colorResult;
        jobHandledRef.current = null;
        const bodyImage = bodyImageBase64 || bodyImageUri!;
        const started = startJob({
          kind: 'avatar',
          title: t('bp.jobTitle'),
          thumbnailUri: bodyImageUri || undefined,
          run: async ({ signal, report }) => {
            report({ progress: 0.1, phase: 'connecting', detail: t('bp.sendingPhoto') });
            return generateAvatar(bodyImage, {
              signal,
              onProgress: (info) => report({ progress: 0.1 + Math.min(info.progress, 1) * 0.88, phase: info.step, detail: info.detail }),
            });
          },
          // Se ejecuta dentro del almacén de trabajos: el avatar se aplica aunque esta pantalla ya esté cerrada.
          onSuccess: (res) => {
            updateAvatarUrl(res.avatar_url);
          },
        });
        setAvatarJobId(started.job.id);
        return; // el resultado lo gestiona el efecto que observa el trabajo
      }

      // Sin foto de cuerpo: silueta preset inmediata
      setPresetAvatar(selectedGender);
      finishOnboarding('', colorResult);
    } catch (err: any) {
      logHandledError('[BodyProfileScreen] Error general en onboarding:', err);
      setIsProcessing(false);
      setError(err?.message || t('bp.err.general'));
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
              color={isSuccess ? colors.buttons.successStrongText : error ? colors.buttons.dangerBackground : colors.primary}
            />
          </Animated.View>

          {isSuccess ? (
            <View style={styles.resultBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                {t('bp.ready.title')}
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                {t('bp.ready.prefix')}
                {bodyImageUri ? t('bp.ready.custom') : t('bp.ready.preset')}
              </Text>

              <View style={styles.successActions}>
                <PrimaryButton
                  label={t('bp.ready.cta')}
                  onPress={handleFinishToTabs}
                  icon="sparkles"
                />
              </View>
            </View>
          ) : error ? (
            <View style={styles.resultBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                {t('bp.errTitle')}
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
                  <Text style={[styles.btnActionText, { color: colors.ctaText }]}>{t('jobs.retry')}</Text>
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
                    {t('common.return')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.activeBox}>
              <Text style={[styles.processingTitle, { color: colors.primaryText }]}>
                {t('bp.configuring')}
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.secondaryText }]}>
                {t(processStep)}
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

              {avatarJob?.status === 'running' ? (
                <>
                  <Text style={[styles.latencyHint, { color: colors.tertiaryText }]}>
                    {t('bp.bgHint')}
                  </Text>
                  <View style={{ width: '100%', marginTop: Spacing.md }}>
                    <WaitActions
                      onPlay={() => openGame(avatarJob.id)}
                      onBackground={handleContinueInBackground}
                      onCancel={handleCancelAvatar}
                    />
                  </View>
                </>
              ) : (
                <Text style={[styles.latencyHint, { color: colors.tertiaryText }]}>
                  {t('bp.procHint')}
                </Text>
              )}
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
              {t('bp.phase')}
            </Text>
            <View style={[styles.progressBarMini, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={[styles.progressFillMini, { backgroundColor: colors.primaryText }]} />
            </View>
          </View>

          <Text style={[Typography.largeTitle, styles.title, { color: colors.primaryText }]}>
            {t('bp.title')}
          </Text>
          <Text style={[Typography.body, styles.subtitle, { color: colors.secondaryText }]}>
            {t('bp.subtitle')}
          </Text>
        </View>

        {/* 1. SELECCIÓN DE GÉNERO OBLIGATORIA */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              {t('bp.s1.title')}
            </Text>
            <View style={[styles.requiredBadge, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.requiredBadgeText, { color: colors.primaryText }]}>
                {t('bp.required')}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            {t('bp.s1.desc')}
          </Text>

          <View style={styles.genderOptionsColumn}>
            {[
              {
                id: 'female' as const,
                title: t('bp.gender.female.title'),
                desc: t('bp.gender.female.desc'),
                icon: 'woman-outline',
              },
              {
                id: 'male' as const,
                title: t('bp.gender.male.title'),
                desc: t('bp.gender.male.desc'),
                icon: 'man-outline',
              },
              {
                id: 'non-binary' as const,
                title: t('bp.gender.nonbinary.title'),
                desc: t('bp.gender.nonbinary.desc'),
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
              {t('bp.s2.title')}
            </Text>
            <View style={styles.optionalBadge}>
              <Text style={[styles.optionalBadgeText, { color: colors.secondaryText }]}>
                {t('bp.optional')}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            {t('bp.s2.desc')}
          </Text>

          <GlassCard style={styles.photoCaptureCard}>
            {faceImageUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: faceImageUri }} style={styles.photoThumbCircle} />
                <View style={styles.photoPreviewInfo}>
                  <Text style={[styles.photoCapturedText, { color: colors.primaryText }]}>
                    {t('bp.faceSelected')}
                  </Text>
                  <Text style={[styles.photoCapturedSub, { color: colors.secondaryText }]}>
                    {t('bp.faceReady')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnRemovePhoto}
                  onPress={() => {
                    setFaceImageUri(null);
                    setFaceImageBase64(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color={colors.buttons.dangerBackground} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('face', 'camera')}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>{t('bp.camera')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('face', 'gallery')}
                >
                  <Ionicons name="images-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>{t('bp.gallery')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('face', 'sample')}
                >
                  <Ionicons name="sparkles-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>{t('bp.sample')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        </View>

        {/* 3. FOTO DE CUERPO ENTERO (OPCIONAL - AVATAR 3D) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              {t('bp.s3.title')}
            </Text>
            <View style={styles.optionalBadge}>
              <Text style={[styles.optionalBadgeText, { color: colors.secondaryText }]}>
                {t('bp.optional')}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            {t('bp.s3.desc')}
          </Text>

          <GlassCard style={styles.photoCaptureCard}>
            {bodyImageUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: bodyImageUri }} style={styles.photoThumbRect} />
                <View style={styles.photoPreviewInfo}>
                  <Text style={[styles.photoCapturedText, { color: colors.primaryText }]}>
                    {t('bp.bodySelected')}
                  </Text>
                  <Text style={[styles.photoCapturedSub, { color: colors.secondaryText }]}>
                    {t('bp.bodyReady')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnRemovePhoto}
                  onPress={() => {
                    setBodyImageUri(null);
                    setBodyImageBase64(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color={colors.buttons.dangerBackground} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('body', 'camera')}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>{t('bp.camera')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('body', 'gallery')}
                >
                  <Ionicons name="images-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>{t('bp.gallery')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                  onPress={() => handlePickImage('body', 'sample')}
                >
                  <Ionicons name="sparkles-outline" size={18} color={colors.primaryText} />
                  <Text style={[styles.captureBtnText, { color: colors.primaryText }]}>{t('bp.sample')}</Text>
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
              {t('bp.summary.title')}
            </Text>
            <Text style={[styles.summaryDesc, { color: colors.secondaryText }]}>
              {bodyImageUri
                ? t('bp.summary.custom')
                : t('bp.summary.preset', { label: t(`bp.gender.${selectedGender === 'non-binary' ? 'nonbinary' : selectedGender}.title`) })}
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Footer de Acción */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.borderLight }]}>
        <PrimaryButton
          label={t('bp.cta.complete')}
          onPress={handleCompleteSetup}
          icon="arrow-forward"
        />
        <TextButton
          label={t('bp.cta.skip')}
          onPress={() => {
            setPresetAvatar(selectedGender);
            completeOnboarding({ gender: selectedGender, avatarType: 'preset' });
            handleFinishToTabs();
          }}
          style={{ marginTop: Spacing.xs }}
        />
      </View>

      {/* Modal de Cámara con Silueta Translúcida A-Pose */}
      <CameraSilhouetteModal
        visible={showBodyCamera}
        onClose={() => setShowBodyCamera(false)}
        gender={selectedGender}
        onPhotoSelected={(croppedUri, b64) => {
          setBodyImageUri(croppedUri);
          if (b64) setBodyImageBase64(b64);
        }}
      />

      {/* Recorte cuadrado del rostro */}
      <ImageCropperModal
        mode="face"
        visible={showFaceCropper}
        imageUri={faceTempUri}
        onConfirm={(croppedUri, b64) => {
          setShowFaceCropper(false);
          setFaceTempUri(null);
          setFaceImageUri(croppedUri);
          setFaceImageBase64(b64 ?? croppedUri);
        }}
        onCancel={() => {
          setShowFaceCropper(false);
          setFaceTempUri(null);
        }}
      />

      {/* Modal de Recorte Ajustado de Cabeza a Pies para Galería */}
      <ImageCropperModal
        visible={showBodyCropper}
        imageUri={galleryTempUri}
        onConfirm={(croppedUri, b64) => {
          setShowBodyCropper(false);
          setGalleryTempUri(null);
          setBodyImageUri(croppedUri);
          if (b64) setBodyImageBase64(b64);
        }}
        onCancel={() => {
          setShowBodyCropper(false);
          setGalleryTempUri(null);
        }}
      />
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
