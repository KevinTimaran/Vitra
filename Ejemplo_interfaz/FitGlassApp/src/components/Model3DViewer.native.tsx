import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Text, TouchableOpacity } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';

export interface Model3DViewerProps {
  modelUrl?: string | number;
  onLoadError?: (error: any) => void;
  currentGarmentName?: string;
  selectedLayer?: string;
  garmentColorHex?: string;
}

const LOCAL_TSHIRT_ASSET = require('../../assets/models/tshirt.glb');

/**
 * Maniquí 3D interactivo y estilizado para respaldo inmediato.
 * Se construye con geometrías nativas de Three.js (0 dependencias externas).
 * Garantiza que la pantalla NUNCA se muestre vacía o negra.
 */
export const StylizedGarmentMannequin: React.FC<{
  colorHex?: string;
}> = ({ colorHex = '#8B5CF6' }) => {
  return (
    <group position={[0, 0, 0]}>
      {/* Torso estilizado con malla wireframe del color de la prenda */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.55, 0.38, 1.25, 20]} />
        <meshStandardMaterial
          color={colorHex}
          metalness={0.3}
          roughness={0.4}
          wireframe={true}
          transparent={true}
          opacity={0.88}
        />
      </mesh>
      {/* Hombros de la prenda */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.35, 0.22, 0.45]} />
        <meshStandardMaterial
          color={colorHex}
          metalness={0.4}
          roughness={0.3}
          wireframe={true}
          transparent={true}
          opacity={0.92}
        />
      </mesh>
      {/* Cuello / Escote */}
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.2, 0.23, 0.25, 16]} />
        <meshStandardMaterial
          color="#C4B5FD"
          metalness={0.3}
          roughness={0.4}
          wireframe={true}
          transparent={true}
          opacity={0.8}
        />
      </mesh>
      {/* Base de pedestal Atelier */}
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.55, 12]} />
        <meshStandardMaterial color="#6D28D9" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 32]} />
        <meshStandardMaterial color="#7C3AED" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

/**
 * Error boundary interno dentro del Canvas de Three.js para capturar fallos
 * de carga del GLTF sin desmontar el contexto WebGL.
 */
class InnerModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; onError?: (err: any) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: any) {
    console.warn('[InnerModelErrorBoundary] Error capturado en Canvas:', err);
    this.props.onError?.(err);
  }

  componentDidUpdate(prevProps: any) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Componente que renderiza el modelo GLTF descargado/cargado.
 */
const GarmentMesh: React.FC<{
  modelSource: string;
  garmentColorHex?: string;
}> = ({ modelSource, garmentColorHex }) => {
  // useGLTF con useDraco = false para no depender de Web Workers de navegador
  const gltf = useGLTF(modelSource, false);

  const clonedScene = useMemo(() => {
    const rawScene = (gltf as any)?.scene;
    if (!rawScene) return null;
    const scene = rawScene.clone(true);

    if (garmentColorHex) {
      scene.traverse((node: any) => {
        if (node.isMesh && node.material) {
          if (node.material.name === 'ShirtFabric' || !node.material.map) {
            node.material = node.material.clone();
            node.material.color.set(garmentColorHex);
            node.material.needsUpdate = true;
          }
        }
      });
    }

    return scene;
  }, [gltf, garmentColorHex]);

  if (!clonedScene) {
    return <StylizedGarmentMannequin colorHex={garmentColorHex} />;
  }

  return (
    <Center>
      <primitive object={clonedScene} scale={1.9} />
    </Center>
  );
};

/**
 * Renderizador seguro de prenda con fallback de doble capa
 */
const SafeGarmentRenderer: React.FC<{
  modelUrl?: string;
  localFallbackUri?: string | null;
  garmentColorHex?: string;
  onError?: (err: any) => void;
}> = ({ modelUrl, localFallbackUri, garmentColorHex, onError }) => {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [modelUrl]);

  const effectiveSource = useMemo(() => {
    if (loadError || !modelUrl) {
      return localFallbackUri || undefined;
    }
    return modelUrl;
  }, [loadError, modelUrl, localFallbackUri]);

  if (!effectiveSource) {
    // Si aún no se resolvió la URI local o remota, mostrar el maniquí estilizado
    return <StylizedGarmentMannequin colorHex={garmentColorHex} />;
  }

  return (
    <InnerModelErrorBoundary
      fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} />}
      onError={(err) => {
        console.warn('[SafeGarmentRenderer] Fallo al cargar modelo:', err?.message || err);
        setLoadError(true);
        onError?.(err);
      }}
    >
      <Suspense fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} />}>
        <GarmentMesh modelSource={effectiveSource} garmentColorHex={garmentColorHex} />
      </Suspense>
    </InnerModelErrorBoundary>
  );
};

