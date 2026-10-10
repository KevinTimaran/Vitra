import React, { Suspense, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
// import { useGLTF, Stage, OrbitControls } from '@react-three/drei/native';
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
          <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
          >
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            
            {/* 
              NOTA: Se ha aislado el renderizado de @react-three/drei debido a un error de 
              incompatibilidad de runtime (undefined is not a function) en iOS con Hermes.
              Componentes como useGLTF, Stage u OrbitControls parecen estar fallando 
              en su inicialización nativa.
              
              Queda pendiente encontrar una alternativa a useGLTF para cargar el modelo
              remoto sin depender de dependencias web, posiblemente utilizando GLTFLoader
              directamente desde three-stdlib, y gestos nativos para la rotación.
            */}
            <mesh>
              <boxGeometry args={[2, 2, 2]} />
              <meshStandardMaterial color={colors.cta} />
            </mesh>
          </Canvas>
        )}
      </View>
      
      <View style={styles.infoArea}>
         <Text style={[Typography.subhead, { color: colors.primaryText, textAlign: 'center', marginBottom: Spacing.sm }]}>
           Entorno 3D Aislado
         </Text>
         <Text style={[Typography.caption, { color: colors.secondaryText, textAlign: 'center', lineHeight: 20 }]}>
           La carga remota del modelo (useGLTF) ha sido deshabilitada temporalmente para estabilizar el visor en iOS.
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
