import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center } from '@react-three/drei';

export interface Model3DViewerProps {
  modelUrl?: string | number;
  onLoadError?: (error: any) => void;
  currentGarmentName?: string;
  selectedLayer?: string;
  garmentColorHex?: string;
}

const StylizedGarmentMannequin: React.FC<{
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

const GarmentMesh: React.FC<{
  modelSource: string;
  garmentColorHex?: string;
}> = ({ modelSource, garmentColorHex }) => {
  const gltf = useGLTF(modelSource, false);
  const meshRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.45;
    }
  });

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
    return <StylizedGarmentMannequin colorHex={garmentColorHex} isRotating={true} />;
  }

  return (
    <group ref={meshRef}>
      <Center>
        <primitive object={clonedScene} scale={2.4} />
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
  modelUrl,
  garmentColorHex,
  onLoadError,
}) => {
  const urlToUse = typeof modelUrl === 'string' && modelUrl ? modelUrl : 'https://fitglass-ai-kevin.loca.lt/static/models/tshirt.glb';

  useEffect(() => {
    if (urlToUse) {
      preloadGLTF(urlToUse);
    }
  }, [urlToUse]);

  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{ position: [0, 0, 3.2], fov: 45 }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[10, 15, 10]} intensity={2.0} />
        <directionalLight position={[-10, -10, -10]} intensity={0.8} />

        <Suspense fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} isRotating={true} />}>
          <GarmentMesh modelSource={urlToUse} garmentColorHex={garmentColorHex} />
        </Suspense>

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
