import React, { Suspense, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, PanResponder } from 'react-native';
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

// Carga directa de Three.js para evitar dependencias problemáticas de @react-three/drei
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// URL de prueba
const MODEL_URL = 'https://raw.githubusercontent.com/adrianhajdin/project_threejs_ai/main/client/public/shirt_baked.glb';

function ManualModel({ url, onError, setIsLoading }: { url: string; onError: (err: Error) => void; setIsLoading?: (v: boolean) => void }) {
  const [model, setModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let isActive = true;
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf: any) => {
        if (isActive) {
          // Centrar el modelo y ajustar tamaño si es necesario
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          gltf.scene.position.x += (gltf.scene.position.x - center.x);
          gltf.scene.position.y += (gltf.scene.position.y - center.y);
          gltf.scene.position.z += (gltf.scene.position.z - center.z);
          
          setModel(gltf.scene);
          setIsLoading?.(false);
        }
      },
      undefined,
      (error: any) => {
        if (isActive) {
          console.error("Error loading GLTF:", error);
          onError(error instanceof Error ? error : new Error('Failed to load 3D model'));
          setIsLoading?.(false);
        }
      }
    );

    return () => {
      isActive = false;
    };
  }, [url]);

  if (!model) return null;

  return <primitive object={model} scale={3} />; // Escala ampliada porque a veces los modelos GLB de prueba son pequeños
}

export const Garment3DPreviewScreen: React.FC<Garment3DPreviewScreenProps> = ({ garment, onBack }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para la rotación (y, x) de la cámara o de la malla
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotationRef = useRef({ x: 0, y: 0 });

  // Responder de gestos nativo de RN
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRotationRef.current = { ...rotationRef.current };
      },
      onPanResponderMove: (_: any, gestureState: any) => {
        // Multiplicador de sensibilidad
        const sensitivity = 0.01;
        const newRot = {
          x: startRotationRef.current.x + gestureState.dy * sensitivity,
          y: startRotationRef.current.y + gestureState.dx * sensitivity,
        };
        // Limitar rotación vertical (eje x)
        newRot.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, newRot.x));
        
        rotationRef.current = newRot;
        setRotation(newRot);
      },
    })
  ).current;

  // Renderizado manual del contenedor 3D
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={'Vista 3D'}
        subtitle={garment.name}
        onBack={onBack}
      />
      
      <View 
        style={[styles.canvasContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        {...panResponder.panHandlers}
      >
        {error ? (
          <View style={styles.center}>
            <Text style={[Typography.body, { color: 'red', marginBottom: 8 }]}>Error cargando modelo 3D</Text>
            <Text style={[Typography.caption, { color: colors.secondaryText }]}>{error.message}</Text>
          </View>
        ) : (
          <>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <ambientLight intensity={1.5} />
              <directionalLight position={[10, 10, 10]} intensity={2} />
              <directionalLight position={[-10, 10, -10]} intensity={1} />
              
              <group rotation={[rotation.x, rotation.y, 0]}>
                <Suspense fallback={null}>
                  <ManualModel 
                    url={MODEL_URL} 
                    onError={(err) => setError(err)}
                    setIsLoading={setIsLoading}
                  />
                </Suspense>
              </group>
            </Canvas>

            {/* Simulador de estado de carga mientras React renderiza */}
            {isLoading && (
              <View style={[styles.center, { position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }]}>
                <ActivityIndicator size="large" color={colors.primaryText} />
              </View>
            )}
          </>
        )}
      </View>
      
      <View style={styles.infoArea}>
         <Text style={[Typography.subhead, { color: colors.primaryText, textAlign: 'center', marginBottom: Spacing.sm }]}>
           Visor Nativo Aislado
         </Text>
         <Text style={[Typography.caption, { color: colors.secondaryText, textAlign: 'center', lineHeight: 20 }]}>
           Se ha integrado la carga de modelos `.glb` utilizando directamente GLTFLoader sobre el canvas, y rotación controlada por gestos nativos de React Native.
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
