import React, { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Platform } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';

export interface Model3DViewerProps {
  activeModelUrl?: string | null;
  modelUrl?: string | number | null;
  onLoadError?: (error: any) => void;
  currentGarmentName?: string;
  selectedLayer?: string;
  garmentColorHex?: string;
}

// Asset 3D local empaquetado directamente por el bundler de Metro
const LOCAL_TSHIRT_ASSET = require('../../assets/models/tshirt.glb');

// Resuelve de forma síncrona la URI local sin disparar descargas de red
const getResolvedLocalAsset = (): string | number => {
  try {
    const asset = Asset.fromModule(LOCAL_TSHIRT_ASSET);
    return asset.localUri || asset.uri || LOCAL_TSHIRT_ASSET;
  } catch {
    return LOCAL_TSHIRT_ASSET;
  }
};

/**
 * Maniquí 3D interactivo y estilizado para respaldo inmediato.
 * Se construye con geometrías nativas de Three.js (0 dependencias externas).
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
 * Loader 3D inmersivo que se visualiza mientras el modelo .glb remoto
 * se descarga y optimiza desde FastAPI hacia el dispositivo móvil.
 */
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
      <StylizedGarmentMannequin colorHex={colorHex} />

      {/* Anillos orbitales holográficos giratorios */}
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
 * Renderizador del modelo 3D real generado dinámicamente por la API (Tripo3D / FastAPI).
 * Procesa directamente la URL HTTP de internet.
 */
const DynamicGarmentModel: React.FC<{
  modelUrl: string;
}> = ({ modelUrl }) => {
  const gltf = useGLTF(modelUrl, false);

  const scene = useMemo(() => {
    const rawScene = (gltf as any)?.scene;
    if (!rawScene) return null;
    return rawScene.clone(true);
  }, [gltf]);

  if (!scene) return null;

  return (
    <Center>
      <primitive object={scene} scale={2.0} />
    </Center>
  );
};

/**
 * Renderizador del placeholder estático local (camiseta genérica decorativa).
 * Utiliza el módulo local resuelto sin hacer peticiones de red HTTP.
 */
const PlaceholderTShirt: React.FC<{
  colorHex?: string;
}> = ({ colorHex }) => {
  const localSource = useMemo(() => getResolvedLocalAsset(), []);
  const gltf = useGLTF(localSource as any, false);

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
    <Center>
      <primitive object={scene} scale={1.9} />
    </Center>
  );
};

/**
 * Hook para descargar y almacenar en caché local los modelos .glb remotos.
 * Utiliza File.downloadFileAsync con el header 'Bypass-Tunnel-Reminder'
 * para evitar el bloqueo del tunnel (localtunnel) y obtener una URI file:// local,
 * lo cual evita el fallo UnableToDownloadAssetException en iOS AssetModule.swift.
 */
const useResolvedModelUri = (remoteUrl: string | null) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<any>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!remoteUrl) {
      setLocalUri(null);
      setIsLoading(false);
      return;
    }

    // En web o si ya es una URI local file://
    if (Platform.OS === 'web' || remoteUrl.startsWith('file:')) {
      setLocalUri(remoteUrl);
      setIsLoading(false);
      return;
    }

    const downloadModel = async () => {
      try {
        setIsLoading(true);
        setDownloadError(null);

        // Generar archivo destino en el directorio de caché usando la API moderna de Expo SDK 57
        const cleanName = remoteUrl.split('/').pop()?.split('?')[0] || 'model.glb';
        const targetFile = new File(Paths.cache, `fitglass_${cleanName}`);

        if (targetFile.exists) {
          if (targetFile.size > 50_000) {
            console.log('[Model3DViewer] Modelo recuperado de caché local válido:', targetFile.uri, `(${targetFile.size} bytes)`);
            if (!isCancelled) {
              setLocalUri(targetFile.uri);
              setIsLoading(false);
            }
            return;
          } else {
            console.warn('[Model3DViewer] Archivo en caché corrupto o incompleto, eliminando...');
            try {
              targetFile.delete();
            } catch {}
          }
        }

        console.log('[Model3DViewer] Descargando modelo con Bypass-Tunnel-Reminder:', remoteUrl);
        let downloadedFile: any = null;
        let lastErr: any = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            downloadedFile = await File.downloadFileAsync(remoteUrl, targetFile, {
              headers: {
                'Bypass-Tunnel-Reminder': 'true',
              },
              idempotent: true,
            });

            // Validar que el archivo descargado sea un modelo 3D real y no un error HTML
            if (targetFile.exists && targetFile.size < 50_000) {
              console.warn(`[Model3DViewer] Intento ${attempt}: Tamaño de archivo sospechoso (${targetFile.size} bytes). Reintentando...`);
              try { targetFile.delete(); } catch {}
              throw new Error(`Respuesta no válida del servidor (${targetFile.size} bytes)`);
            }

            break; // Descarga exitosa
          } catch (attemptErr: any) {
            lastErr = attemptErr;
            console.warn(`[Model3DViewer] Intento ${attempt}/3 falló:`, attemptErr?.message || attemptErr);
            if (attempt < 3 && !isCancelled) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }
        }

        if (!downloadedFile && lastErr) {
          throw lastErr;
        }

        if (!isCancelled && downloadedFile) {
          console.log('[Model3DViewer] Modelo guardado en caché local con éxito:', downloadedFile.uri);
          setLocalUri(downloadedFile.uri);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[Model3DViewer] Error al descargar modelo a caché local:', err);
        if (!isCancelled) {
          setDownloadError(err);
          setIsLoading(false);
        }
      }
    };

    downloadModel();

    return () => {
      isCancelled = true;
    };
  }, [remoteUrl]);

  return { localUri, isLoading, downloadError };
};

