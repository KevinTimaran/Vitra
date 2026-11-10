import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../../../contexts/LanguageContext';
import { styles, BUTTON_GRADIENT } from '../../AuthScreen.styles';
import { Colors } from '../../../../theme';

interface StepCredentialsProps {
  initialEmail: string;
  initialPassword?: string;
  onNext: (email: string, password: string) => void;
  onSwitchToLogin: () => void;
  onError: (msg: string | null) => void;
}

export const StepCredentials: React.FC<StepCredentialsProps> = ({
  initialEmail,
  initialPassword = '',
  onNext,
  onSwitchToLogin,
  onError,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>(initialPassword);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleNext = () => {
    onError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      onError(t('auth.email') + ' es requerido.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      onError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 6) {
      onError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    onNext(cleanEmail, password);
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
              setEmail(txt);
            }}
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
        onPress={handleNext}
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
          <Ionicons name="arrow-forward" size={16} color={Colors.buttons.authText} style={{ marginLeft: 6 }} />
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