/**
 * Contenedor del grupo 3D que orquesta la rotación interactiva táctil
 * y la auto-rotación continua fluida.
 */
const Interactive3DScene: React.FC<{
  gestureRef: React.MutableRefObject<{ x: number; y: number; isDragging: boolean; zoom: number }>;
  modelUrl?: string;
  localFallbackUri?: string | null;
  garmentColorHex?: string;
  onError?: (err: any) => void;
}> = ({ gestureRef, modelUrl, localFallbackUri, garmentColorHex, onError }) => {
  const groupRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      if (!gestureRef.current.isDragging) {
        // Auto-rotación suave de exhibición
        groupRef.current.rotation.y += delta * 0.45;
        // Restablecer ángulo de inclinación vertical gradualmente
        groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * 0.05;
      } else {
        // Rotación impulsada por el dedo del usuario
        groupRef.current.rotation.y = gestureRef.current.y;
        groupRef.current.rotation.x = gestureRef.current.x;
      }
      const scale = gestureRef.current.zoom;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <SafeGarmentRenderer
        modelUrl={modelUrl}
        localFallbackUri={localFallbackUri}
        garmentColorHex={garmentColorHex}
        onError={onError}
      />
    </group>
  );
};

export const preloadGLTF = (source: string | number) => {
  if (source && typeof source === 'string') {
    try {
      useGLTF.preload(source, false);
    } catch {
      // Ignorar fallo de precarga en segundo plano
    }
  }
};

/**
 * Visor 3D nativo ultra-resiliente para iOS y Android
 */
export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  modelUrl,
  garmentColorHex = '#8B5CF6',
  onLoadError,
}) => {
  const [localAssetUri, setLocalAssetUri] = useState<string | null>(null);

  // Estado compartido para gestos táctiles directos con PanResponder
  const gestureState = useRef({
    x: 0,
    y: 0,
    isDragging: false,
    zoom: 1.0,
  });

  // Precargar y resolver URI del modelo local empaquetado (tshirt.glb)
  useEffect(() => {
    let isMounted = true;
    Asset.fromModule(LOCAL_TSHIRT_ASSET)
      .downloadAsync()
      .then((asset) => {
        if (isMounted) {
          const uri = asset.localUri || asset.uri;
          setLocalAssetUri(uri);
          if (uri) {
            preloadGLTF(uri);
          }
        }
      })
      .catch((err) => {
        console.warn('[Model3DViewer] Error resolviendo asset local:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // PanResponder nativo para rotación 360° fluida sin depender de OrbitControls DOM
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gestureState.current.isDragging = true;
        },
        onPanResponderMove: (_, gesture) => {
          gestureState.current.y += gesture.dx * 0.015;
          gestureState.current.x = Math.max(
            -0.5,
            Math.min(0.5, gestureState.current.x + gesture.dy * 0.012)
          );
        },
        onPanResponderRelease: () => {
          gestureState.current.isDragging = false;
        },
        onPanResponderTerminate: () => {
          gestureState.current.isDragging = false;
        },
      }),
    []
  );

  const effectiveRemoteUrl = typeof modelUrl === 'string' ? modelUrl : undefined;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas
        style={styles.canvas}
        camera={{ position: [0, 0, 2.9], fov: 45 }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[10, 15, 10]} intensity={2.0} />
        <directionalLight position={[-10, -10, -10]} intensity={0.8} />
        <directionalLight position={[0, 5, -10]} intensity={0.8} />

        <Interactive3DScene
          gestureRef={gestureState}
          modelUrl={effectiveRemoteUrl}
          localFallbackUri={localAssetUri}
          garmentColorHex={garmentColorHex}
          onError={onLoadError}
        />
      </Canvas>
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
});
