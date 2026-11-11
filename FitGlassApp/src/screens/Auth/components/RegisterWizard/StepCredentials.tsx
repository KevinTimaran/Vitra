import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../../../contexts/LanguageContext';
import { styles, BUTTON_GRADIENT } from '../../AuthScreen.styles';
import { Colors } from '../../../../theme';

interface StepCredentialsProps {
  initialEmail: string;
  initialPassword?: string;
  onNext: (email: string, password: string) => void;
  onCheckEmail: (email: string) => Promise<boolean>;
  onAccountExists: (email: string) => void;
  onSwitchToLogin: () => void;
  onError: (msg: string | null) => void;
}

export const StepCredentials: React.FC<StepCredentialsProps> = ({
  initialEmail,
  initialPassword = '',
  onNext,
  onCheckEmail,
  onAccountExists,
  onSwitchToLogin,
  onError,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>(initialPassword);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available'>('idle');
  const checkSequence = useRef(0);
  const lastCheck = useRef<{ email: string; exists: boolean } | null>(null);

  const isValidEmail = (value: string) => {
    const normalized = value.trim();
    return normalized.includes('@') && normalized.split('@')[1]?.includes('.');
  };

  const verifyEmail = async (rawEmail: string, showConnectionError: boolean) => {
    const cleanEmail = rawEmail.trim().toLowerCase();
    const requestId = ++checkSequence.current;
    setEmailStatus('checking');

    try {
      const exists = await onCheckEmail(cleanEmail);
      if (requestId !== checkSequence.current) return null;

      lastCheck.current = { email: cleanEmail, exists };
      setEmailStatus(exists ? 'idle' : 'available');
      if (exists) onAccountExists(cleanEmail);
      return exists;
    } catch (error: any) {
      if (requestId !== checkSequence.current) return null;
      setEmailStatus('idle');
      if (showConnectionError) {
        onError(error?.message || t('auth.emailCheckError'));
      }
      return null;
    }
  };

  // Validación temprana: después de que el usuario termina de escribir un
  // correo válido, se comprueba sin esperar a los pasos 2 y 3.
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    checkSequence.current += 1;
    lastCheck.current = null;

    if (!isValidEmail(cleanEmail)) {
      setEmailStatus('idle');
      return;
    }

    const timer = setTimeout(() => {
      void verifyEmail(cleanEmail, false);
    }, 650);

    return () => clearTimeout(timer);
    // Las callbacks vienen del flujo de autenticación y se mantienen estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleNext = async () => {
    onError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      onError(t('auth.err.emailRequired'));
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      onError(t('auth.err.emailInvalid'));
      return;
    }
    if (!password || password.length < 6) {
      onError(t('auth.err.passwordShort'));
      return;
    }

    const normalizedEmail = cleanEmail.toLowerCase();
    const cachedCheck = lastCheck.current;
    if (cachedCheck?.email === normalizedEmail) {
      if (cachedCheck.exists) onAccountExists(normalizedEmail);
      else onNext(cleanEmail, password);
      return;
    }

    const exists = await verifyEmail(normalizedEmail, true);
    if (exists === false) onNext(cleanEmail, password);
  };

  return (
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
            onChangeText={(txt) => {
              onError(null);
              setEmailStatus('idle');
              setEmail(txt);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          {emailStatus === 'checking' && (
            <ActivityIndicator size="small" color={Colors.buttons.authBackground} />
          )}
          {emailStatus === 'available' && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.buttons.successBackground}
              accessibilityLabel={t('auth.emailAvailable')}
            />
          )}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('auth.password')}</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={(txt) => {
              onError(null);
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

      {/* Botón Siguiente a Datos Personales */}
      <TouchableOpacity
        onPress={() => void handleNext()}
        disabled={emailStatus === 'checking'}
        activeOpacity={0.88}
        style={[
          styles.submitButtonTouchable,
          emailStatus === 'checking' && styles.submitButtonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: emailStatus === 'checking', busy: emailStatus === 'checking' }}
      >
        <LinearGradient
          colors={BUTTON_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitGradientPill}
        >
          {emailStatus === 'checking' ? (
            <>
              <ActivityIndicator size="small" color={Colors.buttons.authText} />
              <Text style={styles.submitButtonText}>{t('auth.checkingEmail')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.submitButtonText}>{t('auth.next')}</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.buttons.authText} style={{ marginLeft: 6 }} />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <View style={styles.switchPromptRow}>
          <Text style={styles.switchPromptText}>{t('auth.haveAccount')} </Text>
          <TouchableOpacity onPress={onSwitchToLogin} activeOpacity={0.7}>
            <Text style={styles.switchActionHighlight}>{t('auth.loginLink')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
