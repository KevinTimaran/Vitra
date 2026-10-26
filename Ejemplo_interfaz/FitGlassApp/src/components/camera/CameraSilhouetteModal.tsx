import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SilhouetteGuideSvg } from './SilhouetteGuideSvg';
import { ImageCropperModal } from './ImageCropperModal';

interface CameraSilhouetteModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoSelected: (uri: string, base64?: string) => void;
  gender?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CameraSilhouetteModal: React.FC<CameraSilhouetteModalProps> = ({
  visible,
  onClose,
  onPhotoSelected,
  gender = 'female',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  // Estado del flujo de recorte posterior
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Seleccionar foto existente de la galería y enviarla al recortador
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Se requiere acceso a la galería.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Pasará directamente al recortador dedicado
        quality: 0.9,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCapturedUri(res.assets[0].uri);
        setShowCropper(true);
      }
    } catch (gErr) {
      console.error('[CameraSilhouetteModal] Error en galería:', gErr);
    }
  };

  if (!visible) return null;

  // Manejo de permisos de cámara
  if (!permission) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.permissionText}>Comprobando permisos de cámara...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#D4AF37" style={{ marginBottom: 16 }} />
          <Text style={styles.permissionTitle}>ACCESO A LA CÁMARA REQUERIDO</Text>
          <Text style={styles.permissionDescription}>
            Vitra requiere acceso a la cámara para capturar tu postura biométrica y modelar tu gemelo digital 3D.
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>CONCEDER ACCESO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.grantBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D4AF37', marginTop: 12 }]}
            onPress={handlePickFromGallery}
          >
            <Text style={[styles.grantBtnText, { color: '#D4AF37' }]}>ELEGIR DE GALERÍA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // Tomar fotografía con el visor de cámara activo
  const handleTakePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        setCapturedUri(photo.uri);
        setShowCropper(true);
      }
    } catch (err: any) {
      console.error('[CameraSilhouetteModal] Error capturando foto:', err);
      Alert.alert('Error', 'No se pudo capturar la fotografía.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Alternar cámara frontal / trasera
  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  // Confirmación desde el recortador
  const handleCropperConfirm = (croppedUri: string, base64?: string) => {
    setShowCropper(false);
    setCapturedUri(null);
    onPhotoSelected(croppedUri, base64);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Visor de Cámara de Expo */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
        >
          {/* Overlay Silueta Humana A-Pose Translúcida */}
          <View style={styles.silhouetteOverlay} pointerEvents="none">
            <SilhouetteGuideSvg
              width={SCREEN_WIDTH * 0.88}
              height={SCREEN_HEIGHT * 0.72}
              gender={gender}
            />
          </View>

          {/* Banner Flotante de Instrucción */}
          <View style={styles.floatingBannerContainer}>
            <View style={styles.floatingBanner}>
              <View style={styles.bannerIconBadge}>
                <Ionicons name="body-outline" size={16} color="#0D0D0D" />
              </View>
              <View style={styles.bannerTextContent}>
                <Text style={styles.bannerTitle}>POSTURA BIOMÉTRICA (A-POSE)</Text>
                <Text style={styles.bannerMessage}>
                  Align your body with the silhouette. Stand with arms slightly away from your sides (A-pose). Ensure good lighting.
                </Text>
                <Text style={styles.bannerMessageEs}>
                  Alinea tu cuerpo con la silueta. Mantén los brazos ligeramente separados (postura A) y buena iluminación.
                </Text>
              </View>
            </View>
          </View>

          {/* Barra Superior con Controles (Cerrar / Cambiar Cámara) */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconCircleBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircleBtn} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Barra Inferior con Disparador y Galería */}
          <View style={styles.bottomBar}>
            {/* Botón de Galería */}
            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
              <Ionicons name="images-outline" size={24} color="#FFFFFF" />
              <Text style={styles.galleryBtnLabel}>Galería</Text>
            </TouchableOpacity>

            {/* Disparador de Alta Gama Vitra */}
            <TouchableOpacity
              style={styles.shutterOuterRing}
              onPress={handleTakePicture}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              <View style={styles.shutterInnerCircle}>
                {isCapturing ? (
                  <ActivityIndicator color="#0D0D0D" size="small" />
                ) : (
                  <View style={styles.shutterCore} />
                )}
              </View>
            </TouchableOpacity>

            {/* Placeholder equilibrador derecho */}
            <View style={{ width: 60 }} />
          </View>
        </CameraView>

        {/* Modal de Recorte Ajustado Posterior */}
        <ImageCropperModal
          visible={showCropper}
          imageUri={capturedUri}
          onConfirm={handleCropperConfirm}
          onCancel={() => {
            setShowCropper(false);
            setCapturedUri(null);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 16,
  },
  permissionTitle: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  grantBtn: {
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginBottom: 14,
  },
  grantBtnText: {
    color: '#0D0D0D',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  cancelBtn: {
    padding: 10,
  },
  cancelBtnText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  silhouetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  floatingBannerContainer: {
    position: 'absolute',
    top: 98,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  floatingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(13, 13, 13, 0.88)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  bannerIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bannerTextContent: {
    flex: 1,
  },
  bannerTitle: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  bannerMessage: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  bannerMessageEs: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 38,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  galleryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  galleryBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  shutterOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  shutterInnerCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F5F5F5',
  },
});
