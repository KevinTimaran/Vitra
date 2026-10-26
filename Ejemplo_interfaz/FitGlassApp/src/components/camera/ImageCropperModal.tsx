import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string | null;
  onConfirm: (croppedUri: string, base64?: string) => void;
  onCancel: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 40;
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.58;

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}) => {
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Porcentajes de recorte ajustados para encuadrar estrictamente de cabeza a pies
  // Por defecto se remueve el 12% horizontal y 6% superior/inferior para maximizar resolución facial
  const [cropTop, setCropTop] = useState<number>(0.06);     // 6% superior
  const [cropBottom, setCropBottom] = useState<number>(0.06);  // 6% inferior
  const [cropSides, setCropSides] = useState<number>(0.12);    // 12% a cada lateral

  useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(
        imageUri,
        (w, h) => {
          setNaturalDimensions({ width: w, height: h });
        },
        (err) => {
          console.warn('[ImageCropperModal] Error obteniendo tamaño de imagen:', err);
          // Fallback a proporción estándar
          setNaturalDimensions({ width: 1080, height: 1440 });
        }
      );
    } else {
      setNaturalDimensions(null);
    }
  }, [visible, imageUri]);

  if (!visible || !imageUri) return null;

  const isLandscape = Boolean(
    naturalDimensions && naturalDimensions.width > naturalDimensions.height * 1.15
  );

  const handleApplyCrop = async () => {
    if (!naturalDimensions) return;

    try {
      setIsProcessing(true);
      const { width: origW, height: origH } = naturalDimensions;

      // Calcular coordenadas absolutas en pixeles de la imagen original garantizando límites estrictos
      const originX = Math.max(0, Math.min(origW - 1, Math.round(cropSides * origW)));
      const originY = Math.max(0, Math.min(origH - 1, Math.round(cropTop * origH)));
      const maxW = Math.max(1, origW - originX);
      const maxH = Math.max(1, origH - originY);
      const rawW = Math.round((1 - (cropSides * 2)) * origW);
      const rawH = Math.round((1 - cropTop - cropBottom) * origH);
      const cropW = Math.max(1, Math.min(maxW, Math.max(1, rawW)));
      const cropH = Math.max(1, Math.min(maxH, Math.max(1, rawH)));


      // 1. Recortar estrictamente al sujeto
      // 2. Redimensionar para maximizar densidad facial a 1024 px
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropW,
              height: cropH,
            },
          },
          {
            resize: { width: 1024 },
          },
        ],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      const b64 = result.base64 ? `data:image/jpeg;base64,${result.base64}` : undefined;
      onConfirm(result.uri, b64);
    } catch (err: any) {
      console.error('[ImageCropperModal] Falló el recorte:', err);
      Alert.alert('Error', 'No se pudo procesar el encuadre de la fotografía.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Barra superior con branding Vitra */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn} disabled={isProcessing}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>ENCUADRE DEL GEMELO DIGITAL</Text>
            <Text style={styles.headerSubtitle}>Maximizar densidad de píxeles (Cabeza a Pies)</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Banner de instrucción obligatoria */}
        <View style={styles.instructionBanner}>
          <Ionicons name="scan-outline" size={18} color="#D4AF37" style={{ marginRight: 8 }} />
          <Text style={styles.instructionText}>
            Encuadra estrictamente desde la coronilla de tu cabeza hasta tus pies.
            Elimina el espacio vacío para garantizar rasgos faciales nítidos.
          </Text>
        </View>

        {/* Advertencia de formato horizontal (Edge Case) */}
        {isLandscape && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>
              Fotografía horizontal detectada. Para un gemelo digital 3D preciso, se sugiere una fotografía vertical de cuerpo entero (A-Pose).
            </Text>
          </View>
        )}

        {/* Visor con marco de recorte ajustado */}
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />

          {/* Sombra / Máscara exterior del recorte */}
          <View style={[styles.maskTop, { height: `${cropTop * 100}%` }]} />
          <View style={[styles.maskBottom, { height: `${cropBottom * 100}%` }]} />
          <View
            style={[
              styles.maskLeft,
              {
                top: `${cropTop * 100}%`,
                bottom: `${cropBottom * 100}%`,
                width: `${cropSides * 100}%`,
              },
            ]}
          />
          <View
            style={[
              styles.maskRight,
              {
                top: `${cropTop * 100}%`,
                bottom: `${cropBottom * 100}%`,
                width: `${cropSides * 100}%`,
              },
            ]}
          />

          {/* Borde del cuadro de recorte activo */}
          <View
            style={[
              styles.cropBox,
              {
                top: `${cropTop * 100}%`,
                bottom: `${cropBottom * 100}%`,
                left: `${cropSides * 100}%`,
                right: `${cropSides * 100}%`,
              },
            ]}
            pointerEvents="none"
          >
            {/* Guía superior (Cabeza) */}
            <View style={styles.guideLineTop}>
              <Text style={styles.guideLabel}>TOPE CABEZA</Text>
            </View>

            {/* Guía inferior (Pies) */}
            <View style={styles.guideLineBottom}>
              <Text style={styles.guideLabel}>BASE PIES</Text>
            </View>
          </View>
        </View>

        {/* Botones de selección de ajuste rápido */}
        <View style={styles.adjustSection}>
          <Text style={styles.adjustSectionTitle}>CALIBRAR ENCUADRE DE LA SILUETA</Text>
          <View style={styles.presetButtonsRow}>
            <TouchableOpacity
              style={[
                styles.presetBtn,
                cropSides === 0.08 && cropTop === 0.04 && styles.presetBtnActive,
              ]}
              onPress={() => {
                setCropTop(0.04);
                setCropBottom(0.04);
                setCropSides(0.08);
              }}
            >
              <Text style={styles.presetBtnText}>Estándar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetBtn,
                cropSides === 0.12 && cropTop === 0.06 && styles.presetBtnActive,
              ]}
              onPress={() => {
                setCropTop(0.06);
                setCropBottom(0.06);
                setCropSides(0.12);
              }}
            >
              <Text style={styles.presetBtnText}>Ajustado (A-Pose)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetBtn,
                cropSides === 0.18 && cropTop === 0.08 && styles.presetBtnActive,
              ]}
              onPress={() => {
                setCropTop(0.08);
                setCropBottom(0.08);
                setCropSides(0.18);
              }}
            >
              <Text style={styles.presetBtnText}>Ultra Nítido</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón de confirmación */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleApplyCrop}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#0D0D0D" style={{ marginRight: 8 }} />
                <Text style={styles.confirmBtnText}>OPTIMIZAR ENCUADRE Y GENERAR</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  instructionText: {
    flex: 1,
    color: '#E5C778',
    fontSize: 12,
    lineHeight: 17,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  warningText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 15,
  },
  previewContainer: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  maskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskLeft: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskRight: {
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 4,
    justifyContent: 'space-between',
  },
  guideLineTop: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.6)',
    borderStyle: 'dashed',
    padding: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  guideLineBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.6)',
    borderStyle: 'dashed',
    padding: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  guideLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  adjustSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  adjustSectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#D4AF37',
  },
  presetBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  confirmBtn: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: {
    color: '#0D0D0D',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
