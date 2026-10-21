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
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { loginUser, registerUser } from '../services/auth/authClient';
import { Colors as LightColors, Typography, Spacing, Radius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Paleta de gradiente suave (púrpura, rosa, durazno)
const BACKGROUND_GRADIENT = ['#E0C3FC', '#F8B4D9', '#FFC3A0'] as const;
const BUTTON_GRADIENT = ['#8B5CF6', '#EC4899', '#FB923C'] as const;

export const AuthScreen: React.FC = () => {
  // Preparación para temas y traducciones futuras (activo en modo claro por ahora)
  const { colors: currentThemeColors } = useTheme();
  const { t } = useTranslation();
  const { login } = useAuth();

  // Vista activa: 'welcome' | 'login' | 'register'
  const [viewState, setViewState] = useState<'welcome' | 'login' | 'register'>('welcome');

  // Campos de formulario
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Estados de proceso y feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Limpiar mensajes al cambiar de vista
  const handleSwitchView = (newView: 'welcome' | 'login' | 'register') => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setViewState(newView);
  };

  // Manejo de envío de formulario (Login o Registro)
  const handleSubmit = async () => {
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
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (viewState === 'register' && !fullName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }

    setLoading(true);

    try {
      if (viewState === 'login') {
        // Iniciar Sesión
        const result = await loginUser(cleanEmail, password);
        await login(result.access_token, cleanEmail);
      } else if (viewState === 'register') {
        // Registrar usuario
        await registerUser(cleanEmail, password, fullName.trim());
        setSuccessMessage('¡Cuenta creada exitosamente! Iniciando sesión...');

        // Autologin posterior al registro
        const loginResult = await loginUser(cleanEmail, password);
        await login(loginResult.access_token, cleanEmail);
      }
    } catch (err: any) {
      console.error('[AuthScreen] Error:', err);
      setErrorMessage(err?.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  // Relleno rápido para pruebas en desarrollo
  const fillDemoCredentials = () => {
    setEmail('demo@vitra.ai');
    setPassword('password123');
    setFullName('Usuario Vitra');
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
                <Ionicons name="sparkles" size={14} color="#6B21A8" />
                <Text style={styles.brandBadgeText}>HAUTE COUTURE DIGITAL</Text>
              </View>
            </View>

            {/* Ilustración / Ícono Central de Moda & Gemelo Digital 3D */}
            <View style={styles.heroIllustrationContainer}>
              <View style={styles.outerGlowCircle}>
                <View style={styles.innerGlowCircle}>
                  <Ionicons name="shirt-outline" size={72} color="#4C1D95" />
                  <View style={styles.floatingGemBadge}>
                    <Ionicons name="cube-outline" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>

            {/* Textos Centrales */}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>Bienvenido a Vitra</Text>
              <Text style={styles.welcomeSubtitle}>
                Tu armario digital y probador 3D inteligente. Inicia sesión o crea una cuenta para comenzar.
              </Text>
            </View>

            {/* Botones de Acción Inferiores */}
            <View style={styles.welcomeActionsContainer}>
              {/* Botón Crear Cuenta (Fondo blanco, texto oscuro) */}
              <TouchableOpacity
                style={styles.btnCreateAccount}
                onPress={() => handleSwitchView('register')}
                activeOpacity={0.88}
              >
                <Text style={styles.btnCreateAccountText}>Crear Cuenta</Text>
                <Ionicons name="arrow-forward" size={18} color="#1E1B4B" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              {/* Botón Iniciar Sesión (Transparente con borde blanco delgado) */}
              <TouchableOpacity
                style={styles.btnSignInOutline}
                onPress={() => handleSwitchView('login')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSignInOutlineText}>Iniciar Sesión</Text>
              </TouchableOpacity>

              {/* Botón sutil de credenciales demo para pruebas */}
              <TouchableOpacity
                style={styles.demoLinkButton}
                onPress={() => {
                  fillDemoCredentials();
                  handleSwitchView('login');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.demoLinkText}>Usar credenciales demo</Text>
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
                onPress={() => handleSwitchView('welcome')}
                activeOpacity={0.7}
                accessibilityLabel="Volver"
              >
                <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
              </TouchableOpacity>

              <Text style={styles.topBrandName}>VITRA</Text>

              <View style={{ width: 40 }} />
            </View>

            {/* Contenedor Blanco estilo Bottom Sheet (65% del alto) */}
            <View style={styles.whiteBottomSheetCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetScrollContent}
              >
                {/* Tirador indicador superior del modal */}
                <View style={styles.sheetHandleIndicator} />

                {/* Encabezado según la vista */}
                {viewState === 'login' ? (
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Bienvenido de nuevo</Text>
                    <Text style={styles.sheetSubtitle}>
                      ¿Listo para ver tu armario? Tu estilo está aquí.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Crea tu Cuenta</Text>
                    <Text style={styles.sheetSubtitle}>
                      Estamos aquí para crear tu gemelo digital. ¿Listo?
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

                {/* Formulario */}
                <View style={styles.formContainer}>
                  {/* Campo Nombre Completo (Solo en Registro) */}
                  {viewState === 'register' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nombre completo</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ej. Sofia Rossi"
                          placeholderTextColor="#94A3B8"
                          value={fullName}
                          onChangeText={setFullName}
                          autoCapitalize="words"
                          maxLength={50}
                        />
                      </View>
                    </View>
                  )}

                  {/* Campo Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Correo electrónico</Text>
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

                  {/* Campo Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contraseña</Text>
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
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Fila Recordarme / Olvidé mi contraseña (Solo en Login) */}
                  {viewState === 'login' && (
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
                        <Text style={styles.checkboxLabel}>Recordarme</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Recuperar Contraseña', 'Ingresa tu correo para enviarte instrucciones de restablecimiento.');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.forgotPasswordText}>Olvidé mi contraseña</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Botón Submit con LinearGradient en forma de píldora */}
                  <TouchableOpacity
                    onPress={handleSubmit}
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
                          <Text style={styles.submitButtonText}>
                            {viewState === 'login' ? 'Iniciar Sesión' : 'Comenzar'}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color="#FFFFFF"
                            style={{ marginLeft: 6 }}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Separador "O inicia sesión con" */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>O inicia sesión con</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Social Login: 3 Íconos Circulares */}
                  <View style={styles.socialIconsRow}>
                    {/* Google */}
                    <TouchableOpacity
                      style={styles.socialCircleBtn}
                      onPress={() => {
                        fillDemoCredentials();
                        Alert.alert('Acceso Rápido', 'Credenciales demo cargadas para probar el acceso.');
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                    </TouchableOpacity>

                    {/* Apple */}
                    <TouchableOpacity
                      style={styles.socialCircleBtn}
                      onPress={() => {
                        Alert.alert('Apple ID', 'Integración con Apple ID disponible en builds nativos.');
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="logo-apple" size={21} color="#000000" />
                    </TouchableOpacity>

                    {/* Facebook */}
                    <TouchableOpacity
                      style={styles.socialCircleBtn}
                      onPress={() => {
                        Alert.alert('Facebook', 'Inicio de sesión con Facebook disponible en builds nativos.');
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="logo-facebook" size={21} color="#1877F2" />
                    </TouchableOpacity>
                  </View>

                  {/* Footer con enlace para alternar entre Login y Register */}
                  <View style={styles.footerRow}>
                    {viewState === 'login' ? (
                      <View style={styles.switchPromptRow}>
                        <Text style={styles.switchPromptText}>¿No tienes cuenta? </Text>
                        <TouchableOpacity
                          onPress={() => handleSwitchView('register')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.switchActionHighlight}>Regístrate</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.switchPromptRow}>
                        <Text style={styles.switchPromptText}>¿Ya tienes cuenta? </Text>
                        <TouchableOpacity
                          onPress={() => handleSwitchView('login')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.switchActionHighlight}>Inicia sesión</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

// ==========================================
// Estilos UI (Gradient Card & Bottom Sheet)
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
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#581C87',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
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
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
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
    fontSize: 32,
    fontWeight: '800',
    color: '#1E1B4B',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: 'rgba(30, 27, 75, 0.82)',
    textAlign: 'center',
    maxWidth: 320,
  },
  welcomeActionsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  btnCreateAccount: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  btnCreateAccountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  btnSignInOutline: {
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSignInOutlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  demoLinkButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  demoLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(30, 27, 75, 0.7)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBrandName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#1E1B4B',
  },
  whiteBottomSheetCard: {
    height: SCREEN_HEIGHT * 0.72,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000000',
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
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetHeader: {
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontWeight: '400',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
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
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  submitButtonTouchable: {
    marginTop: Spacing.sm,
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitGradientPill: {
    height: 50,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
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
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
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
    fontSize: 14,
    color: '#64748B',
  },
  switchActionHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
});
