import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { setupUserProfile } from '../services/auth/authClient';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface WelcomeOnboardingScreenProps {
  navigation?: any;
  onFinish?: () => void;
}

// Miniaturas de muestra de alta calidad para pruebas rápidas en simulador
const SAMPLE_FACE_PHOTO =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
const SAMPLE_BODY_PHOTO =
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';

// Logotipo Monograma Vitra
const VitraBrandLogoSvg: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = '#111113' }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Rect width="48" height="48" rx="14" fill={color} />
    <Path
      d="M14 16L24 34L34 16"
      stroke="#FFFFFF"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20 16L24 23L28 16"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.8}
    />
  </Svg>
);

export const WelcomeOnboardingScreen: React.FC<WelcomeOnboardingScreenProps> = ({ navigation, onFinish }) => {
  const { colors, isDark } = useTheme();
  const { completeOnboarding } = useUser();
  const { userToken } = useAuth();

  // Paso actual: 1 (Datos Básicos), 2 (Foto Facial), 3 (Foto Corporal)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Paso 1: Datos Básicos
  const [fullName, setFullName] = useState<string>('');
  const [age, setAge] = useState<string>('');

  // Paso 2: Foto Facial (Colorimetría)
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);
  const [faceImageBase64, setFaceImageBase64] = useState<string | null>(null);

  // Paso 3: Foto Corporal (Avatar 3D)
  const [bodyImageUri, setBodyImageUri] = useState<string | null>(null);
  const [bodyImageBase64, setBodyImageBase64] = useState<string | null>(null);

  // Estados de proceso
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ==========================================
  // Manejo de Cámara y Galería
  // ==========================================

  const handlePickImage = async (target: 'face' | 'body', source: 'camera' | 'gallery') => {
    try {
      setErrorMessage(null);

      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          Alert.alert('Permiso Requerido', 'Se requiere acceso a la cámara para capturar la fotografía.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: target === 'face' ? [1, 1] : [3, 4],
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          if (target === 'face') {
            setFaceImageUri(asset.uri);
            setFaceImageBase64(b64);
          } else {
            setBodyImageUri(asset.uri);
            setBodyImageBase64(b64);
          }
        }
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert('Permiso Requerido', 'Se requiere acceso a la fototeca para seleccionar una imagen.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: target === 'face' ? [1, 1] : [3, 4],
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          if (target === 'face') {
            setFaceImageUri(asset.uri);
            setFaceImageBase64(b64);
          } else {
            setBodyImageUri(asset.uri);
            setBodyImageBase64(b64);
          }
        }
      }
    } catch (err: any) {
      console.error('[WelcomeOnboarding] Error al seleccionar imagen:', err);
      setErrorMessage('No fue posible acceder a la cámara o galería.');
    }
  };

  // Carga de imágenes de prueba para simulador
  const handleUseSampleImage = (target: 'face' | 'body') => {
    if (target === 'face') {
      setFaceImageUri(SAMPLE_FACE_PHOTO);
      setFaceImageBase64(SAMPLE_FACE_PHOTO);
    } else {
      setBodyImageUri(SAMPLE_BODY_PHOTO);
      setBodyImageBase64(SAMPLE_BODY_PHOTO);
    }
    setErrorMessage(null);
  };

  // ==========================================
  // Navegación entre pasos y validaciones
  // ==========================================

  const handleNextStep1 = () => {
    setErrorMessage(null);
    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }
    const parsedAge = parseInt(age.trim(), 10);
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 99) {
      setErrorMessage('Por favor ingresa una edad válida (entre 10 y 99 años).');
      return;
    }

    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    setErrorMessage(null);
    if (!faceImageUri) {
      setErrorMessage('Es necesaria una fotografía facial para continuar.');
      return;
    }
    setCurrentStep(3);
  };

  const handleFinishOnboarding = async () => {
    setErrorMessage(null);
    if (!bodyImageUri) {
      setErrorMessage('Es necesaria una fotografía de cuerpo entero para generar tu gemelo digital.');
      return;
    }

    setLoading(true);

    try {
      const parsedAge = parseInt(age.trim(), 10) || 25;

      // 1. Guardar en backend FitGlassAI
      try {
        await setupUserProfile(
          {
            full_name: fullName.trim(),
            age: parsedAge,
            face_image: faceImageBase64 || faceImageUri || undefined,
            body_image: bodyImageBase64 || bodyImageUri || undefined,
          },
          userToken
        );
      } catch (backendErr) {
        console.warn('[WelcomeOnboarding] Aviso en backend setup, continuando con guardado local:', backendErr);
      }

      // 2. Guardar en el estado global (Context)
      completeOnboarding({
        fullName: fullName.trim(),
        age: parsedAge,
        facePhotoUri: faceImageUri || undefined,
        bodyPhotoUri: bodyImageUri || undefined,
        photoUri: bodyImageUri || undefined,
      });

      // 3. Navegar a Home en MainTabs
      if (onFinish) {
        onFinish();
      } else if (navigation) {
        navigation.navigate('MainTabs', { screen: 'Home' });
      }
    } catch (err: any) {
      console.error('[WelcomeOnboarding] Error finalizando configuración:', err);
      setErrorMessage(err?.message || 'Error al completar el asistente.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Renderizado
  // ==========================================

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera / Marca Vitra */}
        <View style={styles.headerContainer}>
          <VitraBrandLogoSvg size={50} color={colors.primaryText} />
          <Text style={[styles.brandTitle, { color: colors.primaryText }]}>VITRA</Text>
          <Text style={[styles.brandSubtitle, { color: colors.secondaryText }]}>
            CONFIGURACIÓN BIOMÉTRICA INICIAL
          </Text>
        </View>

        {/* Tarjeta Central (Card) */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Indicador de Progreso por Pasos */}
          <View style={styles.progressHeader}>
            <View style={styles.stepPillsRow}>
              {[1, 2, 3].map((step) => {
                const isActive = step === currentStep;
                const isPassed = step < currentStep;
                return (
                  <View
                    key={step}
                    style={[
                      styles.stepPill,
                      {
                        backgroundColor: isActive
                          ? colors.primaryText
                          : isPassed
                          ? '#10B981'
                          : colors.surfaceSubtle,
                        borderColor: isActive || isPassed ? 'transparent' : colors.borderLight,
                      },
                    ]}
                  >
                    {isPassed ? (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepPillText,
                          {
                            color: isActive ? colors.bg : colors.secondaryText,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {step}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
            <Text style={[styles.stepLabel, { color: colors.secondaryText }]}>
              {currentStep === 1
                ? 'Paso 1 de 3 · Datos Básicos'
                : currentStep === 2
                ? 'Paso 2 de 3 · Rostro & Colorimetría'
                : 'Paso 3 de 3 · Maniquí 3D Corporal'}
            </Text>
          </View>

          {/* Mensajes de Error */}
          {errorMessage && (
            <View style={[styles.alertBox, styles.errorBox]}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASO 1: DATOS BÁSICOS (BIENVENIDA)                      */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <View>
              <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
                ¡Te damos la bienvenida a Vitra!
              </Text>
              <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                Personaliza tu perfil de estilo y medidas para calibrar las recomendaciones generativas de tu atelier.
              </Text>

              {/* Input: Nombre Completo */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.primaryText }]}>Nombre Completo</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  <Ionicons name="person-outline" size={18} color={colors.secondaryText} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.primaryText }]}
                    placeholder="Ej. Valerie Dubois"
                    placeholderTextColor={colors.tertiaryText}
                    value={fullName}
                    onChangeText={setFullName}
                    maxLength={50}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Input: Edad */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.primaryText }]}>Edad (Años)</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.secondaryText} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.primaryText }]}
                    placeholder="Ej. 26"
                    placeholderTextColor={colors.tertiaryText}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>

              {/* Botón Siguiente */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primaryText },
                  (!fullName.trim() || !age.trim()) && styles.buttonDisabled,
                ]}
                onPress={handleNextStep1}
                disabled={!fullName.trim() || !age.trim()}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryButtonText, { color: colors.bg }]}>Siguiente</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.bg} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASO 2: FOTOGRAFÍA FACIAL (COLORIMETRÍA)                */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <View>
              <Text style={[styles.cardTitle, { color: colors.primaryText }]}>Fotografía Facial</Text>
              <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                Para descubrir los colores que mejor te sientan, necesitamos una foto de tu rostro con buena iluminación.
              </Text>

              {/* Vista Previa de la Miniatura Circular */}
              <View style={styles.thumbnailContainer}>
                {faceImageUri ? (
                  <View style={[styles.circularPreviewWrapper, { borderColor: colors.primaryText }]}>
                    <Image source={{ uri: faceImageUri }} style={styles.circularPreviewImage} />
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.placeholderCircle,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                    ]}
                  >
                    <Ionicons name="camera-outline" size={38} color={colors.secondaryText} />
                    <Text style={[styles.placeholderCircleText, { color: colors.secondaryText }]}>
                      Sin foto seleccionada
                    </Text>
                  </View>
                )}
              </View>

              {/* Botones de Captura (Abrir Cámara y Subir de Galería) */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  ]}
                  onPress={() => handlePickImage('face', 'camera')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="camera" size={18} color={colors.primaryText} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primaryText }]}>Abrir Cámara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  ]}
                  onPress={() => handlePickImage('face', 'gallery')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="images" size={18} color={colors.primaryText} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primaryText }]}>Subir de Galería</Text>
                </TouchableOpacity>
              </View>

              {/* Botón de Relleno Rápido de Muestra (Para pruebas en simulador) */}
              <TouchableOpacity
                style={styles.sampleTextButton}
                onPress={() => handleUseSampleImage('face')}
              >
                <Text style={[styles.sampleButtonText, { color: colors.secondaryText }]}>
                  ⚡ Usar fotografía de muestra para pruebas
                </Text>
              </TouchableOpacity>

              {/* Botones de Navegación del Paso 2 */}
              <View style={styles.stepNavigationRow}>
                <TouchableOpacity
                  style={[styles.backNavButton, { borderColor: colors.borderLight }]}
                  onPress={() => setCurrentStep(1)}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.secondaryText} />
                  <Text style={[styles.backNavText, { color: colors.secondaryText }]}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primaryText, flex: 1 },
                    !faceImageUri && styles.buttonDisabled,
                  ]}
                  onPress={handleNextStep2}
                  disabled={!faceImageUri}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.bg }]}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.bg} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASO 3: FOTOGRAFÍA CORPORAL (AVATAR 3D)                  */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <View>
              <Text style={[styles.cardTitle, { color: colors.primaryText }]}>Fotografía Corporal</Text>
              <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                Finalmente, para crear tu maniquí virtual, tómate una foto de cuerpo entero (postura en A).
              </Text>

              {/* Vista Previa de la Miniatura Corporal */}
              <View style={styles.thumbnailContainer}>
                {bodyImageUri ? (
                  <View style={[styles.bodyPreviewWrapper, { borderColor: colors.primaryText }]}>
                    <Image source={{ uri: bodyImageUri }} style={styles.bodyPreviewImage} />
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.bodyPlaceholder,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                    ]}
                  >
                    <Ionicons name="body-outline" size={44} color={colors.secondaryText} />
                    <Text style={[styles.placeholderCircleText, { color: colors.secondaryText }]}>
                      Sin foto corporal
                    </Text>
                  </View>
                )}
              </View>

              {/* Botones de Captura (Abrir Cámara y Subir de Galería) */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  ]}
                  onPress={() => handlePickImage('body', 'camera')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="camera" size={18} color={colors.primaryText} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primaryText }]}>Abrir Cámara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  ]}
                  onPress={() => handlePickImage('body', 'gallery')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="images" size={18} color={colors.primaryText} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primaryText }]}>Subir de Galería</Text>
                </TouchableOpacity>
              </View>

              {/* Botón de Relleno Rápido de Muestra */}
              <TouchableOpacity
                style={styles.sampleTextButton}
                onPress={() => handleUseSampleImage('body')}
              >
                <Text style={[styles.sampleButtonText, { color: colors.secondaryText }]}>
                  ⚡ Usar fotografía de cuerpo de muestra para pruebas
                </Text>
              </TouchableOpacity>

              {/* Botones de Navegación del Paso 3 (Finalizar) */}
              <View style={styles.stepNavigationRow}>
                <TouchableOpacity
                  style={[styles.backNavButton, { borderColor: colors.borderLight }]}
                  onPress={() => setCurrentStep(2)}
                  disabled={loading}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.secondaryText} />
                  <Text style={[styles.backNavText, { color: colors.secondaryText }]}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primaryText, flex: 1 },
                    (!bodyImageUri || loading) && styles.buttonDisabled,
                  ]}
                  onPress={handleFinishOnboarding}
                  disabled={!bodyImageUri || loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={isDark ? '#111113' : '#FFFFFF'} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color={colors.bg} style={{ marginRight: 6 }} />
                      <Text style={[styles.primaryButtonText, { color: colors.bg }]}>
                        Crear mi Gemelo Digital
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 40,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: Spacing.xs,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  stepPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  stepPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillText: {
    fontSize: 12,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  alertBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  thumbnailContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  circularPreviewWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  circularPreviewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  placeholderCircleText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  bodyPreviewWrapper: {
    width: 140,
    height: 180,
    borderRadius: Radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  bodyPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bodyPlaceholder: {
    width: 140,
    height: 180,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sampleTextButton: {
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sampleButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  primaryButton: {
    height: 48,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  stepNavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  backNavButton: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backNavText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
