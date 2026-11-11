import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../contexts/LanguageContext';
import { styles } from '../AuthScreen.styles';
import { Colors } from '../../../theme';

interface WelcomeViewProps {
  onCreateAccount: () => void;
  onSignIn: () => void;
  onDemoFill: () => void;
  /** Bloquea las acciones mientras se ejecuta una operación. */
  isSubmitting?: boolean;
}

export const WelcomeView: React.FC<WelcomeViewProps> = React.memo(({
  onCreateAccount,
  onSignIn,
  onDemoFill,
  isSubmitting = false,
}) => {
  const { t } = useTranslation();

  const handleCreateAccount = useCallback(() => {
    if (isSubmitting) return;
    onCreateAccount();
  }, [isSubmitting, onCreateAccount]);

  const handleSignIn = useCallback(() => {
    if (isSubmitting) return;
    onSignIn();
  }, [isSubmitting, onSignIn]);

  const handleDemoFill = useCallback(() => {
    if (isSubmitting) return;
    onDemoFill();
  }, [isSubmitting, onDemoFill]);

  return (
    <ScrollView
      contentContainerStyle={styles.welcomeScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Ilustración central — decorativa, oculta a lectores de pantalla */}
      <View
        style={styles.heroIllustrationContainer}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.outerGlowCircle}>
          <View style={styles.innerGlowCircle}>
            <Ionicons name="shirt-outline" size={72} color={Colors.primary} />
            <View style={styles.floatingGemBadge}>
              <Ionicons name="cube-outline" size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>

      {/* Textos centrales */}
      <View style={styles.welcomeTextContainer}>
        <Text
          style={styles.welcomeTitle}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.4}
        >
          {t('auth.welcomeTitle')}
        </Text>
        <Text
          style={styles.welcomeSubtitle}
          maxFontSizeMultiplier={1.6}
        >
          {t('auth.welcomeSubtitle')}
        </Text>
      </View>

      {/* Acciones */}
      <View
        style={styles.welcomeActionsContainer}
        accessibilityRole="none"
      >
        {/* Crear cuenta */}
        <TouchableOpacity
          style={[
            styles.btnCreateAccount,
            isSubmitting && { opacity: 0.6 },
          ]}
          onPress={handleCreateAccount}
          activeOpacity={0.88}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={t('auth.createAccount')}
          accessibilityHint={t('auth.a11y.createAccountHint')}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          testID="welcome-create-account"
        >
          <Text
            style={styles.btnCreateAccountText}
            maxFontSizeMultiplier={1.4}
          >
            {t('auth.createAccount')}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={Colors.buttons.authText}
            style={{ marginLeft: 6 }}
            importantForAccessibility="no"
          />
        </TouchableOpacity>

        {/* Iniciar sesión */}
        <TouchableOpacity
          style={[
            styles.btnSignInOutline,
            isSubmitting && { opacity: 0.6 },
          ]}
          onPress={handleSignIn}
          activeOpacity={0.8}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signIn')}
          accessibilityHint={t('auth.a11y.signInHint')}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          testID="welcome-sign-in"
        >
          <Text
            style={styles.btnSignInOutlineText}
            maxFontSizeMultiplier={1.4}
          >
            {t('auth.signIn')}
          </Text>
        </TouchableOpacity>

        {/* Rellenar credenciales demo */}
        <TouchableOpacity
          style={styles.demoLinkButton}
          onPress={handleDemoFill}
          activeOpacity={0.7}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={t('auth.demoFill')}
          accessibilityHint={t('auth.a11y.demoFillHint')}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          testID="welcome-demo-fill"
        >
          <Text
            style={styles.demoLinkText}
            maxFontSizeMultiplier={1.4}
          >
            {t('auth.demoFill')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
});

WelcomeView.displayName = 'WelcomeView';
