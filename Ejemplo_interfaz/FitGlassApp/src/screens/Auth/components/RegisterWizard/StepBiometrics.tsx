import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../../../contexts/LanguageContext';
import { styles, BUTTON_GRADIENT } from '../../AuthScreen.styles';
import { Colors } from '../../../../theme';

interface StepBiometricsProps {
  faceImageUri: string | null;
  bodyImageUri: string | null;
  loading: boolean;
  onPickImage: (target: 'face' | 'body', source: 'camera' | 'gallery') => void;
  onUseSampleBiometrics: () => void;
  onSkipPhotos: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const StepBiometrics: React.FC<StepBiometricsProps> = ({
  faceImageUri,
  bodyImageUri,
  loading,
  onPickImage,
  onUseSampleBiometrics,
  onSkipPhotos,
  onSubmit,
  onBack,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.formContainer}>
      {/* Nota informativa de fotos opcionales */}
      <View
        style={{
          backgroundColor: '#F1F5F9',
          padding: 12,
          borderRadius: 12,
          marginBottom: 12,
          borderLeftWidth: 3,
          borderLeftColor: Colors.primary,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>
          {t('auth.bio.noteTitle')}
        </Text>
        <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>
          {t('auth.bio.noteBody')}
        </Text>
      </View>

      {/* 1. Fotografía Facial */}
      <View style={styles.biometricSection}>
        <View style={styles.biometricHeaderRow}>
          <Ionicons name="color-palette-outline" size={18} color={Colors.primary} />
          <Text style={styles.biometricSectionTitle}>{t('auth.facialPhoto')} {t('auth.bio.optional')}</Text>
        </View>
        <Text style={styles.biometricSectionDesc}>{t('auth.facialDesc')}</Text>

        <View style={styles.biometricPreviewRow}>
          {faceImageUri ? (
            <View style={styles.circularFacePreview}>
              <Image source={{ uri: faceImageUri }} style={styles.circularFaceImage} />
              <View style={styles.badgeCheckOverlay}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
            </View>
          ) : (
            <View style={styles.circularFacePlaceholder}>
              <Ionicons name="person" size={28} color="#94A3B8" />
            </View>
          )}

          <View style={styles.biometricButtonsColumn}>
            <TouchableOpacity
              style={styles.mediaActionButton}
              onPress={() => onPickImage('face', 'camera')}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-outline" size={16} color={Colors.buttons.neutralText} />
              <Text style={styles.mediaActionText}>{t('auth.openCamera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mediaActionButton}
              onPress={() => onPickImage('face', 'gallery')}
              activeOpacity={0.75}
            >
              <Ionicons name="images-outline" size={16} color={Colors.buttons.neutralText} />
              <Text style={styles.mediaActionText}>{t('auth.openGallery')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. Fotografía Corporal */}
      <View style={styles.biometricSection}>
        <View style={styles.biometricHeaderRow}>
          <Ionicons name="body-outline" size={18} color={Colors.primary} />
          <Text style={styles.biometricSectionTitle}>{t('auth.bodyPhoto')}</Text>
        </View>
        <Text style={styles.biometricSectionDesc}>{t('auth.bodyDesc')}</Text>

        <View style={styles.biometricPreviewRow}>
          {bodyImageUri ? (
            <View style={styles.rectangularBodyPreview}>
              <Image source={{ uri: bodyImageUri }} style={styles.rectangularBodyImage} />
              <View style={styles.badgeCheckOverlay}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
            </View>
          ) : (
            <View style={styles.rectangularBodyPlaceholder}>
              <Ionicons name="body-outline" size={28} color="#94A3B8" />
            </View>
          )}

          <View style={styles.biometricButtonsColumn}>
            <TouchableOpacity
              style={styles.mediaActionButton}
              onPress={() => onPickImage('body', 'camera')}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-outline" size={16} color={Colors.buttons.neutralText} />
              <Text style={styles.mediaActionText}>{t('auth.openCamera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mediaActionButton}
              onPress={() => onPickImage('body', 'gallery')}
              activeOpacity={0.75}
            >
              <Ionicons name="images-outline" size={16} color={Colors.buttons.neutralText} />
              <Text style={styles.mediaActionText}>{t('auth.openGallery')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Aviso: se puede jugar o seguir usando la app mientras se crea el avatar 3D */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          backgroundColor: Colors.surfaceSubtle,
          padding: 12,
          borderRadius: 12,
          borderLeftWidth: 3,
          borderLeftColor: Colors.primary,
        }}
      >
        <Ionicons name="game-controller" size={20} color={Colors.primary} style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primaryText, marginBottom: 2 }}>
            {t('auth.bio.gameTitle')}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.secondaryText, lineHeight: 16 }}>
            {t('auth.bio.gameText')}
          </Text>
        </View>
      </View>

      {/* Botón rápido de fotos muestra */}
      <TouchableOpacity
        onPress={onUseSampleBiometrics}
        style={styles.sampleBiometricsBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles" size={14} color={Colors.buttons.linkText} />
        <Text style={styles.sampleBiometricsText}>{t('auth.bio.sample')}</Text>
      </TouchableOpacity>

      {/* Botón explícito para Omitir Fotos y usar Avatar 3D por Defecto */}
      <TouchableOpacity
        style={styles.skipBiometricsBtn}
        onPress={onSkipPhotos}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Ionicons name="play-skip-forward-outline" size={15} color={Colors.buttons.neutralMutedText} style={{ marginRight: 6 }} />
        <Text style={styles.skipBiometricsBtnText}>
          {t('auth.bio.skip')}
        </Text>
      </TouchableOpacity>

      {/* Botones de Finalización */}
      <View style={styles.wizardButtonsRow}>
        <TouchableOpacity
          style={styles.btnSecondaryStep}
          onPress={onBack}
          activeOpacity={0.75}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={16} color={Colors.buttons.neutralText} />
          <Text style={styles.btnSecondaryStepText}>{t('auth.back')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnPrimaryStep, { flex: 1 }]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.88}
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
                <Text style={styles.submitButtonText}>{t('auth.finishRegister')}</Text>
                <Ionicons name="checkmark-done" size={18} color={Colors.buttons.authText} style={{ marginLeft: 6 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};
