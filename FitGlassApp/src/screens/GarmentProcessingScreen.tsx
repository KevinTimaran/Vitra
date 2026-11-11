import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Typography, Spacing, Radius } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { WaitActions } from '../components/WaitActions';
import { openGame } from '../navigation/jobNavigation';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useForegroundJob, useJob, useJobs } from '../contexts/JobsContext';
import { Garment } from '../types';
import { analyzeGarment, generateTryOn } from '../services/ai/garmentAnalyzer';
import { GarmentMetadata } from '../services/ai/types';
import { persistLocalImage } from '../services/storage/localImages';
import { friendlyError, errorText } from '../services/jobs/jobErrors.ts';
import { useTranslation } from '../contexts/LanguageContext';

interface GarmentProcessingScreenProps {
  route?: {
    params?: {
      imageBase64?: string;
      imageUri?: string;
      userPhotoUrl?: string;
      /** Reabre la espera de un trabajo que ya está en marcha (desde la píldora de progreso). */
      jobId?: string;
    };
  };
  imageBase64?: string | null;
  imageUri?: string | null;
  userPhotoUrl?: string;
  onComplete?: (result: { model_3d_url: string; image_2d_url?: string; metadata?: GarmentMetadata }) => void;
  onCancel?: () => void;
  navigation?: any;
}

const PIPELINE_STEPS = [
  { id: 1, titleKey: 'proc.step1.title', detailKey: 'proc.step1.detail' },
  { id: 2, titleKey: 'proc.step2.title', detailKey: 'proc.step2.detail' },
  { id: 3, titleKey: 'proc.step3.title', detailKey: 'proc.step3.detail' },
  { id: 4, titleKey: 'proc.step4.title', detailKey: 'proc.step4.detail' },
  { id: 5, titleKey: 'proc.step5.title', detailKey: 'proc.step5.detail' },
];

const PHASE_INDEX: Record<string, number> = { connecting: 0, analyzing: 1, vton: 2, tripo: 3, optimizing: 4, finalizing: 4 };

// Traduce el paso del backend (vton_1, tripo3d, optimizing...) a la fase lógica del trabajo.
const phaseFromBackendStep = (step?: string): string => {
  const value = (step || '').toLowerCase();
  if (value.includes('tripo')) return 'tripo';
  if (value.includes('opt')) return 'optimizing';
  return 'vton';
};

const classifyCategory = (tipo: string): { category: Garment['category']; silhouetteType: Garment['silhouetteType'] } => {
  if (['chaqueta', 'hoodie', 'abrigo', 'blazer', 'jacket', 'parka'].some((w) => tipo.includes(w))) {
    return { category: 'Outerwear', silhouetteType: 'jacket' };
  }
  if (['pantal', 'jean', 'falda', 'trouser', 'short'].some((w) => tipo.includes(w))) {
    return { category: 'Pants', silhouetteType: 'trousers' };
  }
  if (['zapato', 'sneaker', 'bota', 'shoe'].some((w) => tipo.includes(w))) {
    return { category: 'Shoes', silhouetteType: 'shoes' };
  }
  if (['gorra', 'sombrero', 'accesorio', 'bolso', 'reloj'].some((w) => tipo.includes(w))) {
    return { category: 'Accessories', silhouetteType: 'accessory' };
  }
  return { category: 'Tops', silhouetteType: 'tshirt' };
};

