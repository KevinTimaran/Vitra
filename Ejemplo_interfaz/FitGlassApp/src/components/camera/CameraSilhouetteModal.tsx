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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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

  // Respaldo directo: abrir cámara del sistema si se prefiere
  const handleSystemCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Se requiere acceso a la cámara.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCapturedUri(res.assets[0].uri);
        setShowCropper(true);
      }
    } catch (cErr) {
      console.error('[CameraSilhouetteModal] Error en cámara del sistema:', cErr);
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
      Alert.alert('Error', 'No se pudo capturar con el visor rápido. Abriendo cámara del sistema...');
      handleSystemCamera();
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

  const topInset = Math.max(insets.top, 24);
  const bottomInset = Math.max(insets.bottom, 24);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        {/* Visor de Cámara de Expo (Sin vistas hijas para que las capas nativas de video no oculten controles) */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
        />

        {/* Capa de interfaz de usuario superpuesta */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Overlay Silueta Humana A-Pose Translúcida */}
          <View style={styles.silhouetteOverlay} pointerEvents="none">
            <SilhouetteGuideSvg
              width={SCREEN_WIDTH * 0.88}
              height={SCREEN_HEIGHT * 0.72}
              gender={gender}
            />
          </View>

          {/* Barra Superior con Controles (Cerrar / Cambiar Cámara) */}
          <View style={[styles.topBar, { top: topInset + 10 }]}>
            <TouchableOpacity style={styles.iconCircleBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircleBtn} onPress={toggleCameraFacing} activeOpacity={0.7}>
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Banner Flotante de Instrucción */}
          <View style={[styles.floatingBannerContainer, { top: topInset + 64 }]}>
            <View style={styles.floatingBanner}>
              <View style={styles.bannerIconBadge}>
                <Ionicons name="body-outline" size={16} color="#0D0D0D" />
              </View>
              <View style={styles.bannerTextContent}>
                <Text style={styles.bannerTitle}>POSTURA BIOMÉTRICA (A-POSE)</Text>
                <Text style={styles.bannerMessage}>
                  Alinea tu cuerpo con la silueta dorada con los brazos separados y buena luz.
                </Text>
              </View>
            </View>
          </View>

          {/* Barra Inferior con Disparador Dorado, Galería y Cámara del Sistema */}
          <View style={[styles.bottomBar, { bottom: bottomInset + 16 }]}>
            {/* Botón de Galería */}
            <TouchableOpacity style={styles.actionBtn} onPress={handlePickFromGallery} activeOpacity={0.7}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="images-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.actionBtnLabel}>Galería</Text>
            </TouchableOpacity>

            {/* Disparador de Alta Gama Vitra (Centro) */}
            <TouchableOpacity
              style={styles.shutterOuterRing}
              onPress={handleTakePicture}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              <View style={styles.shutterInnerCircle}>
                {isCapturing ? (
                  <ActivityIndicator color="#D4AF37" size="small" />
                ) : (
                  <View style={styles.shutterCore} />
                )}
              </View>
            </TouchableOpacity>

            {/* Botón Cámara de Sistema Alternativa */}
            <TouchableOpacity style={styles.actionBtn} onPress={handleSystemCamera} activeOpacity={0.7}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.actionBtnLabel}>Cámara</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    left: 16,
    right: 16,
    zIndex: 10,
  },
  floatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 13, 13, 0.90)',
    borderRadius: 12,
    padding: 12,
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
  },
  bannerTextContent: {
    flex: 1,
  },
  bannerTitle: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  bannerMessage: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomBar: {
    position: 'absolute',
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  shutterOuterRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.22)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  shutterInnerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F0E6D2',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
});