/**
 * Contenedor del grupo 3D que orquesta la rotación interactiva táctil
 * y la auto-rotación continua fluida.
 */
const Interactive3DScene: React.FC<{
  gestureRef: React.MutableRefObject<{ x: number; y: number; isDragging: boolean; zoom: number }>;
  activeModelUrl?: string | null;
  garmentColorHex?: string;
  onError?: (err: any) => void;
}> = ({ gestureRef, activeModelUrl, garmentColorHex, onError }) => {
  const groupRef = useRef<any>(null);
  const { localUri, isLoading, downloadError } = useResolvedModelUri(activeModelUrl || null);

  useEffect(() => {
    if (downloadError) {
      onError?.(downloadError);
    }
  }, [downloadError, onError]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      if (!gestureRef.current.isDragging) {
        // Auto-rotación suave de exhibición
        groupRef.current.rotation.y += delta * 0.22;
        // Sincronizar para evitar saltos angulares al volver a interactuar
        gestureRef.current.y = groupRef.current.rotation.y;
        // Restablecer ángulo de inclinación vertical gradualmente
        groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * 0.05;
        gestureRef.current.x = groupRef.current.rotation.x;
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
      {activeModelUrl ? (
        isLoading ? (
          <Loader3D colorHex={garmentColorHex} />
        ) : localUri ? (
          <InnerModelErrorBoundary
            key={localUri}
            fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} />}
            onError={onError}
          >
            <Suspense fallback={<Loader3D colorHex={garmentColorHex} />}>
              <DynamicGarmentModel modelUrl={localUri} />
            </Suspense>
          </InnerModelErrorBoundary>
        ) : (
          <StylizedGarmentMannequin colorHex={garmentColorHex} />
        )
      ) : (
        <InnerModelErrorBoundary
          fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} />}
          onError={onError}
        >
          <Suspense fallback={<StylizedGarmentMannequin colorHex={garmentColorHex} />}>
            <PlaceholderTShirt colorHex={garmentColorHex} />
          </Suspense>
        </InnerModelErrorBoundary>
      )}
    </group>
  );
};

export const preloadGLTF = (source: string | number) => {
  if (Platform.OS === 'web' && source && typeof source === 'string') {
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
  activeModelUrl,
  modelUrl,
  garmentColorHex = '#8B5CF6',
  onLoadError,
}) => {
  // Estado compartido para gestos táctiles directos con PanResponder
  const gestureState = useRef({
    x: 0,
    y: 0,
    isDragging: false,
    zoom: 1.0,
  });

  // Guardar el ángulo base al iniciar el toque para cálculo directo no acumulativo
  const initialAngle = useRef({ x: 0, y: 0 });

  // PanResponder nativo con sensibilidad calibrada para rotación suave 1:1
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gestureState.current.isDragging = true;
          // Anclar ángulo actual para que el movimiento sea lineal y fluido sin aceleración descontrolada
          initialAngle.current.y = gestureState.current.y;
          initialAngle.current.x = gestureState.current.x;
        },
        onPanResponderMove: (_, gesture) => {
          // Sensibilidad calibrada (0.005 rad/px): arrastrar 100px rota ~28 grados (control milimétrico)
          const SENSITIVITY_X = 0.005;
          const SENSITIVITY_Y = 0.0035;

          gestureState.current.y = initialAngle.current.y + gesture.dx * SENSITIVITY_X;
          gestureState.current.x = Math.max(
            -0.5,
            Math.min(0.5, initialAngle.current.x + gesture.dy * SENSITIVITY_Y)
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

  // Priorizamos activeModelUrl; si se provee modelUrl como string HTTP, también es válida
  const resolvedDynamicUrl = useMemo(() => {
    const candidate = activeModelUrl !== undefined ? activeModelUrl : modelUrl;
    if (typeof candidate === 'string' && (candidate.startsWith('http://') || candidate.startsWith('https://'))) {
      return candidate;
    }
    return null;
  }, [activeModelUrl, modelUrl]);

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
          activeModelUrl={resolvedDynamicUrl}
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
