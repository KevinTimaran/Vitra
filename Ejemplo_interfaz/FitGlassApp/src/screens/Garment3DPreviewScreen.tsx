import React, { Suspense, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useGLTF, Stage, OrbitControls } from '@react-three/drei/native';
import { Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { Garment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface Garment3DPreviewScreenProps {
  garment: Garment;
  onBack: () => void;
}

// Utilizar un modelo real genérico (Camiseta 3D) para la prueba inicial,
// descargado desde un repositorio público.
const MODEL_URL = 'https://raw.githubusercontent.com/adrianhajdin/project_threejs_ai/main/client/public/shirt_baked.glb';

function Model() {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive object={scene} />;
}

export const Garment3DPreviewScreen: React.FC<Garment3DPreviewScreenProps> = ({ garment, onBack }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [error, setError] = useState<Error | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={'Vista 3D'}
        subtitle={garment.name}
        onBack={onBack}
      />
      
      <View style={[styles.canvasContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        {error ? (
          <View style={styles.center}>
            <Text style={[Typography.body, { color: colors.secondaryText }]}>Error cargando modelo 3D</Text>
          </View>
        ) : (
          <Suspense fallback={
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primaryText} />
              <Text style={[Typography.caption, { color: colors.secondaryText, marginTop: Spacing.md }]}>
                Cargando modelo...
              </Text>
            </View>
          }>
            <Canvas
              camera={{ position: [0, 0, 5], fov: 45 }}
              onError={(e) => setError(e as any)}
            >
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
              <Stage environment="city" intensity={0.6}>
                <Model />
              </Stage>
              <OrbitControls autoRotate enableZoom={true} />
            </Canvas>
          </Suspense>
        )}
      </View>
      
      <View style={styles.infoArea}>
         <Text style={[Typography.subhead, { color: colors.primaryText, textAlign: 'center', marginBottom: Spacing.sm }]}>
           Modelo 3D de Prueba
         </Text>
         <Text style={[Typography.caption, { color: colors.secondaryText, textAlign: 'center', lineHeight: 20 }]}>
           Esta es una previsualización interactiva real. Puedes rotar y hacer zoom. El modelo que ves es un recurso de prueba, ya que la prenda actual ("{garment.name}") aún no tiene un archivo .glb asociado.
         </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvasContainer: {
    flex: 1,
    margin: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  },
  infoArea: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  }
});