export const GarmentProcessingScreen: React.FC<GarmentProcessingScreenProps> = (props) => {
  const { colors } = useTheme();
  const { t, formatDate } = useTranslation();
  const { addGarmentToWardrobe } = useUser();
  const { startJob, cancelJob, markJobSeen, dismissJob } = useJobs();

  const imageBase64 = props.imageBase64 || props.route?.params?.imageBase64 || '';
  const imageUri = props.imageUri || props.route?.params?.imageUri || '';
  // Imagen de usuario por defecto para prueba si el usuario no ha subido avatar
  const userPhotoUrl =
    props.userPhotoUrl ||
    props.route?.params?.userPhotoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';

  const routeJobId = props.route?.params?.jobId;
  const [jobId, setJobId] = useState<string | undefined>(routeJobId);
  const job = useJob(jobId);
  useForegroundJob(jobId); // mientras esta pantalla se ve, la capa de avisos no repite la píldora/tarjeta

  const progressAnim = useRef(new Animated.Value(0.1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const completionHandledRef = useRef(false);

  // Animación continua de pulso en el icono central
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // La barra sigue el progreso REAL del trabajo (antes eran animaciones sin relación con el servidor).
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: job?.progress ?? 0.1, duration: 700, useNativeDriver: false }).start();
  }, [job?.progress, progressAnim]);

  const launchJob = useCallback(() => {
    completionHandledRef.current = false;

    const result = startJob({
      kind: 'garment',
      title: t('proc.jobTitle'),
      thumbnailUri: imageUri || undefined,
      run: async ({ signal, report }) => {
        report({ progress: 0.1, phase: 'connecting' });
        report({ progress: 0.2, phase: 'analyzing' });

        // Paso 1 y 2: análisis con FitGlass AI
        let metadata: GarmentMetadata | undefined;
        try {
          const analysisRes = await analyzeGarment(imageBase64 || imageUri);
          metadata = analysisRes.data;
          if (metadata && (metadata.is_valid_image === false || String(metadata.is_valid_image).toLowerCase() === 'false')) {
            const invalid: any = new Error(
              metadata.validation_error_message || t('auth.code.image_no_garment')
            );
            invalid.status = 400;
            throw invalid;
          }
        } catch (analysisError: any) {
          const message = String(analysisError?.message || '').toLowerCase();
          const isValidationError =
            analysisError?.status === 400 || message.includes('ropa') || message.includes('prenda') || message.includes('foto');
          if (isValidationError) throw analysisError; // imagen no válida: el trabajo falla y se avisa
          console.warn('[Processing] El análisis de la prenda no estuvo disponible; se continúa con valores por defecto:', analysisError?.message);
          metadata = undefined;
        }

        // Paso 3 y 4: fusión 2D (VTON) y extrusión 3D, con progreso real del servidor
        report({ progress: 0.4, phase: 'vton' });
        let model3dUrl = '';
        let image2dUrl = '';
        let warning: string | undefined;
        try {
          const tryOn = await generateTryOn(userPhotoUrl, imageBase64 || imageUri, 'upper_body', 'clothing', {
            signal,
            onProgress: (info) =>
              report({ progress: 0.4 + Math.min(info.progress, 1) * 0.55, phase: phaseFromBackendStep(info.step), detail: info.detail }),
          });
          model3dUrl = tryOn.model_3d_url;
          image2dUrl = tryOn.image_2d_url;
        } catch (tryOnError: any) {
          if (tryOnError?.kind === 'aborted' || signal.aborted) throw tryOnError;
          // La prenda se guarda igualmente (sin 3D) y se avisa del motivo; no se reutiliza ningún modelo ajeno.
          console.warn('[Processing] No se pudo generar el modelo 3D:', tryOnError?.message);
          warning = errorText(friendlyError(tryOnError), t).message;
          image2dUrl = imageBase64 || imageUri || userPhotoUrl;
        }

        // Paso 5: construcción de la prenda para el armario
        report({ progress: 0.97, phase: 'finalizing' });
        const rawHexMatch = metadata?.color_dominante?.match(/#[0-9A-Fa-f]{6}/);
        const colorHex = rawHexMatch ? rawHexMatch[0] : '#2C2C2C';
        const { category, silhouetteType } = classifyCategory((metadata?.tipo_prenda || '').toLowerCase());
        // La foto del selector está en la caché del SO (puede borrarse): se copia a almacenamiento persistente.
        const persistentImageUrl = (await persistLocalImage(imageUri)) || imageBase64;

        const garment: Garment = {
          id: `garment-${Date.now()}`,
          name: metadata?.tipo_prenda ? `${metadata.tipo_prenda} ${metadata.corte || ''}`.trim() : t('proc.garment.name'),
          category,
          colorName: metadata?.color_dominante ? metadata.color_dominante.split('(')[0].trim() : t('proc.garment.color'),
          colorHex,
          size: 'M',
          fit: (metadata?.corte as any) || 'Regular',
          brand: t('proc.garment.brand'),
          material: metadata?.detalles || t('proc.garment.material'),
          addedDate: formatDate(new Date()),
          imageUrl: persistentImageUrl,
          model3dUrl: model3dUrl || undefined,
          image2dUrl: image2dUrl || undefined,
          silhouetteType,
          paletteHarmony: true,
          isFavorite: false,
          details: metadata?.detalles,
          style: metadata?.estilo_recomendado,
          occasion: metadata?.ocasion_recomendada,
        };

        return { garment, model3dUrl, image2dUrl, metadata, warning };
      },
      // Se ejecuta dentro del almacén de trabajos: la prenda se guarda aunque esta pantalla ya esté cerrada.
      onSuccess: (res) => {
        addGarmentToWardrobe(res.garment);
      },
    });

    // Si ya había una generación de prenda en marcha (p. ej. el efecto se ejecutó dos veces) se engancha a ella.
    setJobId(result.job.id);
  }, [addGarmentToWardrobe, imageBase64, imageUri, startJob, userPhotoUrl]);

  useEffect(() => {
    if (routeJobId) return; // reabrir una espera existente: no se inicia otra generación
    launchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeScreen = useCallback(() => {
    if (props.onCancel) {
      props.onCancel();
    } else if (props.navigation?.canGoBack()) {
      props.navigation.goBack();
    }
  }, [props]);

  // Resultado visible en esta pantalla: se mantiene el comportamiento anterior (ir al armario tras un instante).
  useEffect(() => {
    if (!job || completionHandledRef.current) return undefined;

    if (job.status === 'done') {
      completionHandledRef.current = true;
      markJobSeen(job.id);
      const timer = setTimeout(() => {
        const result = job.result as { model3dUrl: string; image2dUrl?: string; metadata?: GarmentMetadata } | undefined;
        if (props.onComplete) {
          props.onComplete({
            model_3d_url: result?.model3dUrl || '',
            image_2d_url: result?.image2dUrl,
            metadata: result?.metadata,
          });
        } else if (props.navigation) {
          try {
            props.navigation.navigate('MainTabs', { screen: 'Wardrobe' });
          } catch {
            props.navigation.navigate('Wardrobe');
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (job.status === 'failed' && job.error?.invalidImage) {
      completionHandledRef.current = true;
      markJobSeen(job.id);
      Alert.alert(errorText(job.error, t).title, errorText(job.error, t).message, [{ text: t('proc.alertOk'), onPress: closeScreen }]);
    }
    return undefined;
  }, [job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelGeneration = () => {
    if (job) cancelJob(job.id);
    closeScreen();
  };

  const handleRetry = () => {
    if (job) dismissJob(job.id);
    launchJob();
  };

  const isRunning = !job || job.status === 'running';
  const hasError = job?.status === 'failed';
  const currentStepIndex = PHASE_INDEX[job?.phase || 'connecting'] ?? 0;
  const currentStep = PIPELINE_STEPS[currentStepIndex] || PIPELINE_STEPS[0];
  const percent = Math.round((job?.progress ?? 0.1) * 100);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.card}>
        {/* Vista miniatura de la prenda en proceso */}
        {imageUri ? (
          <View style={[styles.thumbnailContainer, { borderColor: colors.borderLight }]}>
            <Image source={{ uri: imageUri }} style={styles.thumbnailImage} />
          </View>
        ) : null}

        {/* Icono de procesamiento con efecto de pulso */}
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.borderLight,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons name={hasError ? 'alert-circle-outline' : 'sparkles'} size={42} color={hasError ? '#EF4444' : colors.primary} />
        </Animated.View>

        {hasError ? (
          /* Estado de Error */
          <View style={styles.errorContent}>
            <Text style={[styles.errorTitle, { color: colors.primaryText }]}>{errorText(job?.error, t).title}</Text>
            <Text style={[styles.errorDetail, { color: colors.secondaryText }]}>{errorText(job?.error, t).message}</Text>

            <View style={styles.errorButtonsRow}>
              {job?.error?.retryable ? (
                <TouchableOpacity style={[styles.btnRetry, { backgroundColor: colors.cta }]} onPress={handleRetry} activeOpacity={0.8}>
                  <Ionicons name="refresh" size={18} color={colors.ctaText} />
                  <Text style={[styles.btnRetryText, { color: colors.ctaText }]}>{t('jobs.retry')}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.btnBack, { borderColor: colors.borderLight }]}
                onPress={() => {
                  if (job) markJobSeen(job.id);
                  closeScreen();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnBackText, { color: colors.secondaryText }]}>{t('common.return')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Estado de Procesamiento Activo */
          <View style={styles.activeContent}>
            <Text style={[styles.stepTitle, { color: colors.primaryText }]}>
              {job?.status === 'done' ? t('proc.ready') : `${t(currentStep.titleKey)} · ${percent}%`}
            </Text>
            <Text style={[styles.stepDetail, { color: colors.secondaryText }]}>
              {job?.status === 'done' ? t('proc.saved') : t(currentStep.detailKey)}
            </Text>

            {/* Barra de progreso (progreso real del servidor) */}
            <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceSubtle }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  },
                ]}
              />
            </View>

            {(
              <>
                {/* Checklist de etapas */}
                <View style={styles.stepsList}>
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isPassed = idx < currentStepIndex || job?.status === 'done';
                    const isCurrent = idx === currentStepIndex && job?.status !== 'done';
                    return (
                      <View key={step.id} style={styles.stepItemRow}>
                        <View
                          style={[
                            styles.stepDot,
                            isPassed ? styles.stepDotPassed : isCurrent ? [styles.stepDotCurrent, { backgroundColor: colors.primary }] : styles.stepDotPending,
                          ]}
                        >
                          {isPassed ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                        </View>
                        <Text
                          style={[
                            styles.stepItemLabel,
                            {
                              color: isCurrent ? colors.primaryText : isPassed ? colors.secondaryText : colors.tertiaryText,
                              fontWeight: isCurrent ? '600' : '400',
                            },
                          ]}
                        >
                          {t(step.titleKey)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <Text style={[styles.tipsFooter, { color: colors.tertiaryText }]}>
                  {t('proc.tip')}
                </Text>
              </>
            )}

            {isRunning ? (
              <View style={styles.actionsColumn}>
                <WaitActions
                  onPlay={() => job && openGame(job.id)}
                  onBackground={closeScreen}
                  onCancel={handleCancelGeneration}
                />
              </View>
            ) : null}
          </View>
        )}
      </GlassCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 48,
  },
  gameBox: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  actionsColumn: {
    width: '100%',
    marginTop: Spacing.md,
  },
  fullWidth: {
    width: '100%',
    flex: 0,
  },
  cancelLink: {
    ...Typography.caption,
    fontFamily: Typography.outfit.regular,
    textDecorationLine: 'underline',
    paddingVertical: Spacing.xs,
  },
  card: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  activeContent: {
    width: '100%',
    alignItems: 'center',
  },
  stepTitle: {
    ...Typography.title2,
    fontFamily: Typography.bodoni.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  stepDetail: {
    ...Typography.body,
    fontFamily: Typography.outfit.regular,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    minHeight: 44,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepsList: {
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
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
    backgroundColor: '#2D4238',
  },
  stepDotCurrent: {},
  stepDotPending: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  stepItemLabel: {
    ...Typography.caption,
    fontFamily: Typography.outfit.regular,
  },
  tipsFooter: {
    ...Typography.micro,
    fontFamily: Typography.outfit.regular,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: Spacing.sm,
  },
  errorContent: {
    width: '100%',
    alignItems: 'center',
  },
  errorTitle: {
    ...Typography.title2,
    fontFamily: Typography.bodoni.bold,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  errorDetail: {
    ...Typography.body,
    fontFamily: Typography.outfit.regular,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  btnRetry: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
  },
  btnRetryText: {
    ...Typography.callout,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
  },
  btnBack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  btnBackText: {
    ...Typography.callout,
    fontFamily: Typography.outfit.semiBold,
    fontWeight: '600',
  },
});
