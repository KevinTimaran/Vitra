import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTranslation } from '../../contexts/LanguageContext';
import { CameraSilhouetteModal, ImageCropperModal } from '../../components/camera';
import { styles, BACKGROUND_GRADIENT } from './AuthScreen.styles';
import { AuthViewState, RegisterStep, RegisterFormData, GenderType } from './types/auth.types';
import { useAuthFlow } from './hooks/useAuthFlow';
import { useBiometricsCapture } from './hooks/useBiometricsCapture';
import { WelcomeView } from './components/WelcomeView';
import { LoginForm } from './components/LoginForm';
import { RegisterWizard } from './components/RegisterWizard/RegisterWizard';
import { Colors } from '../../theme';

export const AuthScreen: React.FC = () => {
  const { t } = useTranslation();

  // Vista activa: 'welcome' | 'login' | 'register'
  const [viewState, setViewState] = useState<AuthViewState>('welcome');
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);

  // Formulario y estado demo
  const [demoLoginEmail, setDemoLoginEmail] = useState<string>('');
  const [demoLoginPass, setDemoLoginPass] = useState<string>('');
  const [wizardGender, setWizardGender] = useState<GenderType>('female');

  // Hook de autenticación y lógica de backend
  const {
    loading,
    errorMessage,
    successMessage,
    setErrorMessage,
    clearMessages,
    handleLoginSubmit,
    handleFinishRegister,
    handleForgotPassword,
    demoCredentials,
  } = useAuthFlow();

  // Hook desacoplado de captura y procesamiento biométrico
  const {
    faceImageUri,
    faceImageBase64,
    bodyImageUri,
    bodyImageBase64,
    showBodyCamera,
    showBodyCropper,
    galleryTempUri,
    errorMessage: biometricError,
    setShowBodyCamera,
    setShowBodyCropper,
    setGalleryTempUri,
    setBodyImages,
    handlePickImage,
    handleUseSampleBiometrics,
    clearBiometrics,
  } = useBiometricsCapture();

  const activeErrorMessage = errorMessage || biometricError;

  // Limpiar mensajes y resetear pasos al cambiar de vista
  const handleSwitchView = useCallback((newView: AuthViewState) => {
    clearMessages();
    if (newView === 'register') {
      setRegisterStep(1);
    }
    setViewState(newView);
  }, [clearMessages]);

  // Carga de credenciales demo
  const handleFillDemo = useCallback(() => {
    setDemoLoginEmail(demoCredentials.email);
    setDemoLoginPass(demoCredentials.password);
  }, [demoCredentials]);

  // Manejo de registro final
  const onFinishRegister = async (data: RegisterFormData, skipPhotos: boolean) => {
    setWizardGender(data.gender);
    await handleFinishRegister(
      data,
      {
        faceImageUri,
        faceImageBase64,
        bodyImageUri,
        bodyImageBase64,
      },
      skipPhotos
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      {/* Fondo con Gradiente Atelier Suave */}
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
          <WelcomeView
            onCreateAccount={() => handleSwitchView('register')}
            onSignIn={() => handleSwitchView('login')}
            onDemoFill={() => {
              handleFillDemo();
              handleSwitchView('login');
            }}
          />
        )}

        {/* ============================================================ */}
        {/* VISTAS 2 Y 3: LOGIN & REGISTER (BOTTOM SHEET CARD)           */}
        {/* ============================================================ */}
        {viewState !== 'welcome' && (
          <View style={styles.sheetParent}>
            {/* Barra superior con navegación hacia atrás */}
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
                <Ionicons name="arrow-back" size={22} color={Colors.buttons.neutralText} />
              </TouchableOpacity>

              <Text style={styles.topBrandName}>VITRA</Text>

              <View style={{ width: 40 }} />
            </View>

            {/* Contenedor estilo Bottom Sheet */}
            <View style={styles.whiteBottomSheetCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetScrollContent}
              >
                <View style={styles.sheetHandleIndicator} />

                {/* Encabezado Login */}
                {viewState === 'login' && (
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{t('auth.welcomeBack')}</Text>
                    <Text style={styles.sheetSubtitle}>{t('auth.welcomeBackSubtitle')}</Text>
                  </View>
                )}

                {/* Alertas de Error o Éxito */}
                {activeErrorMessage && (
                  <View style={styles.alertErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.alertErrorText}>{activeErrorMessage}</Text>
                      {activeErrorMessage.includes('Ya existe una cuenta') && viewState === 'register' && (
                        <TouchableOpacity
                          style={{ marginTop: 6 }}
                          onPress={() => handleSwitchView('login')}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: Colors.buttons.linkText, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' }}>
                            Iniciar Sesión con esta cuenta →
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                {successMessage && (
                  <View style={styles.alertSuccessBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                    <Text style={styles.alertSuccessText}>{successMessage}</Text>
                  </View>
                )}

                {/* FORMULARIO LOGIN */}
                {viewState === 'login' && (
                  <LoginForm
                    initialEmail={demoLoginEmail}
                    initialPassword={demoLoginPass}
                    loading={loading}
                    errorMessage={null}
                    onSubmit={handleLoginSubmit}
                    onForgotPassword={handleForgotPassword}
                    onSwitchToRegister={() => handleSwitchView('register')}
                    onFillDemoCredentials={handleFillDemo}
                  />
                )}

                {/* WIZARD REGISTRO (PASOS 1, 2, 3) */}
                {viewState === 'register' && (
                  <RegisterWizard
                    currentStep={registerStep}
                    onStepChange={setRegisterStep}
                    loading={loading}
                    faceImageUri={faceImageUri}
                    bodyImageUri={bodyImageUri}
                    onPickImage={handlePickImage}
                    onUseSampleBiometrics={handleUseSampleBiometrics}
                    onFinishRegister={onFinishRegister}
                    onSwitchToLogin={() => handleSwitchView('login')}
                    onError={setErrorMessage}
                  />
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Modal de Cámara con Silueta Translúcida A-Pose */}
      <CameraSilhouetteModal
        visible={showBodyCamera}
        onClose={() => setShowBodyCamera(false)}
        gender={wizardGender}
        onPhotoSelected={(croppedUri, b64) => {
          setBodyImages(croppedUri, b64 ?? null);
        }}
      />

      {/* Modal de Recorte Ajustado de Cabeza a Pies para Galería */}
      <ImageCropperModal
        visible={showBodyCropper}
        imageUri={galleryTempUri}
        onConfirm={(croppedUri, b64) => {
          setShowBodyCropper(false);
          setGalleryTempUri(null);
          setBodyImages(croppedUri, b64 ?? null);
        }}
        onCancel={() => {
          setShowBodyCropper(false);
          setGalleryTempUri(null);
        }}
      />
    </KeyboardAvoidingView>
  );
};
