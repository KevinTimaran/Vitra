import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Typography, Spacing, Radius } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { useTheme } from '../contexts/ThemeContext';

interface AddGarmentScreenProps {
  onPhotoConfirmed: (base64Data: string, imageUri: string) => void;
  onClose?: () => void;
  navigation?: any;
}

export const AddGarmentScreen: React.FC<AddGarmentScreenProps> = ({
  onPhotoConfirmed,
  onClose,
  navigation,
}) => {
  const { colors, isDark } = useTheme();

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLaunchCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso de Cámara',
          'Se requiere acceso a la cámara para fotografiar tus prendas de ropa.'
        );
        return;
      }

      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setImageBase64(b64);
      }
    } catch (error: any) {
      console.error('[AddGarmentScreen] Error al abrir cámara:', error);
      Alert.alert('Error', 'No se pudo inicializar la cámara del dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso de Galería',
          'Se requiere acceso a tu fototeca para seleccionar prendas.'
        );
        return;
      }

      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setImageBase64(b64);
      }
    } catch (error: any) {
      console.error('[AddGarmentScreen] Error al abrir galería:', error);
      Alert.alert('Error', 'No se pudo acceder a las fotos del dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!imageBase64 || !selectedImageUri) {
      Alert.alert('Atención', 'Por favor toma una foto o selecciona una imagen de la galería.');
      return;
    }

    if (onPhotoConfirmed) {
      onPhotoConfirmed(imageBase64, selectedImageUri);
    } else if (navigation) {
      navigation.navigate('GarmentProcessing', {
        imageBase64,
        imageUri: selectedImageUri,
      });
    }
  };

  const handleCancelOrClose = () => {
    if (onClose) {
      onClose();
    } else if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Encabezado */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={handleCancelOrClose}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close-outline" size={26} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Añadir Prenda</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
              Procesando imagen y extrayendo Base64...
            </Text>
          </View>
        ) : selectedImageUri ? (
          /* Vista previa de la foto capturada */
          <View style={styles.previewContainer}>
            <View style={[styles.imageWrapper, { borderColor: colors.borderLight }]}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
            </View>

            <View style={styles.badgeSuccess}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={[styles.badgeSuccessText, { color: colors.primary }]}>
                Imagen Base64 lista para análisis
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: colors.borderLight, backgroundColor: colors.surfaceSubtle }]}
                onPress={() => {
                  setSelectedImageUri(null);
                  setImageBase64(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="reload-outline" size={18} color={colors.primaryText} />
                <Text style={[styles.btnSecondaryText, { color: colors.primaryText }]}>Repetir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.cta }]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnPrimaryText, { color: colors.ctaText }]}>Procesar Prenda</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.ctaText} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Opciones de captura cuando no hay foto */
          <View style={styles.selectionContainer}>
            <GlassCard style={styles.guidanceCard}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(142, 182, 199, 0.15)' }]}>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.guidanceTitle, { color: colors.primaryText }]}>
                Captura tu Prenda
              </Text>
              <Text style={[styles.guidanceSubtitle, { color: colors.secondaryText }]}>
                Toma una foto bien iluminada sobre un fondo neutro para obtener los mejores resultados con Gemini y Tripo3D.
              </Text>
            </GlassCard>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.actionOptionBtn, { backgroundColor: colors.cta }]}
                onPress={handleLaunchCamera}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={22} color={colors.ctaText} />
                <Text style={[styles.actionOptionText, { color: colors.ctaText }]}>
                  Usar Cámara
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionOptionSecondaryBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
                onPress={handleLaunchGallery}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={22} color={colors.primaryText} />
                <Text style={[styles.actionOptionSecondaryText, { color: colors.primaryText }]}>
                  Abrir Galería
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.headline,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.subhead,
  },
  selectionContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  guidanceCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  guidanceTitle: {
    ...Typography.title2,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  guidanceSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  actionOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  actionOptionText: {
    ...Typography.body,
    fontWeight: '600',
  },
  actionOptionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  actionOptionSecondaryText: {
    ...Typography.body,
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
    marginBottom: Spacing.xl,
  },
  badgeSuccessText: {
    ...Typography.caption,
    color: '#15803D',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  btnSecondaryText: {
    ...Typography.callout,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  btnPrimaryText: {
    ...Typography.callout,
    fontWeight: '600',
  },
});
