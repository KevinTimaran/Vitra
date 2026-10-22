import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Typography, Spacing, Radius } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { useTheme } from '../contexts/ThemeContext';
import { analyzeGarment, generateTryOn, getLatestModel } from '../services/ai/garmentAnalyzer';
import { GarmentMetadata } from '../services/ai/types';
 
interface GarmentProcessingScreenProps {
  route?: {
    params?: {
      imageBase64?: string;
      imageUri?: string;
      userPhotoUrl?: string;
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
  { id: 1, title: 'Iniciando conexión', detail: 'Conectando con el orquestador FitGlassAI...' },
  { id: 2, title: 'Análisis Gemini', detail: 'Extrayendo fisionomía, colores y estilo de la prenda...' },
  { id: 3, title: 'Fusión 2D (VTON)', detail: 'Combinando la prenda sobre el cuerpo con IDM-VTON...' },
  { id: 4, title: 'Extrusión 3D', detail: 'Generando malla poligonal y materiales PBR en Tripo3D...' },
  { id: 5, title: 'Optimizando .glb', detail: 'Empaquetando modelo 3D para renderizado interactivo...' },
];

export const GarmentProcessingScreen: React.FC<GarmentProcessingScreenProps> = (props) => {
  const { colors, isDark } = useTheme();

  const imageBase64 = props.imageBase64 || props.route?.params?.imageBase64 || '';
  const imageUri = props.imageUri || props.route?.params?.imageUri || '';
  // Imagen de usuario por defecto para prueba si el usuario no ha subido avatar
  const userPhotoUrl =
    props.userPhotoUrl ||
    props.route?.params?.userPhotoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<GarmentMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const progressAnim = useRef(new Animated.Value(0.1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animación continua de pulso en el icono central
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const executePipeline = async () => {
    setIsProcessing(true);
    setError(null);
    setCurrentStepIndex(0);

    // Animación de barra de progreso
    Animated.timing(progressAnim, {
      toValue: 0.25,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    try {
      // Paso 1 & 2: Análisis con Gemini
      setCurrentStepIndex(1);
      console.log('[Processing] Ejecutando análisis Gemini...');
      let metadata: GarmentMetadata | undefined;
      try {
        const analysisRes = await analyzeGarment(imageBase64 || imageUri);
        metadata = analysisRes.data;
        setExtractedMetadata(metadata || null);
      } catch (geminiErr: any) {
        console.warn('[Processing] Gemini aviso:', geminiErr?.message);
      }

      // Paso 3: Fusión 2D (VTON con Replicate)
      setCurrentStepIndex(2);
      Animated.timing(progressAnim, {
        toValue: 0.55,
        duration: 4000,
        useNativeDriver: false,
      }).start();

      // Paso 4: Generación 3D en Tripo3D
      setCurrentStepIndex(3);
      Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: 5000,
        useNativeDriver: false,
      }).start();

      // Invocamos el pipeline de orquestación /api/tryon/generate
      let model3dUrl = '';
      let image2dUrl = '';

      try {
        const tryOnResult = await generateTryOn(userPhotoUrl, imageBase64 || imageUri);
        model3dUrl = tryOnResult.model_3d_url;
        image2dUrl = tryOnResult.image_2d_url;
      } catch (tryOnErr: any) {
        console.warn('[Processing] TryOn aviso:', tryOnErr?.message);
        try {
          const latest = await getLatestModel();
          if (latest?.model_3d_url) {
            console.log('[Processing] Recuperado modelo 3D real generado en el backend:', latest.model_3d_url);
            model3dUrl = latest.model_3d_url;
            image2dUrl = imageBase64 || imageUri || userPhotoUrl;
          }
        } catch {}

        if (!model3dUrl) {
          model3dUrl = '';
          image2dUrl = imageBase64 || imageUri || userPhotoUrl;
        }
      }

      // Paso 5: Finalización
      setCurrentStepIndex(4);
      Animated.timing(progressAnim, {
        toValue: 1.0,
        duration: 800,
        useNativeDriver: false,
      }).start();

      setIsProcessing(false);

      setTimeout(() => {
        if (props.onComplete) {
          props.onComplete({
            model_3d_url: model3dUrl,
            image_2d_url: image2dUrl,
            metadata,
          });
        } else if (props.navigation) {
          // Navegar a la pantalla del Probador (FittingRoom) pasando los parámetros del resultado
          try {
            props.navigation.navigate('MainTabs', {
              screen: 'FittingRoom',
              params: {
                model_3d_url: model3dUrl,
                image_2d_url: image2dUrl,
                metadata,
              },
            });
          } catch {
            props.navigation.navigate('FittingRoom', {
              model_3d_url: model3dUrl,
              image_2d_url: image2dUrl,
              metadata,
            });
          }
        }
      }, 1000);

    } catch (err: any) {
      console.error('[Processing] Fallo general:', err);
      setIsProcessing(false);
      setError(err?.message || 'Error inesperado durante la generación.');
    }
  };

  useEffect(() => {
    executePipeline();
  }, []);

  const handleCancelOrBack = () => {
    if (props.onCancel) {
      props.onCancel();
    } else if (props.navigation?.canGoBack()) {
      props.navigation.goBack();
    }
  };

  const currentStep = PIPELINE_STEPS[currentStepIndex] || PIPELINE_STEPS[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
          <Ionicons
            name={error ? 'alert-circle-outline' : 'sparkles'}
            size={42}
            color={error ? '#EF4444' : colors.primary}
          />
        </Animated.View>

        {error ? (
          /* Estado de Error */
          <View style={styles.errorContent}>
            <Text style={[styles.errorTitle, { color: colors.primaryText }]}>Error en la Generación</Text>
            <Text style={[styles.errorDetail, { color: colors.secondaryText }]}>{error}</Text>

            <View style={styles.errorButtonsRow}>
              <TouchableOpacity
                style={[styles.btnRetry, { backgroundColor: colors.cta }]}
                onPress={executePipeline}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color={colors.ctaText} />
                <Text style={[styles.btnRetryText, { color: colors.ctaText }]}>Reintentar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnBack, { borderColor: colors.borderLight }]}
                onPress={handleCancelOrBack}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnBackText, { color: colors.secondaryText }]}>Volver</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Estado de Procesamiento Activo */
          <View style={styles.activeContent}>
            <Text style={[styles.stepTitle, { color: colors.primaryText }]}>
              {currentStep.title}
            </Text>
            <Text style={[styles.stepDetail, { color: colors.secondaryText }]}>
              {currentStep.detail}
            </Text>

            {/* Barra de progreso animada */}
            <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceSubtle }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
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

            {/* Checklist de etapas */}
            <View style={styles.stepsList}>
              {PIPELINE_STEPS.map((step, idx) => {
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
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.stepItemLabel,
                        {
                          color: isCurrent
                            ? colors.primaryText
                            : isPassed
                            ? colors.secondaryText
                            : colors.tertiaryText,
                          fontWeight: isCurrent ? '600' : '400',
                        },
                      ]}
                    >
                      {step.title}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.tipsFooter, { color: colors.tertiaryText }]}>
              El pipeline generativo 2D-a-3D puede tardar entre 15 y 30 segundos. Por favor mantén la aplicación abierta.
            </Text>
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
    backgroundColor: '#8EB6C7',
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
