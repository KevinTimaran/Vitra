import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../../contexts/LanguageContext';
import { styles, BUTTON_GRADIENT } from '../AuthScreen.styles';
import { Colors } from '../../../theme';

interface LoginFormProps {
  initialEmail?: string;
  initialPassword?: string;
  loading: boolean;
  errorMessage?: string | null;
  onSubmit: (email: string, password: string) => Promise<boolean | void> | void;
  onForgotPassword: (email: string) => void;
  onSwitchToRegister: () => void;
  onFillDemoCredentials: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  initialEmail = '',
  initialPassword = '',
  loading,
  errorMessage,
  onSubmit,
  onForgotPassword,
  onSwitchToRegister,
  onFillDemoCredentials,
}) => {
  const { t } = useTranslation();

  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>(initialPassword);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sincronizar si cambian las credenciales iniciales (p.ej. demo)
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (initialPassword) setPassword(initialPassword);
  }, [initialPassword]);

  const handleSubmit = () => {
    setLocalError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalError(t('auth.err.emailRequired'));
      return;
    }
    if (!password) {
      setLocalError(t('auth.err.passwordRequired'));
      return;
    }
    onSubmit(cleanEmail, password);
  };

  const handleForgot = () => {
    onForgotPassword(email.trim());
  };

  const activeError = localError || errorMessage;

  return (
    <View style={styles.formContainer}>
      {activeError && (
        <View style={styles.alertErrorBox}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.alertErrorText}>{activeError}</Text>
          </View>
        </View>
      )}

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
            onChangeText={(txt) => {
              setLocalError(null);
              setEmail(txt);
            }}
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
            onChangeText={(txt) => {
              setLocalError(null);
              setPassword(txt);
            }}
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
              color={Colors.buttons.neutralMutedText}
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
            {rememberMe && <Ionicons name="checkmark" size={12} color={Colors.buttons.authText} />}
          </View>
          <Text style={styles.checkboxLabel}>{t('auth.rememberMe')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleForgot}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>
      </View>

      {/* Submit Login */}
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
            <ActivityIndicator color={Colors.buttons.authText} size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>{t('auth.signIn')}</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.buttons.authText} style={{ marginLeft: 6 }} />
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
            onFillDemoCredentials();
            Alert.alert(t('auth.quick.title'), t('auth.quick.demoLoaded'));
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="logo-google" size={20} color={Colors.buttons.google} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.socialCircleBtn}
          onPress={() => Alert.alert('Apple ID', t('auth.social.unavailable'))}
          activeOpacity={0.75}
        >
          <Ionicons name="logo-apple" size={21} color={Colors.buttons.apple} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.socialCircleBtn}
          onPress={() => Alert.alert('Facebook', t('auth.social.unavailable'))}
          activeOpacity={0.75}
        >
          <Ionicons name="logo-facebook" size={21} color={Colors.buttons.facebook} />
        </TouchableOpacity>
      </View>

      {/* Switch to Register */}
      <View style={styles.footerRow}>
        <View style={styles.switchPromptRow}>
          <Text style={styles.switchPromptText}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={onSwitchToRegister} activeOpacity={0.7}>
            <Text style={styles.switchActionHighlight}>{t('auth.registerLink')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
