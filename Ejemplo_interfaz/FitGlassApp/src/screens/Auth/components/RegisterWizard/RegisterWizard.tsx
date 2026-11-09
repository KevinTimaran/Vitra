import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../../contexts/LanguageContext';
import { styles } from '../../AuthScreen.styles';
import { RegisterFormData, RegisterStep, GenderType } from '../../types/auth.types';
import { StepCredentials } from './StepCredentials';
import { StepPersonalInfo } from './StepPersonalInfo';
import { StepBiometrics } from './StepBiometrics';

interface RegisterWizardProps {
  currentStep: RegisterStep;
  onStepChange: (step: RegisterStep) => void;
  loading: boolean;
  faceImageUri: string | null;
  bodyImageUri: string | null;
  onPickImage: (target: 'face' | 'body', source: 'camera' | 'gallery') => void;
  onUseSampleBiometrics: () => void;
  onFinishRegister: (data: RegisterFormData, skipPhotos: boolean) => Promise<void>;
  onSwitchToLogin: () => void;
  onError: (msg: string | null) => void;
}

export const RegisterWizard: React.FC<RegisterWizardProps> = ({
  currentStep,
  onStepChange,
  loading,
  faceImageUri,
  bodyImageUri,
  onPickImage,
  onUseSampleBiometrics,
  onFinishRegister,
  onSwitchToLogin,
  onError,
}) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    fullName: '',
    age: '24',
    gender: 'female',
  });

  const handleCredentialsNext = (email: string, pass: string) => {
    setFormData((prev) => ({ ...prev, email, password: pass }));
    onStepChange(2);
  };

  const handlePersonalInfoNext = (fullName: string, age: string, gender: GenderType) => {
    setFormData((prev) => ({ ...prev, fullName, age, gender }));
    onStepChange(3);
  };

  const handleFinish = (skipPhotos: boolean) => {
    onFinishRegister(formData, skipPhotos);
  };

  return (
    <View>
      {/* ---------------- REGISTER WIZARD STEP HEADER ---------------- */}
      <View style={styles.wizardHeaderContainer}>
        {/* Stepper Pills */}
        <View style={styles.wizardPillsRow}>
          {([1, 2, 3] as const).map((step) => {
            const isActive = step === currentStep;
            const isPassed = step < currentStep;
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
          {currentStep === 1
            ? t('auth.createAccountTitle')
            : currentStep === 2
            ? 'Datos Personales'
            : 'Identidad Biométrica'}
        </Text>
        <Text style={styles.sheetSubtitle}>
          {currentStep === 1
            ? t('auth.step1Subtitle')
            : currentStep === 2
            ? t('auth.step2Subtitle')
            : t('auth.step3Subtitle')}
        </Text>
      </View>

      {/* Render Current Step */}
      {currentStep === 1 && (
        <StepCredentials
          initialEmail={formData.email}
          initialPassword={formData.password}
          onNext={handleCredentialsNext}
          onSwitchToLogin={onSwitchToLogin}
          onError={onError}
        />
      )}

      {currentStep === 2 && (
        <StepPersonalInfo
          initialFullName={formData.fullName}
          initialAge={formData.age}
          initialGender={formData.gender}
          onNext={handlePersonalInfoNext}
          onBack={() => onStepChange(1)}
          onError={onError}
        />
      )}

      {currentStep === 3 && (
        <StepBiometrics
          faceImageUri={faceImageUri}
          bodyImageUri={bodyImageUri}
          loading={loading}
          onPickImage={onPickImage}
          onUseSampleBiometrics={onUseSampleBiometrics}
          onSkipPhotos={() => handleFinish(true)}
          onSubmit={() => handleFinish(false)}
          onBack={() => onStepChange(2)}
        />
      )}
    </View>
  );
};
