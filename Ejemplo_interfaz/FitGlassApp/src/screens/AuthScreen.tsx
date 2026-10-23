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
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { loginUser, registerUser, setupUserProfile } from '../services/auth/authClient';
import { getLatestAvatarModel } from '../services/ai/garmentAnalyzer';
import { Typography, Spacing, Radius } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Paleta Atelier: Perla difusa, Tiffany Blue y Teal
const BACKGROUND_GRADIENT = ['#F9F9F7', '#EEF4F6', '#E2ECF0'] as const;
const BUTTON_GRADIENT = ['#3C6473', '#2E505E'] as const;

export const AuthScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { login } = useAuth();
  const { completeOnboarding } = useUser();

  // Vista activa: 'welcome' | 'login' | 'register'
  const [viewState, setViewState] = useState<'welcome' | 'login' | 'register'>('welcome');

  // Wizard de Registro: Paso 1 (Credenciales), Paso 2 (Datos Personales), Paso 3 (Biometría)
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);

  // Campos de formulario
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'female' | 'male' | 'non-binary'>('female');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Fotografías biométricas
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);
  const [faceImageBase64, setFaceImageBase64] = useState<string | null>(null);
  const [bodyImageUri, setBodyImageUri] = useState<string | null>(null);
  const [bodyImageBase64, setBodyImageBase64] = useState<string | null>(null);

  // Estados de proceso y feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Limpiar mensajes y resetear pasos al cambiar de vista
  const handleSwitchView = (newView: 'welcome' | 'login' | 'register') => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (newView === 'register') {
      setRegisterStep(1);
    }
    setViewState(newView);
  };

  // Captura de imagen (Cámara o Galería)
  const handlePickImage = async (target: 'face' | 'body', source: 'camera' | 'gallery') => {
    try {
      setErrorMessage(null);
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
        quality: 0.8,
        base64: true,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Formatted = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        // Comprimir y redimensionar la fotografía para mantener el payload bajo (<250KB)
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (manipulated.base64) {
            base64Formatted = `data:image/jpeg;base64,${manipulated.base64}`;
          }
        } catch (mErr) {
          console.warn('[AuthScreen] Advertencia optimizando imagen con ImageManipulator:', mErr);
        }

        if (target === 'face') {
          setFaceImageUri(asset.uri);
          setFaceImageBase64(base64Formatted);
        } else {
          setBodyImageUri(asset.uri);
          setBodyImageBase64(base64Formatted);
        }
      }
    } catch (err: any) {
      console.error('[AuthScreen] Error al seleccionar imagen:', err);
      setErrorMessage(err?.message || 'Error al capturar la imagen.');
    }
  };

  // Cargar fotos de muestra para desarrollo rápido
  const handleUseSampleBiometrics = () => {
    const sampleFace =
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
    const sampleBody =
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';

    setFaceImageUri(sampleFace);
    setFaceImageBase64(sampleFace);
    setBodyImageUri(sampleBody);
    setBodyImageBase64(sampleBody);
  };

  // Validar y avanzar en el Wizard de Registro
  const handleNextRegisterStep = () => {
    setErrorMessage(null);

    if (registerStep === 1) {
      // Validar Credenciales
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        setErrorMessage(t('auth.email') + ' es requerido.');
        return;
      }
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setErrorMessage('Por favor ingresa un correo electrónico válido.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      setRegisterStep(2);
    } else if (registerStep === 2) {
      // Validar Datos Personales
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
      if (!gender) {
        setErrorMessage('Por favor selecciona tu género para configurar tu silueta base.');
        return;
      }
      setRegisterStep(3);
    }
  };

  // Finalizar Registro Unificado (Crea cuenta + Biometría + Login sin pantallas intermedias)
  const handleFinishRegister = async (skipPhotos: boolean = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    const parsedAge = parseInt(age.trim(), 10) || 24;

    try {
      // 1. Registrar usuario en backend
      await registerUser(cleanEmail, password, cleanName);
      setSuccessMessage(
        skipPhotos
          ? '¡Cuenta creada! Asignando silueta atelier optimizada...'
          : '¡Cuenta creada exitosamente! Configurando gemelo digital...'
      );

      // 2. Iniciar sesión para obtener token JWT
      const loginResult = await loginUser(cleanEmail, password);
      const token = loginResult.access_token;

      // 3. Enviar datos de perfil y biometría al backend
      // Si el usuario omitió fotos, NO enviamos face_image ni body_image
      const shouldIncludePhotos = !skipPhotos;
      const sendFace = shouldIncludePhotos ? (faceImageBase64 || undefined) : undefined;
      const sendBody = shouldIncludePhotos ? (bodyImageBase64 || undefined) : undefined;

      let setupRes: any = null;
      try {
        console.log('[AuthScreen] Registrando y configurando perfil en backend...', {
          email: cleanEmail,
          skipPhotos,
          hasFace: Boolean(sendFace),
          hasBody: Boolean(sendBody),
        });
        setupRes = await setupUserProfile(
          {
            full_name: cleanName,
            age: parsedAge,
            gender: gender,
            face_image: sendFace,
            body_image: sendBody,
          },
          token
        );
        console.log('[AuthScreen] Respuesta de setupUserProfile recibida:', setupRes);
      } catch (setupErr) {
        console.warn('[AuthScreen] Advertencia en setup de perfil en backend:', setupErr);
        // Recuperación inteligente: si el backend alcanzó a generar el avatar 3D pero la conexión móvil parpadeó
        if (sendBody) {
          try {
            const latest = await getLatestAvatarModel();
            if (latest?.avatar_url) {
              console.log('[AuthScreen] Avatar 3D recuperado exitosamente tras advertencia de red:', latest.avatar_url);
              setupRes = {
                avatar_url: latest.avatar_url,
                avatar_type: 'custom_3d',
              };
            }
          } catch (recErr) {
            console.warn('[AuthScreen] No se pudo recuperar avatar más reciente:', recErr);
          }
        }
      }

      // 4. Guardar datos en el estado global (Context) con avatarUrl obtenido del backend
      completeOnboarding({
        fullName: cleanName,
        age: parsedAge,
        gender: gender,
        facePhotoUri: shouldIncludePhotos ? (faceImageUri || undefined) : undefined,
        bodyPhotoUri: shouldIncludePhotos ? (bodyImageUri || undefined) : undefined,
        photoUri: shouldIncludePhotos ? (bodyImageUri || undefined) : undefined,
        avatarUrl: setupRes?.avatar_url || undefined,
        avatarType: setupRes?.avatar_type || (sendBody ? 'custom_3d' : 'preset'),
        colorProfile: setupRes?.color_profile || undefined,
      });

      // 5. Establecer sesión activa (navega inmediatamente a Home sin intermediarios)
      await login(token, cleanEmail);
    } catch (err: any) {
      console.error('[AuthScreen] Error en registro unificado:', err);
      setErrorMessage(err?.message || 'Error al completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  // Enviar formulario de Login
  const handleLoginSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser(cleanEmail, password);
      await login(result.access_token, cleanEmail);
    } catch (err: any) {
      console.error('[AuthScreen] Error de inicio de sesión:', err);
      setErrorMessage(err?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  // Relleno rápido para pruebas en desarrollo
  const fillDemoCredentials = () => {
    setEmail('demo@vitra.ai');
    setPassword('password123');
    setFullName('Usuario Vitra');
    setAge('26');
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      {/* Fondo con Gradiente Suave (Púrpura / Rosa / Durazno) */}
      <LinearGradient
        colors={BACKGROUND_GRADIENT}
        start={{ x: 0.1, y: 0.0 }}
        end={{ x: 0.9, y: 1.0 }}
        style={styles.gradientBackground}
      >
        {/* ============================================================ */}
        {/* VISTA 1: WELCOME (PANTALLA INICIAL)                         */}
        {/* ============================================================ */}
        {viewState === 'welcome' && (
          <ScrollView
            contentContainerStyle={styles.welcomeScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Cabecera / Marca */}
            <View style={styles.brandHeader}>
              <View style={styles.brandBadge}>
                <Ionicons name="sparkles" size={14} color="#3C6473" />
                <Text style={styles.brandBadgeText}>HAUTE COUTURE DIGITAL</Text>
              </View>
            </View>

            {/* Ilustración Central de Moda & Gemelo Digital 3D */}
            <View style={styles.heroIllustrationContainer}>
              <View style={styles.outerGlowCircle}>
                <View style={styles.innerGlowCircle}>
                  <Ionicons name="shirt-outline" size={72} color="#3C6473" />
                  <View style={styles.floatingGemBadge}>
                    <Ionicons name="cube-outline" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>

            {/* Textos Centrales */}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>{t('auth.welcomeTitle')}</Text>
              <Text style={styles.welcomeSubtitle}>{t('auth.welcomeSubtitle')}</Text>
            </View>

            {/* Botones de Acción Inferiores */}
            <View style={styles.welcomeActionsContainer}>
              {/* Botón Crear Cuenta */}
              <TouchableOpacity
                style={styles.btnCreateAccount}
                onPress={() => handleSwitchView('register')}
                activeOpacity={0.88}
              >
                <Text style={styles.btnCreateAccountText}>{t('auth.createAccount')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              {/* Botón Iniciar Sesión */}
              <TouchableOpacity
                style={styles.btnSignInOutline}
                onPress={() => handleSwitchView('login')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSignInOutlineText}>{t('auth.signIn')}</Text>
              </TouchableOpacity>

              {/* Botón de credenciales demo */}
              <TouchableOpacity
                style={styles.demoLinkButton}
                onPress={() => {
                  fillDemoCredentials();
                  handleSwitchView('login');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.demoLinkText}>{t('auth.demoFill')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ============================================================ */}
        {/* VISTAS 2 Y 3: LOGIN & REGISTER (BOTTOM SHEET CARD)           */}
        {/* ============================================================ */}
        {viewState !== 'welcome' && (
          <View style={styles.sheetParent}>
            {/* Barra superior transparente sobre el gradiente */}
            <View style={styles.sheetTopBar}>
              <TouchableOpacity
                style={styles.backIconButton}
                onPress={() => {
                  if (viewState === 'register' && registerStep > 1) {
                    setRegisterStep((prev) => (prev - 1) as 1 | 2);
                  } else {
                    handleSwitchView('welcome');
                  }
                }}
                activeOpacity={0.7}
                accessibilityLabel={t('auth.back')}
              >
                <Ionicons name="arrow-back" size={22} color="#1A1C1B" />
              </TouchableOpacity>

              <Text style={styles.topBrandName}>VITRA</Text>

              <View style={{ width: 40 }} />
            </View>

            {/* Contenedor Blanco estilo Bottom Sheet */}
            <View style={styles.whiteBottomSheetCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetScrollContent}
              >
                {/* Tirador indicador superior del modal */}
                <View style={styles.sheetHandleIndicator} />

                {/* ---------------- LOGIN HEADER ---------------- */}
                {viewState === 'login' && (
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{t('auth.welcomeBack')}</Text>
                    <Text style={styles.sheetSubtitle}>{t('auth.welcomeBackSubtitle')}</Text>
                  </View>
                )}

                {/* ---------------- REGISTER WIZARD STEP HEADER ---------------- */}
                {viewState === 'register' && (
                  <View style={styles.wizardHeaderContainer}>
                    {/* Stepper Pills */}
                    <View style={styles.wizardPillsRow}>
                      {[1, 2, 3].map((step) => {
                        const isActive = step === registerStep;
                        const isPassed = step < registerStep;
                        return (
                          <View
                            key={step}
                            style={[
                              styles.wizardPill,
                              {
                                backgroundColor: isActive
                                  ? '#3C6473'
                                  : isPassed
                                  ? '#8EB6C7'
                                  : '#EEEEEC',
                              },
                            ]}
                          >
                            {isPassed ? (
                              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                            ) : (
                              <Text
                                style={[
                                  styles.wizardPillText,
                                  { color: isActive ? '#FFFFFF' : '#71787C' },
                                ]}
                              >
                                {step}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    <Text style={styles.sheetTitle}>
                      {registerStep === 1
                        ? t('auth.createAccountTitle')
                        : registerStep === 2
                        ? 'Datos Personales'
                        : 'Identidad Biométrica'}
                    </Text>
                    <Text style={styles.sheetSubtitle}>
                      {registerStep === 1
                        ? t('auth.step1Subtitle')
                        : registerStep === 2
                        ? t('auth.step2Subtitle')
                        : t('auth.step3Subtitle')}
                    </Text>
                  </View>
                )}

                {/* Alertas de Error o Éxito */}
                {errorMessage && (
                  <View style={styles.alertErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.alertErrorText}>{errorMessage}</Text>
                  </View>
                )}
                {successMessage && (
                  <View style={styles.alertSuccessBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                    <Text style={styles.alertSuccessText}>{successMessage}</Text>
                  </View>
                )}

                {/* ====================================================== */}
                {/* FORMULARIO DE LOGIN                                   */}
                {/* ====================================================== */}
                {viewState === 'login' && (
                  <View style={styles.formContainer}>
                    {/* Email */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="tu@email.com"
                          placeholderTextColor="#94A3B8"
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="••••••••"
                          placeholderTextColor="#94A3B8"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.passwordToggle}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#64748B"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Recordarme / Olvidé contraseña */}
                    <View style={styles.optionsRow}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            rememberMe && styles.checkboxBoxActive,
                          ]}
                        >
                          {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={styles.checkboxLabel}>{t('auth.rememberMe')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Recuperar Contraseña', 'Ingresa tu correo para recibir las instrucciones.');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Submit Login */}
                    <TouchableOpacity
                      onPress={handleLoginSubmit}
                      disabled={loading}
                      activeOpacity={0.88}
                      style={styles.submitButtonTouchable}
                    >
                      <LinearGradient
                        colors={BUTTON_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitGradientPill}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Text style={styles.submitButtonText}>{t('auth.signIn')}</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Social Login */}
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    <View style={styles.socialIconsRow}>
                      <TouchableOpacity
                        style={styles.socialCircleBtn}
                        onPress={() => {
                          fillDemoCredentials();
                          Alert.alert('Acceso Rápido', 'Credenciales demo cargadas.');
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="logo-google" size={20} color="#EA4335" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.socialCircleBtn}
                        onPress={() => Alert.alert('Apple ID', 'Disponible en compilación nativa.')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="logo-apple" size={21} color="#000000" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.socialCircleBtn}
                        onPress={() => Alert.alert('Facebook', 'Disponible en compilación nativa.')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="logo-facebook" size={21} color="#1877F2" />
                      </TouchableOpacity>
                    </View>

                    {/* Switch to Register */}
                    <View style={styles.footerRow}>
                      <View style={styles.switchPromptRow}>
                        <Text style={styles.switchPromptText}>{t('auth.noAccount')} </Text>
                        <TouchableOpacity onPress={() => handleSwitchView('register')} activeOpacity={0.7}>
                          <Text style={styles.switchActionHighlight}>{t('auth.registerLink')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* ====================================================== */}
                {/* WIZARD DE REGISTRO: PASO 1 (CREDENCIALES)             */}
                {/* ====================================================== */}
                {viewState === 'register' && registerStep === 1 && (
                  <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="tu@email.com"
                          placeholderTextColor="#94A3B8"
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Mínimo 6 caracteres"
                          placeholderTextColor="#94A3B8"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.passwordToggle}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#64748B"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Botón Siguiente a Datos Personales */}
                    <TouchableOpacity
                      onPress={handleNextRegisterStep}
                      activeOpacity={0.88}
                      style={styles.submitButtonTouchable}
                    >
                      <LinearGradient
                        colors={BUTTON_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitGradientPill}
                      >
                        <Text style={styles.submitButtonText}>{t('auth.next')}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footerRow}>
                      <View style={styles.switchPromptRow}>
                        <Text style={styles.switchPromptText}>{t('auth.haveAccount')} </Text>
                        <TouchableOpacity onPress={() => handleSwitchView('login')} activeOpacity={0.7}>
                          <Text style={styles.switchActionHighlight}>{t('auth.loginLink')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* ====================================================== */}
                {/* WIZARD DE REGISTRO: PASO 2 (DATOS PERSONALES)         */}
                {/* ====================================================== */}
                {viewState === 'register' && registerStep === 2 && (
                  <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('auth.fullName')}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('auth.fullNamePlaceholder')}
                          placeholderTextColor="#94A3B8"
                          value={fullName}
                          onChangeText={setFullName}
                          autoCapitalize="words"
                          maxLength={50}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('auth.age')}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="calendar-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('auth.agePlaceholder')}
                          placeholderTextColor="#94A3B8"
                          value={age}
                          onChangeText={setAge}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                      </View>
                    </View>

                    {/* Selector de Género / Silueta Base (Requerido) */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Género / Silueta Base (Requerido)</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        {(
                          [
                            { id: 'female', label: 'Femenino', icon: 'female-outline' },
                            { id: 'male', label: 'Masculino', icon: 'male-outline' },
                            { id: 'non-binary', label: 'Fluido / Neutro', icon: 'male-female-outline' },
                          ] as const
                        ).map((opt) => {
                          const isSel = gender === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={{
                                flex: 1,
                                paddingVertical: 10,
                                paddingHorizontal: 4,
                                borderRadius: 9999,
                                borderWidth: 1.5,
                                borderColor: isSel ? '#3C6473' : '#E2E8F0',
                                backgroundColor: isSel ? '#3C6473' : '#FFFFFF',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 4,
                              }}
                              onPress={() => setGender(opt.id)}
                              activeOpacity={0.75}
                            >
                              <Ionicons
                                name={opt.icon as any}
                                size={14}
                                color={isSel ? '#FFFFFF' : '#64748B'}
                              />
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '600',
                                  color: isSel ? '#FFFFFF' : '#334155',
                                }}
                                numberOfLines={1}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Botones de Navegación del Paso 2 */}
                    <View style={styles.wizardButtonsRow}>
                      <TouchableOpacity
                        style={styles.btnSecondaryStep}
                        onPress={() => setRegisterStep(1)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="arrow-back" size={16} color="#334155" />
                        <Text style={styles.btnSecondaryStepText}>{t('auth.back')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnPrimaryStep, { flex: 1 }]}
                        onPress={handleNextRegisterStep}
                        activeOpacity={0.88}
                      >
                        <LinearGradient
                          colors={BUTTON_GRADIENT}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.submitGradientPill}
                        >
                          <Text style={styles.submitButtonText}>{t('auth.next')}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ====================================================== */}
                {/* WIZARD DE REGISTRO: PASO 3 (BIOMETRÍA)                */}
                {/* ====================================================== */}
                {viewState === 'register' && registerStep === 3 && (
                  <View style={styles.formContainer}>
                    {/* Nota informativa de fotos opcionales */}
                    <View style={{
                      backgroundColor: '#F1F5F9',
                      padding: 12,
                      borderRadius: 12,
                      marginBottom: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: '#3C6473',
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>
                        Gemelo Digital (Fotografías Opcionales)
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>
                        Puedes subir tus fotos ahora para un gemelo personalizado o continuar directamente para usar la silueta 3D atelier asignada a tu perfil.
                      </Text>
                    </View>

                    {/* 1. Fotografía Facial */}
                    <View style={styles.biometricSection}>
                      <View style={styles.biometricHeaderRow}>
                        <Ionicons name="color-palette-outline" size={18} color="#3C6473" />
                        <Text style={styles.biometricSectionTitle}>{t('auth.facialPhoto')} (Opcional)</Text>
                      </View>
                      <Text style={styles.biometricSectionDesc}>{t('auth.facialDesc')}</Text>

                      <View style={styles.biometricPreviewRow}>
                        {faceImageUri ? (
                          <View style={styles.circularFacePreview}>
                            <Image source={{ uri: faceImageUri }} style={styles.circularFaceImage} />
                            <View style={styles.badgeCheckOverlay}>
                              <Ionicons name="checkmark-circle" size={20} color="#8EB6C7" />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.circularFacePlaceholder}>
                            <Ionicons name="person" size={28} color="#94A3B8" />
                          </View>
                        )}

                        <View style={styles.biometricButtonsColumn}>
                          <TouchableOpacity
                            style={styles.mediaActionButton}
                            onPress={() => handlePickImage('face', 'camera')}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="camera-outline" size={16} color="#1A1C1B" />
                            <Text style={styles.mediaActionText}>{t('auth.openCamera')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.mediaActionButton}
                            onPress={() => handlePickImage('face', 'gallery')}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="images-outline" size={16} color="#1A1C1B" />
                            <Text style={styles.mediaActionText}>{t('auth.openGallery')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* 2. Fotografía Corporal */}
                    <View style={styles.biometricSection}>
                      <View style={styles.biometricHeaderRow}>
                        <Ionicons name="body-outline" size={18} color="#3C6473" />
                        <Text style={styles.biometricSectionTitle}>{t('auth.bodyPhoto')}</Text>
                      </View>
                      <Text style={styles.biometricSectionDesc}>{t('auth.bodyDesc')}</Text>

                      <View style={styles.biometricPreviewRow}>
                        {bodyImageUri ? (
                          <View style={styles.rectangularBodyPreview}>
                            <Image source={{ uri: bodyImageUri }} style={styles.rectangularBodyImage} />
                            <View style={styles.badgeCheckOverlay}>
                              <Ionicons name="checkmark-circle" size={20} color="#8EB6C7" />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.rectangularBodyPlaceholder}>
                            <Ionicons name="body-outline" size={28} color="#94A3B8" />
                          </View>
                        )}

                        <View style={styles.biometricButtonsColumn}>
                          <TouchableOpacity
                            style={styles.mediaActionButton}
                            onPress={() => handlePickImage('body', 'camera')}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="camera-outline" size={16} color="#1A1C1B" />
                            <Text style={styles.mediaActionText}>{t('auth.openCamera')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.mediaActionButton}
                            onPress={() => handlePickImage('body', 'gallery')}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="images-outline" size={16} color="#1A1C1B" />
                            <Text style={styles.mediaActionText}>{t('auth.openGallery')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Botón rápido de fotos muestra */}
                    <TouchableOpacity
                      onPress={handleUseSampleBiometrics}
                      style={styles.sampleBiometricsBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="sparkles" size={14} color="#3C6473" />
                      <Text style={styles.sampleBiometricsText}>Cargar fotografías de muestra (Demo)</Text>
                    </TouchableOpacity>

                    {/* Botón explícito para Omitir Fotos y usar Avatar 3D por Defecto */}
                    <TouchableOpacity
                      style={styles.skipBiometricsBtn}
                      onPress={() => handleFinishRegister(true)}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="play-skip-forward-outline" size={15} color="#475569" style={{ marginRight: 6 }} />
                      <Text style={styles.skipBiometricsBtnText}>
                        Omitir fotos y usar avatar 3D por defecto
                      </Text>
                    </TouchableOpacity>

                    {/* Botones de Finalización */}
                    <View style={styles.wizardButtonsRow}>
                      <TouchableOpacity
                        style={styles.btnSecondaryStep}
                        onPress={() => setRegisterStep(2)}
                        activeOpacity={0.75}
                        disabled={loading}
                      >
                        <Ionicons name="arrow-back" size={16} color="#334155" />
                        <Text style={styles.btnSecondaryStepText}>{t('auth.back')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnPrimaryStep, { flex: 1 }]}
                        onPress={() => handleFinishRegister(false)}
                        disabled={loading}
                        activeOpacity={0.88}
                      >
                        <LinearGradient
                          colors={BUTTON_GRADIENT}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.submitGradientPill}
                        >
                          {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <>
                              <Text style={styles.submitButtonText}>{t('auth.finishRegister')}</Text>
                              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

// ==========================================
// Estilos UI
// ==========================================

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },

  // ----------------------------------------
  // Vista 1: Welcome
  // ----------------------------------------
  welcomeScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: Spacing.huge,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(193, 199, 203, 0.5)',
  },
  brandBadgeText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#3C6473',
    letterSpacing: 1.5,
  },
  heroIllustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  outerGlowCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(142, 182, 199, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C6473',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  innerGlowCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  floatingGemBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3C6473',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  welcomeTitle: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1C1B',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontFamily: Typography.outfit.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#41484B',
    textAlign: 'center',
    maxWidth: 320,
  },
  welcomeActionsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  btnCreateAccount: {
    height: 52,
    backgroundColor: '#3C6473',
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  btnCreateAccountText: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnSignInOutline: {
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: '#3C6473',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSignInOutlineText: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: '#3C6473',
  },
  demoLinkButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  demoLinkText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#41484B',
    textDecorationLine: 'underline',
  },

  // ----------------------------------------
  // Vistas 2 y 3: Bottom Sheet (Login & Register)
  // ----------------------------------------
  sheetParent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 28,
    paddingBottom: Spacing.md,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBrandName: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#1A1C1B',
  },
  whiteBottomSheetCard: {
    height: SCREEN_HEIGHT * 0.78,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
    paddingTop: Spacing.md,
  },
  sheetScrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.huge,
  },
  sheetHandleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E3E1',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1C1B',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: Typography.outfit.regular,
    fontSize: 14,
    color: '#41484B',
    lineHeight: 20,
  },

  // Wizard Stepper
  wizardHeaderContainer: {
    marginBottom: Spacing.lg,
  },
  wizardPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  wizardPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardPillText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 12,
    fontWeight: '700',
  },

  alertErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  alertErrorText: {
    fontFamily: Typography.outfit.regular,
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  alertSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  alertSuccessText: {
    fontFamily: Typography.outfit.regular,
    fontSize: 13,
    color: '#15803D',
    flex: 1,
  },

  formContainer: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#41484B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F7',
    borderWidth: 1,
    borderColor: '#C1C7CB',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    fontFamily: Typography.outfit.regular,
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#1A1C1B',
  },
  passwordToggle: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#71787C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxActive: {
    backgroundColor: '#3C6473',
    borderColor: '#3C6473',
  },
  checkboxLabel: {
    fontFamily: Typography.outfit.regular,
    fontSize: 13,
    color: '#41484B',
  },
  forgotPasswordText: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#3C6473',
  },
  submitButtonTouchable: {
    marginTop: Spacing.sm,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitGradientPill: {
    height: 50,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  submitButtonText: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  wizardButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btnSecondaryStep: {
    height: 50,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#C1C7CB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F9F9F7',
  },
  btnSecondaryStepText: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#41484B',
  },
  btnPrimaryStep: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },

  // Biometrics Section
  biometricSection: {
    backgroundColor: '#F9F9F7',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(193, 199, 203, 0.5)',
    gap: Spacing.xs,
  },
  biometricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  biometricSectionTitle: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1B',
  },
  biometricSectionDesc: {
    fontFamily: Typography.outfit.regular,
    fontSize: 12,
    color: '#41484B',
    marginBottom: Spacing.xs,
  },
  biometricPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  circularFacePreview: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#8EB6C7',
    position: 'relative',
    overflow: 'visible',
  },
  circularFaceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  circularFacePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEEEEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rectangularBodyPreview: {
    width: 68,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: '#8EB6C7',
    position: 'relative',
  },
  rectangularBodyImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md - 2,
  },
  rectangularBodyPlaceholder: {
    width: 68,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: '#EEEEEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheckOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  biometricButtonsColumn: {
    flex: 1,
    gap: 6,
  },
  mediaActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C1C7CB',
    borderRadius: Radius.pill,
  },
  mediaActionText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1C1B',
  },
  sampleBiometricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  sampleBiometricsText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#3C6473',
    textDecorationLine: 'underline',
  },
  skipBiometricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 4,
  },
  skipBiometricsBtnText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E3E1',
  },
  dividerText: {
    fontFamily: Typography.outfit.regular,
    paddingHorizontal: Spacing.md,
    fontSize: 12,
    color: '#71787C',
  },
  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  socialCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C1C7CB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  switchPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchPromptText: {
    fontFamily: Typography.outfit.regular,
    fontSize: 14,
    color: '#71787C',
  },
  switchActionHighlight: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#3C6473',
  },
});
