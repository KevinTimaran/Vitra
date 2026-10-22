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
  isAvatarMode?: boolean;
  avatarGender?: 'female' | 'male' | 'non-binary' | string;
}

// Asset 3D local empaquetado directamente por el bundler de Metro
const LOCAL_TSHIRT_ASSET = require('../../assets/models/tshirt.glb');

export const StylizedAvatarSilhouette: React.FC<{
  gender?: 'female' | 'male' | 'non-binary' | string;
  colorHex?: string;
  isRotating?: boolean;
}> = ({ gender = 'female', colorHex = '#8EB6C7', isRotating = true }) => {
  const groupRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (isRotating && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.45;
    }
  });

  const isMale = gender === 'male';
  const isNeutral = gender === 'non-binary';

  const shoulderWidth = isMale ? 1.30 : isNeutral ? 1.10 : 0.95;
  const chestRadiusTop = isMale ? 0.48 : isNeutral ? 0.42 : 0.38;
  const chestRadiusBottom = isMale ? 0.36 : isNeutral ? 0.32 : 0.28;
  const waistRadius = isMale ? 0.34 : isNeutral ? 0.30 : 0.24;
  const hipWidth = isMale ? 0.85 : isNeutral ? 0.88 : 0.95;
  const legSpacing = isMale ? 0.18 : 0.16;
  const primaryColor = colorHex || '#8EB6C7';

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {/* Cabeza estilizada minimalista */}
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color="#E2D3C4"
          metalness={0.25}
          roughness={0.35}
          transparent={true}
          opacity={0.92}
        />
      </mesh>

      {/* Cuello */}
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.20, 16]} />
        <meshStandardMaterial color="#D4C3B2" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Hombros */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[shoulderWidth, 0.14, 0.32]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={0.4}
          roughness={0.3}
          wireframe={true}
          transparent={true}
          opacity={0.85}
        />
      </mesh>

      {/* Pecho y Torso Superior */}
      <mesh position={[0, 0.60, 0]}>
        <cylinderGeometry args={[chestRadiusTop, chestRadiusBottom, 0.38, 20]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={0.35}
          roughness={0.35}
          wireframe={true}
          transparent={true}
          opacity={0.88}
        />
      </mesh>

      {/* Cintura */}
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[chestRadiusBottom, waistRadius, 0.22, 20]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={0.4}
          roughness={0.3}
          wireframe={true}
          transparent={true}
          opacity={0.88}
        />
      </mesh>

      {/* Caderas / Pelvis */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[hipWidth, 0.24, 0.34]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={0.4}
          roughness={0.3}
          wireframe={true}
          transparent={true}
          opacity={0.90}
        />
      </mesh>

      {/* Piernas superiores (Muslos) */}
      <mesh position={[-legSpacing, -0.20, 0]}>
        <cylinderGeometry args={[0.13, 0.09, 0.50, 16]} />
        <meshStandardMaterial color={primaryColor} metalness={0.35} roughness={0.4} wireframe={true} opacity={0.8} transparent={true} />
      </mesh>
      <mesh position={[legSpacing, -0.20, 0]}>
        <cylinderGeometry args={[0.13, 0.09, 0.50, 16]} />
        <meshStandardMaterial color={primaryColor} metalness={0.35} roughness={0.4} wireframe={true} opacity={0.8} transparent={true} />
      </mesh>

      {/* Piernas inferiores (Pantorrillas) */}
      <mesh position={[-legSpacing, -0.66, 0]}>
        <cylinderGeometry args={[0.09, 0.06, 0.48, 16]} />
        <meshStandardMaterial color={primaryColor} metalness={0.35} roughness={0.4} wireframe={true} opacity={0.75} transparent={true} />
      </mesh>
      <mesh position={[legSpacing, -0.66, 0]}>
        <cylinderGeometry args={[0.09, 0.06, 0.48, 16]} />
        <meshStandardMaterial color={primaryColor} metalness={0.35} roughness={0.4} wireframe={true} opacity={0.75} transparent={true} />
      </mesh>

      {/* Pedestal Atelier */}
      <mesh position={[0, -0.98, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.22, 16]} />
        <meshStandardMaterial color="#6D28D9" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, -1.10, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.04, 32]} />
        <meshStandardMaterial color="#7C3AED" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

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
  colorHex?: string;
}> = ({ colorHex }) => {
  const gltf = useGLTF(LOCAL_TSHIRT_ASSET as any, false);
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
  selectedLayer,
  isAvatarMode,
  avatarGender,
  onLoadError,
}) => {
  const isAvatar = isAvatarMode || selectedLayer === 'Avatar 3D' || selectedLayer === 'Cuerpo Base';

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
        ) : isAvatar ? (
          <Suspense fallback={<Loader3D colorHex={garmentColorHex} />}>
            <StylizedAvatarSilhouette gender={avatarGender} colorHex={garmentColorHex || '#8EB6C7'} isRotating={true} />
          </Suspense>
        ) : (
          <Suspense fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} isRotating={true} />}>
            <PlaceholderTShirt colorHex={garmentColorHex} />
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
