import React, { Suspense, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

interface Model3DViewerProps {
  modelUrl: string;
  onLoadError?: (error: any) => void;
  currentGarmentName?: string;
  selectedLayer?: string;
}

/**
 * Malla 3D geométrica de respaldo si la descarga o decodificación falla.
 */
const Fallback3DMesh: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1.2, 1.6, 0.4]} />
      <meshStandardMaterial color="#8B5CF6" metalness={0.2} roughness={0.5} wireframe={true} />
    </mesh>
  );
};

/**
 * Componente que carga y renderiza el modelo 3D con compresión Draco y texturas WebP.
 */
const DracoModel: React.FC<{ url: string; onError?: (error: any) => void }> = ({ url, onError }) => {
  try {
    const gltf = useGLTF(url);
    return <primitive object={gltf.scene} scale={1.8} position={[0, -1, 0]} />;
  } catch (err: any) {
    // Si es una promesa de Suspense pendiente, relanzarla para que Suspense muestre el fallback
    if (err instanceof Promise || (err && typeof err.then === 'function')) {
      throw err;
    }
    console.warn('[DracoModel Native] Error al cargar GLTF:', err);
    onError?.(err);
    return <Fallback3DMesh />;
  }
};

/**
 * Loader renderizado dentro de Suspense mientras Draco descomprime la geometría.
 */
const Model3DLoader: React.FC = () => {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text style={styles.loaderText}>Descomprimiendo modelo 3D (Draco / WebP)...</Text>
    </View>
  );
};

/**
 * Precarga el archivo .glb comprimido para que esté disponible en memoria caché.
 */
export const preloadGLTF = (url: string) => {
  if (url && typeof url === 'string') {
    try {
      useGLTF.preload(url);
    } catch {
      // Ignorar fallo de precarga en segundo plano
    }
  }
};

export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  modelUrl,
  onLoadError,
}) => {
  useEffect(() => {
    if (modelUrl) {
      preloadGLTF(modelUrl);
    }
  }, [modelUrl]);

  return (
    <View style={styles.container}>
      <Suspense fallback={<Model3DLoader />}>
        <Canvas
          style={styles.canvas}
          camera={{ position: [0, 0, 3.5], fov: 45 }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 15, 10]} intensity={1.8} />
          <directionalLight position={[-10, -10, -10]} intensity={0.6} />

          <Suspense fallback={null}>
            <DracoModel url={modelUrl} onError={onLoadError} />
          </Suspense>

          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={1.2}
            maxDistance={6.0}
          />
        </Canvas>
      </Suspense>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 10,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});
