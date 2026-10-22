import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center } from '@react-three/drei';

export interface Model3DViewerProps {
  activeModelUrl?: string | null;
  modelUrl?: string | number | null;
  onLoadError?: (error: any) => void;
  currentGarmentName?: string;
  selectedLayer?: string;
  garmentColorHex?: string;
}

const LOCAL_SAMPLE_URL = 'https://fitglass-ai-kevin.loca.lt/static/models/tshirt.glb';

export const StylizedGarmentMannequin: React.FC<{
  colorHex?: string;
  isRotating?: boolean;
}> = ({ colorHex = '#8B5CF6', isRotating = true }) => {
  const mannequinRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (isRotating && mannequinRef.current) {
      mannequinRef.current.rotation.y += delta * 0.45;
    }
  });

  return (
    <group ref={mannequinRef} position={[0, 0, 0]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.55, 0.38, 1.25, 20]} />
        <meshStandardMaterial
          color={colorHex}
          metalness={0.4}
          roughness={0.3}
          wireframe={true}
          transparent={true}
          opacity={0.88}
        />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.35, 0.22, 0.45]} />
        <meshStandardMaterial
          color={colorHex}
          metalness={0.5}
          roughness={0.2}
          wireframe={true}
          transparent={true}
          opacity={0.92}
        />
      </mesh>
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

export const Loader3D: React.FC<{ colorHex?: string }> = ({ colorHex = '#8B5CF6' }) => {
  const ringRef1 = useRef<any>(null);
  const ringRef2 = useRef<any>(null);

  useFrame((_, delta) => {
    if (ringRef1.current) {
      ringRef1.current.rotation.y += delta * 1.8;
      ringRef1.current.rotation.x += delta * 0.9;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.y -= delta * 1.4;
      ringRef2.current.rotation.z += delta * 0.7;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <StylizedGarmentMannequin colorHex={colorHex} isRotating={true} />
      <mesh ref={ringRef1} position={[0, 0.2, 0]}>
        <torusGeometry args={[0.95, 0.02, 16, 64]} />
        <meshBasicMaterial color="#38BDF8" transparent={true} opacity={0.85} />
      </mesh>
      <mesh ref={ringRef2} position={[0, 0.2, 0]}>
        <torusGeometry args={[1.15, 0.015, 16, 64]} />
        <meshBasicMaterial color="#C084FC" transparent={true} opacity={0.65} />
      </mesh>
    </group>
  );
};

const DynamicGarmentModel: React.FC<{
  modelUrl: string;
}> = ({ modelUrl }) => {
  const gltf = useGLTF(modelUrl, false);
  const meshRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.45;
    }
  });

  const scene = useMemo(() => {
    const rawScene = (gltf as any)?.scene;
    if (!rawScene) return null;
    return rawScene.clone(true);
  }, [gltf]);

  if (!scene) return null;

  return (
    <group ref={meshRef}>
      <Center>
        <primitive object={scene} scale={2.0} />
      </Center>
    </group>
  );
};

const PlaceholderTShirt: React.FC<{
  modelUrl: string;
  colorHex?: string;
}> = ({ modelUrl, colorHex }) => {
  const gltf = useGLTF(modelUrl, false);
  const meshRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.45;
    }
  });

  const scene = useMemo(() => {
    const rawScene = (gltf as any)?.scene;
    if (!rawScene) return null;
    const cloned = rawScene.clone(true);

    if (colorHex) {
      cloned.traverse((node: any) => {
        if (node.isMesh && node.material) {
          if (node.material.name === 'ShirtFabric' || !node.material.map) {
            node.material = node.material.clone();
            node.material.color.set(colorHex);
            node.material.needsUpdate = true;
          }
        }
      });
    }

    return cloned;
  }, [gltf, colorHex]);

  if (!scene) return null;

  return (
    <group ref={meshRef}>
      <Center>
        <primitive object={scene} scale={2.4} />
      </Center>
    </group>
  );
};

export const preloadGLTF = (source: string | number) => {
  if (source && typeof source === 'string') {
    try {
      useGLTF.preload(source, false);
    } catch {
      // Ignorar fallo de precarga
    }
  }
};

export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  activeModelUrl,
  modelUrl,
  garmentColorHex,
  onLoadError,
}) => {
  const resolvedDynamicUrl = useMemo(() => {
    const candidate = activeModelUrl !== undefined ? activeModelUrl : modelUrl;
    if (typeof candidate === 'string' && (candidate.startsWith('http://') || candidate.startsWith('https://'))) {
      return candidate;
    }
    return null;
  }, [activeModelUrl, modelUrl]);

  useEffect(() => {
    if (resolvedDynamicUrl) {
      preloadGLTF(resolvedDynamicUrl);
    }
  }, [resolvedDynamicUrl]);

  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{ position: [0, 0, 3.2], fov: 45 }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[10, 15, 10]} intensity={2.0} />
        <directionalLight position={[-10, -10, -10]} intensity={0.8} />

        {resolvedDynamicUrl ? (
          <Suspense fallback={<Loader3D colorHex={garmentColorHex} />}>
            <DynamicGarmentModel key={resolvedDynamicUrl} modelUrl={resolvedDynamicUrl} />
          </Suspense>
        ) : (
          <Suspense fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} isRotating={true} />}>
            <PlaceholderTShirt modelUrl={LOCAL_SAMPLE_URL} colorHex={garmentColorHex} />
          </Suspense>
        )}

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={1.2}
          maxDistance={6.0}
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
