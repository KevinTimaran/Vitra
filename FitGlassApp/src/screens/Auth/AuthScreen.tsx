import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../../contexts/LanguageContext';
import { CameraSilhouetteModal, ImageCropperModal } from '../../components/camera';
import { styles, BACKGROUND_GRADIENT } from './AuthScreen.styles';
import { AuthViewState, RegisterStep, RegisterFormData, GenderType } from './types/auth.types';
import { ACCOUNT_EXISTS_MESSAGE, isAccountAlreadyRegisteredError, useAuthFlow } from './hooks/useAuthFlow';
import { useBiometricsCapture } from './hooks/useBiometricsCapture';
import { WelcomeView } from './components/WelcomeView';
import { LoginForm } from './components/LoginForm';
import { RegisterWizard } from './components/RegisterWizard/RegisterWizard';
import { RegisterProgress } from './components/RegisterProgress';
import { checkEmailExists } from './services/authActions';
import { Colors } from '../../theme';

export const AuthScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Vista activa: 'welcome' | 'login' | 'register'
  const [viewState, setViewState] = useState<AuthViewState>('welcome');
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);

  // Formulario y estado demo
  const [demoLoginEmail, setDemoLoginEmail] = useState<string>('');
  const [demoLoginPass, setDemoLoginPass] = useState<string>('');
  const [wizardGender, setWizardGender] = useState<GenderType>('female');
  const [accountExistsEmail, setAccountExistsEmail] = useState<string | null>(null);

  // Hook de autenticación y lógica de backend
  const {
    loading,
    registerStage,
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
    showFaceCropper,
    faceTempUri,
    setShowFaceCropper,
    setFaceTempUri,
    setFaceImages,
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
  const accountAlreadyExists = Boolean(accountExistsEmail) || isAccountAlreadyRegisteredError(activeErrorMessage);

  // Limpiar mensajes y resetear pasos al cambiar de vista
  const handleSwitchView = useCallback((newView: AuthViewState) => {
    clearMessages();
    setAccountExistsEmail(null);
    if (newView === 'register') {
      setRegisterStep(1);
    }
    setViewState(newView);
  }, [clearMessages]);

  const handleAccountExists = useCallback((email: string) => {
    const cleanEmail = email.trim();
    Keyboard.dismiss();
    setDemoLoginEmail(cleanEmail);
    setAccountExistsEmail(cleanEmail);
    setErrorMessage(t('auth.accountExists'));
  }, [setErrorMessage]);

  const handleEditRegistrationEmail = useCallback(() => {
    setAccountExistsEmail(null);
    setErrorMessage(null);
    setRegisterStep(1);
  }, [setErrorMessage]);

  const handleExistingAccountLogin = useCallback(() => {
    const email = accountExistsEmail || demoLoginEmail;
    if (email) setDemoLoginEmail(email);
    handleSwitchView('login');
  }, [accountExistsEmail, demoLoginEmail, handleSwitchView]);

  // Carga de credenciales demo
  const handleFillDemo = useCallback(() => {
    setDemoLoginEmail(demoCredentials.email);
    setDemoLoginPass(demoCredentials.password);
  }, [demoCredentials]);

  // Manejo de registro final
  const onFinishRegister = async (data: RegisterFormData, skipPhotos: boolean) => {
    setWizardGender(data.gender);
    // Si el backend detecta una cuenta existente, el formulario de login ya
    // queda preparado con el correo que la persona estaba intentando usar.
    setDemoLoginEmail(data.email.trim());
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
            <View
              style={[
                styles.sheetTopBar,
                { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 28) },
              ]}
            >
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
                {activeErrorMessage && !accountAlreadyExists ? (
                  <View style={styles.alertErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.alertErrorText}>{activeErrorMessage}</Text>
                    </View>
                  </View>
                ) : null}
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
                  <>
                    {registerStage !== 'idle' ? (
                      <RegisterProgress stage={registerStage} hasFace={Boolean(faceImageUri)} hasBody={Boolean(bodyImageUri)} />
                    ) : null}
                    {/* El asistente se oculta (no se desmonta) para no perder lo escrito si el registro falla */}
                    <View style={registerStage !== 'idle' ? { display: 'none' } : undefined}>
                      <RegisterWizard
                        currentStep={registerStep}
                        onStepChange={setRegisterStep}
                        loading={loading}
                        faceImageUri={faceImageUri}
                        bodyImageUri={bodyImageUri}
                        onPickImage={handlePickImage}
                        onUseSampleBiometrics={handleUseSampleBiometrics}
                        onFinishRegister={onFinishRegister}
                        onCheckEmail={checkEmailExists}
                        onAccountExists={handleAccountExists}
                        onSwitchToLogin={() => handleSwitchView('login')}
                        onError={setErrorMessage}
                      />
                    </View>
                  </>
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

      {/* Recorte cuadrado del rostro (mismo diseño que el de cuerpo) */}
      <ImageCropperModal
        mode="face"
        visible={showFaceCropper}
        imageUri={faceTempUri}
        onConfirm={(croppedUri, b64) => {
          setShowFaceCropper(false);
          setFaceTempUri(null);
          setFaceImages(croppedUri, b64 ?? null);
        }}
        onCancel={() => {
          setShowFaceCropper(false);
          setFaceTempUri(null);
        }}
      />

      <Modal
        visible={accountAlreadyExists}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={handleEditRegistrationEmail}
      >
        <View
          style={styles.accountExistsModalBackdrop}
          accessibilityViewIsModal
          importantForAccessibility="yes"
        >
          <View
            style={styles.accountExistsModalCard}
            accessibilityRole="alert"
            accessibilityLabel={t('auth.accountExistsTitle')}
            accessibilityLiveRegion="assertive"
          >
            <View style={styles.accountExistsModalIcon}>
              <Ionicons name="person-outline" size={30} color={Colors.buttons.authBackground} />
            </View>

            <Text style={styles.accountExistsModalTitle}>{t('auth.accountExistsTitle')}</Text>
            <Text style={styles.accountExistsModalText}>
              {t('auth.accountExistsBody')}
            </Text>
            <View style={styles.accountExistsEmailChip}>
              <Ionicons name="mail-outline" size={17} color={Colors.buttons.authBackground} />
              <Text style={styles.accountExistsModalEmail} numberOfLines={1}>
                {accountExistsEmail || demoLoginEmail}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.accountExistsPrimaryAction}
              onPress={handleExistingAccountLogin}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={t('auth.signIn')}
            >
              <Text style={styles.accountExistsPrimaryActionText}>{t('auth.signIn')}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.buttons.authText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accountExistsSecondaryAction}
              onPress={handleEditRegistrationEmail}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('auth.useAnotherEmail')}
            >
              <Text style={styles.accountExistsSecondaryActionText}>{t('auth.useAnotherEmail')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
