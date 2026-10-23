import React, { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Platform } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { getBaseUrl } from '../services/ai/garmentAnalyzer';

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
 * Silueta anatómica 3D del Atelier Vitra, calibrada por género.
 * Construida 100% con geometrías Three.js sin latencia ni descargas de red.
 */
export const StylizedAvatarSilhouette: React.FC<{
  gender?: 'female' | 'male' | 'non-binary' | string;
  colorHex?: string;
}> = ({ gender = 'female', colorHex = '#8EB6C7' }) => {
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
    <group position={[0, 0.1, 0]}>
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
    const cloned = rawScene.clone(true);

    // Override physical material properties on all meshes: roughness 0.9, metalness 0.0 (matte fabric)
    cloned.traverse((node: any) => {
      if (node.isMesh && node.material) {
        const applyMatte = (mat: any) => {
          if (!mat) return;
          mat.roughness = 0.9;
          mat.metalness = 0.0;
          if ('specular' in mat && mat.specular?.set) {
            mat.specular.set(0x000000);
          }
          if ('shininess' in mat) {
            mat.shininess = 0;
          }
          if ('clearcoat' in mat) {
            mat.clearcoat = 0;
          }
          mat.needsUpdate = true;
        };

        if (Array.isArray(node.material)) {
          node.material.forEach(applyMatte);
        } else {
          applyMatte(node.material);
        }
      }
    });

    return cloned;
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

    cloned.traverse((node: any) => {
      if (node.isMesh && node.material) {
        node.material.roughness = 0.9;
        node.material.metalness = 0.0;
        if (colorHex) {
          if (node.material.name === 'ShirtFabric' || !node.material.map) {
            node.material = node.material.clone();
            node.material.color.set(colorHex);
            node.material.roughness = 0.9;
            node.material.metalness = 0.0;
            node.material.needsUpdate = true;
          }
        }
      }
    });

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

    // Resetear URI previa de inmediato para evitar mostrar el modelo viejo mientras se descarga o procesa el nuevo
    setLocalUri(null);
    setDownloadError(null);

    if (!remoteUrl) {
      setIsLoading(false);
      return;
    }

    // En web o si ya es una URI local file://
    if (Platform.OS === 'web' || remoteUrl.startsWith('file:')) {
      setLocalUri(remoteUrl);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

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

        let targetDownloadUrl = remoteUrl;
        if (
          Platform.OS !== 'web' &&
          (targetDownloadUrl.includes('127.0.0.1:8000') || targetDownloadUrl.includes('localhost:8000'))
        ) {
          const currentBase = getBaseUrl();
          targetDownloadUrl = targetDownloadUrl.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, currentBase);
        }

        console.log('[Model3DViewer] Descargando modelo con Bypass-Tunnel-Reminder:', targetDownloadUrl);
        let downloadedFile: any = null;
        let lastErr: any = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            downloadedFile = await File.downloadFileAsync(targetDownloadUrl, targetFile, {
              headers: {
                'Bypass-Tunnel-Reminder': 'true',
                'bypass-tunnel-reminder': 'true',
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
 * con física de inercia y auto-rotación continua fluida.
 */
const Interactive3DScene: React.FC<{
  gestureRef: React.MutableRefObject<{
    x: number;
    y: number;
    isDragging: boolean;
    zoom: number;
    angularVelocityY: number;
    angularVelocityX: number;
  }>;
  activeModelUrl?: string | null;
  garmentColorHex?: string;
  isAvatarMode?: boolean;
  avatarGender?: string;
  onError?: (err: any) => void;
}> = ({ gestureRef, activeModelUrl, garmentColorHex, isAvatarMode, avatarGender, onError }) => {
  const groupRef = useRef<any>(null);
  const { localUri, isLoading, downloadError } = useResolvedModelUri(activeModelUrl || null);

  useEffect(() => {
    if (downloadError) {
      onError?.(downloadError);
    }
  }, [downloadError, onError]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      if (gestureRef.current.isDragging) {
        // Rotación inmediata 1:1 impulsada por el dedo del usuario
        groupRef.current.rotation.y = gestureRef.current.y;
        groupRef.current.rotation.x = gestureRef.current.x;
      } else {
        // Si hay velocidad residual de inercia tras soltar el dedo (momentum)
        if (Math.abs(gestureRef.current.angularVelocityY) > 0.0008) {
          groupRef.current.rotation.y += gestureRef.current.angularVelocityY;
          // Fricción suave para desaceleración natural
          gestureRef.current.angularVelocityY *= 0.94;
          gestureRef.current.y = groupRef.current.rotation.y;
        } else {
          // Auto-rotación suave de exhibición cuando el objeto está en reposo
          gestureRef.current.angularVelocityY = 0;
          groupRef.current.rotation.y += delta * 0.25;
          gestureRef.current.y = groupRef.current.rotation.y;
        }

        // Restablecer ángulo de inclinación vertical gradualmente hacia nivelado
        if (Math.abs(gestureRef.current.angularVelocityX) > 0.0008) {
          groupRef.current.rotation.x += gestureRef.current.angularVelocityX;
          gestureRef.current.angularVelocityX *= 0.90;
        } else {
          groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * 0.06;
        }
        gestureRef.current.x = groupRef.current.rotation.x;
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
            fallback={
              isAvatarMode ? (
                <StylizedAvatarSilhouette gender={avatarGender} colorHex={garmentColorHex || '#8EB6C7'} />
              ) : (
                <StylizedGarmentMannequin colorHex={garmentColorHex} />
              )
            }
            onError={onError}
          >
            <Suspense fallback={<Loader3D colorHex={garmentColorHex} />}>
              <DynamicGarmentModel modelUrl={localUri} />
            </Suspense>
          </InnerModelErrorBoundary>
        ) : isAvatarMode ? (
          <StylizedAvatarSilhouette gender={avatarGender} colorHex={garmentColorHex || '#8EB6C7'} />
        ) : (
          <StylizedGarmentMannequin colorHex={garmentColorHex} />
        )
      ) : isAvatarMode ? (
        <InnerModelErrorBoundary
          fallback={<StylizedAvatarSilhouette gender={avatarGender} colorHex={garmentColorHex || '#8EB6C7'} />}
          onError={onError}
        >
          <Suspense fallback={<Loader3D colorHex={garmentColorHex} />}>
            <StylizedAvatarSilhouette gender={avatarGender} colorHex={garmentColorHex || '#8EB6C7'} />
          </Suspense>
        </InnerModelErrorBoundary>
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
  selectedLayer,
  isAvatarMode,
  avatarGender,
  onLoadError,
}) => {
  const isAvatar = isAvatarMode || selectedLayer === 'Avatar 3D' || selectedLayer === 'Cuerpo Base';

  // Estado compartido para gestos táctiles directos con PanResponder y física de velocidad
  const gestureState = useRef({
    x: 0,
    y: 0,
    isDragging: false,
    zoom: 1.0,
    angularVelocityY: 0,
    angularVelocityX: 0,
  });

  // Guardar el ángulo base y tracking de posición para velocidad instantánea
  const initialAngle = useRef({ x: 0, y: 0 });
  const lastTouch = useRef({ x: 0, y: 0, time: 0 });

  // PanResponder nativo con sensibilidad calibrada según velocidad y desplazamiento
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          gestureState.current.isDragging = true;
          gestureState.current.angularVelocityY = 0;
          gestureState.current.angularVelocityX = 0;
          initialAngle.current.y = gestureState.current.y;
          initialAngle.current.x = gestureState.current.x;
          lastTouch.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
            time: Date.now(),
          };
        },
        onPanResponderMove: (evt, gesture) => {
          // Sensibilidad dinámica: responde 1:1 a la pantalla táctil (~0.013 rad/px)
          const SENSITIVITY_X = 0.013;
          const SENSITIVITY_Y = 0.006;

          gestureState.current.y = initialAngle.current.y + gesture.dx * SENSITIVITY_X;
          gestureState.current.x = Math.max(
            -0.6,
            Math.min(0.6, initialAngle.current.x + gesture.dy * SENSITIVITY_Y)
          );

          // Medir velocidad instantánea para inercia natural
          const now = Date.now();
          const dt = Math.max(1, now - lastTouch.current.time);
          const dx = evt.nativeEvent.pageX - lastTouch.current.x;
          const dy = evt.nativeEvent.pageY - lastTouch.current.y;
          gestureState.current.angularVelocityY = (dx / dt) * 0.28;
          gestureState.current.angularVelocityX = (dy / dt) * 0.12;

          lastTouch.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
            time: now,
          };
        },
        onPanResponderRelease: (_, gesture) => {
          gestureState.current.isDragging = false;
          // Si el usuario hizo un swipe rápido (flick), usar gesture.vx como impulso
          if (Math.abs(gesture.vx) > 0.15) {
            gestureState.current.angularVelocityY = Math.max(-0.14, Math.min(0.14, gesture.vx * 0.045));
          }
        },
        onPanResponderTerminate: () => {
          gestureState.current.isDragging = false;
        },
      }),
    []
  );

  // Priorizamos activeModelUrl; si se provee modelUrl como string HTTP o file://, también es válida
  const resolvedDynamicUrl = useMemo(() => {
    const candidate = activeModelUrl !== undefined ? activeModelUrl : modelUrl;
    if (
      typeof candidate === 'string' &&
      (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('file:'))
    ) {
      return candidate;
    }
    return null;
  }, [activeModelUrl, modelUrl]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas
        key={resolvedDynamicUrl || `avatar-scene-${avatarGender || 'default'}`}
        style={styles.canvas}
        camera={{ position: [0, 0, 2.9], fov: 45 }}
      >
        {/* Iluminación de estudio suave y difusa para texturas de tela mate sin reflejos especulares plásticos */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 4]} intensity={0.8} />
        <directionalLight position={[-3, 2, -3]} intensity={0.4} />

        <Interactive3DScene
          gestureRef={gestureState}
          activeModelUrl={resolvedDynamicUrl}
          garmentColorHex={garmentColorHex}
          isAvatarMode={isAvatar}
          avatarGender={avatarGender}
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
