import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../../../contexts/LanguageContext';
import { styles, BUTTON_GRADIENT } from '../../AuthScreen.styles';
import { GenderType } from '../../types/auth.types';

interface StepPersonalInfoProps {
  initialFullName: string;
  initialAge: string;
  initialGender: GenderType;
  onNext: (fullName: string, age: string, gender: GenderType) => void;
  onBack: () => void;
  onError: (msg: string | null) => void;
}

export const StepPersonalInfo: React.FC<StepPersonalInfoProps> = ({
  initialFullName,
  initialAge,
  initialGender,
  onNext,
  onBack,
  onError,
}) => {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState<string>(initialFullName);
  const [age, setAge] = useState<string>(initialAge);
  const [gender, setGender] = useState<GenderType>(initialGender);

  const handleNext = () => {
    onError(null);
    const cleanName = fullName.trim();
    if (!cleanName) {
      onError('Por favor ingresa tu nombre completo.');
      return;
    }
    const parsedAge = parseInt(age.trim(), 10);
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 99) {
      onError('Por favor ingresa una edad válida (entre 10 y 99 años).');
      return;
    }
    if (!gender) {
      onError('Por favor selecciona tu género para configurar tu silueta base.');
      return;
    }
    onNext(cleanName, age.trim(), gender);
  };

  return (
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
            onChangeText={(txt) => {
              onError(null);
              setFullName(txt);
            }}
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
            onChangeText={(txt) => {
              onError(null);
              setAge(txt);
            }}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>
      </View>

      {/* Selector de Género / Silueta Base */}
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
          onPress={onBack}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={16} color="#334155" />
          <Text style={styles.btnSecondaryStepText}>{t('auth.back')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnPrimaryStep, { flex: 1 }]}
          onPress={handleNext}
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
  );
};
