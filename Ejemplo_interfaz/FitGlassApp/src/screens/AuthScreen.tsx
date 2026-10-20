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
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, G, Rect } from 'react-native-svg';

import { useAuth } from '../contexts/AuthContext';
import { loginUser, registerUser } from '../services/auth/authClient';
import { Colors as LightColors, Typography, Spacing, Radius } from '../theme';

// ==========================================
// Componentes SVG Nativos (react-native-svg)
// ==========================================

const VitraBrandLogoSvg: React.FC<{ size?: number; color?: string }> = ({ size = 48, color = '#111113' }) => (
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

const MailIconSvg: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#71717A' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 6L12 13L2 6"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LockIconSvg: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#71717A' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 15V18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const UserIconSvg: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#71717A' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EyeIconSvg: React.FC<{ size?: number; color?: string; visible?: boolean }> = ({
  size = 20,
  color = '#71717A',
  visible = false,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path
          d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <Path
          d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 1 12 1 12A18.45 18.45 0 015.06 7.06L17.94 17.94Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9.9 4.24A9.12 9.12 0 0112 4C19 4 23 12 23 12A18.5 18.5 0 0119.42 16.58L9.9 4.24Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M1 1L23 23"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </Svg>
);

const GoogleIconSvg: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.16z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.27a7.22 7.22 0 010-4.54V6.58H1.25a11.98 11.98 0 000 10.84l4.03-3.15z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
    />
  </Svg>
);

const AppleIconSvg: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#111113' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1.01.08 2.01-.49 2.63-1.24z" />
  </Svg>
);

// ==========================================
// Pantalla de Autenticación (AuthScreen)
// ==========================================

export const AuthScreen: React.FC = () => {
  // El login debe estar estrictamente en modo claro (Light Mode)
  const colors = LightColors;
  const isDark = false;
  const { login } = useAuth();

  // Estado de alternancia entre Login y Registro
  const [isLogin, setIsLogin] = useState<boolean>(true);

  // Campos de formulario
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Estados de proceso y feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setErrorMessage('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Flujo: Iniciar Sesión
        const result = await loginUser(cleanEmail, password);
        await login(result.access_token, cleanEmail);
      } else {
        // Flujo: Registro de Cuenta
        await registerUser(cleanEmail, password, fullName.trim() || undefined);
        setSuccessMessage('¡Cuenta creada exitosamente! Iniciando sesión...');

        // Autologin posterior al registro
        const loginResult = await loginUser(cleanEmail, password);
        await login(loginResult.access_token, cleanEmail);
      }
    } catch (err: any) {
      console.error('[AuthScreen] Error:', err);
      setErrorMessage(err?.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@vitra.ai');
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera / Marca Vitra */}
        <View style={styles.headerContainer}>
          <VitraBrandLogoSvg size={54} color={colors.primaryText} />
          <Text style={[styles.brandTitle, { color: colors.primaryText }]}>VITRA</Text>
          <Text style={[styles.brandSubtitle, { color: colors.secondaryText }]}>
            ATELIER GENERATIVO & PROBADOR 3D
          </Text>
        </View>

        {/* Tarjeta del Formulario (equivalente a <form> y <div class="card">) */}
        <View
          style={[
            styles.authCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Título y Subtítulo Dinámicos */}
          <Text style={[styles.formTitle, { color: colors.primaryText }]}>
            {isLogin ? 'Sign In to Vitra' : 'Create an Account'}
          </Text>
          <Text style={[styles.formDescription, { color: colors.secondaryText }]}>
            {isLogin
              ? 'Enter your credentials to access your 3D wardrobe & virtual fitting atelier.'
              : 'Join Vitra to generate your biometric 3D twin and digital wardrobe.'}
          </Text>

          {/* Mensajes de Alerta */}
          {errorMessage && (
            <View style={[styles.alertBox, styles.errorBox]}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={[styles.alertBox, styles.successBox]}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Campo: Nombre Completo (Solo en Registro) */}
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.primaryText }]}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                ]}
              >
                <View style={styles.inputIcon}>
                  <UserIconSvg size={18} color={colors.secondaryText} />
                </View>
                <TextInput
                  style={[styles.textInput, { color: colors.primaryText }]}
                  placeholder="e.g. Christian Dior"
                  placeholderTextColor={colors.tertiaryText}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Campo: Correo Electrónico */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.primaryText }]}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.inputIcon}>
                <MailIconSvg size={18} color={colors.secondaryText} />
              </View>
              <TextInput
                style={[styles.textInput, { color: colors.primaryText }]}
                placeholder="name@vitra.ai"
                placeholderTextColor={colors.tertiaryText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Campo: Contraseña */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.primaryText }]}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.inputIcon}>
                <LockIconSvg size={18} color={colors.secondaryText} />
              </View>
              <TextInput
                style={[styles.textInput, { color: colors.primaryText }]}
                placeholder="••••••••"
                placeholderTextColor={colors.tertiaryText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <EyeIconSvg size={18} color={colors.secondaryText} visible={showPassword} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón Principal (Submit) - Destaca visualmente con fondo sólido y texto claro */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primaryText },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? '#111113' : '#FFFFFF'} size="small" />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.bg }]}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Botón de Relleno Rápido de Demo (Pruebas Inmediatas) */}
          {isLogin && (
            <TouchableOpacity
              style={[styles.demoButton, { borderColor: colors.borderLight }]}
              onPress={fillDemoCredentials}
            >
              <Text style={[styles.demoButtonText, { color: colors.secondaryText }]}>
                ⚡ Auto-rellenar cuenta demo (`demo@vitra.ai`)
              </Text>
            </TouchableOpacity>
          )}

          {/* Divisor Visual */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
            <Text style={[styles.dividerText, { color: colors.tertiaryText }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
          </View>

          {/* Botones Sociales (Google & Apple) con SVGs nativos */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
              onPress={() => {
                setEmail('google.user@vitra.ai');
                setPassword('password123');
              }}
            >
              <GoogleIconSvg size={20} />
              <Text style={[styles.socialButtonText, { color: colors.primaryText }]}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButton,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
              onPress={() => {
                setEmail('apple.user@vitra.ai');
                setPassword('password123');
              }}
            >
              <AppleIconSvg size={20} color={colors.primaryText} />
              <Text style={[styles.socialButtonText, { color: colors.primaryText }]}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón de Alternancia de Estado: Don't have an account? Sign Up / Already have an account? Sign In */}
        <View style={styles.footerToggleRow}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleTextRegular, { color: colors.secondaryText }]}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={[styles.toggleTextHighlight, { color: colors.primaryText }]}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: Spacing.sm,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  authCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  formDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
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
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successText: {
    color: '#059669',
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
  eyeButton: {
    padding: 6,
  },
  primaryButton: {
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  demoButton: {
    marginTop: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  demoButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    paddingHorizontal: Spacing.md,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  socialButton: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerToggleRow: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  toggleButton: {
    padding: Spacing.sm,
  },
  toggleTextRegular: {
    fontSize: 14,
    fontWeight: '400',
  },
  toggleTextHighlight: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
