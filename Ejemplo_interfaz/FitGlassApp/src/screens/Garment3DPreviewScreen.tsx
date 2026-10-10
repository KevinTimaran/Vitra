import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { Garment } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// Importar Three.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Modelo local generado con scripts/generate-tshirt-glb.mjs (ver metro.config.js para el soporte .glb)
const TSHIRT_MODEL = require('../../assets/models/tshirt.glb');

interface Garment3DPreviewScreenProps {
  garment: Garment;
  onBack: () => void;
}

type GLStatus =
  | 'waiting'
  | 'context'
  | 'drawing'
  | 'error';

const TAG = '[GLTest-Three]';

export const Garment3DPreviewScreen: React.FC<Garment3DPreviewScreenProps> = ({ garment, onBack }) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<GLStatus>('waiting');
  const [detail, setDetail] = useState<string>('Esperando onContextCreate…');
  const [frames, setFrames] = useState(0);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    console.log(TAG, 'Pantalla montada.');
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      console.log(TAG, 'Pantalla desmontada, animación detenida');
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    try {
      console.log(TAG, '1) onContextCreate ejecutado. Buffer:', gl.drawingBufferWidth, 'x', gl.drawingBufferHeight);
      setStatus('context');
      setDetail(`Contexto creado (${gl.drawingBufferWidth}×${gl.drawingBufferHeight})`);

      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      // Crear un mock del canvas que WebGLRenderer de Three.js necesita internamente
      const canvasMock = {
        width,
        height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientWidth: width,
        clientHeight: height,
      } as unknown as HTMLCanvasElement;

      // 2) Inicializar Three.js
      // Parche temporal para que Three.js r163+ no falle al detectar expo-gl como WebGL 1
      const originalWebGLRenderingContext = (globalThis as any).WebGLRenderingContext;
      if (originalWebGLRenderingContext) {
        try { (globalThis as any).WebGLRenderingContext = undefined; } catch (e) {}
      }

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasMock,
        context: gl,
        antialias: true,
        alpha: false, // Usaremos un color sólido de fondo
      });
      
      if (originalWebGLRenderingContext) {
        try { (globalThis as any).WebGLRenderingContext = originalWebGLRenderingContext; } catch (e) {}
      }
      
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false); // false para no intentar modificar el style del mock
      renderer.setClearColor(0x1e3a8a, 1); // Azul oscuro (Tailwind blue-900)

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
      camera.position.z = 3;

      console.log(TAG, '2) Renderer, Escena y Cámara creados');

      // Iluminación (la camiseta usa MeshStandardMaterial)
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(2, 3, 4);
      scene.add(keyLight);
      const backLight = new THREE.DirectionalLight(0xffffff, 1.4);
      backLight.position.set(-2, 1, -4);
      scene.add(backLight);

      // 3) Cargar la camiseta .glb local
      setDetail('Cargando camiseta .glb…');
      const assetUri = Image.resolveAssetSource(TSHIRT_MODEL)?.uri;
      if (!assetUri) throw new Error('No se pudo resolver la URI del asset tshirt.glb');
      console.log(TAG, '3a) Descargando modelo:', assetUri);
      const response = await fetch(assetUri);
      if (!response.ok) throw new Error(`fetch del modelo falló: HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      console.log(TAG, '3b) Bytes del modelo:', buffer.byteLength);

      const gltf = await new GLTFLoader().parseAsync(buffer, '');
      if (!mountedRef.current) return;

      // Normalizar tamaño (ancho ~2 unidades) y centrar; el pivote rota sobre el eje Y
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2 / Math.max(size.x, size.y);
      model.position.sub(center);
      const pivot = new THREE.Group();
      pivot.scale.setScalar(scale);
      pivot.add(model);
      scene.add(pivot);

      let meshCount = 0;
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshCount++; });
      console.log(TAG, `3c) Camiseta cargada: ${meshCount} mallas, tamaño original ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`);

      let frame = 0;
      const render = () => {
        if (!mountedRef.current) return;
        try {
          // Rotar la camiseta (demostración del visor)
          pivot.rotation.y += 0.02;

          // Renderizar escena con Three.js
          renderer.render(scene, camera);
          
          // Obligatorio en expo-gl para presentar el frame en la pantalla
          gl.endFrameEXP();

          if (frame === 0) {
            console.log(TAG, '4) Primer frame renderizado por Three.js con éxito');
            setStatus('drawing');
            setDetail('Camiseta 3D dibujada mediante Three.js');
          }
          frame++;
          if (frame % 60 === 0) {
            setFrames(frame);
          }
          rafRef.current = requestAnimationFrame(render);
        } catch (e: any) {
          console.error(TAG, 'Error en render loop:', e);
          setStatus('error');
          setDetail(String(e?.message ?? e));
        }
      };
      
      render();
    } catch (e: any) {
      console.error(TAG, 'Error inicializando Three.js:', e);
      setStatus('error');
      setDetail(String(e?.message ?? e));
    }
  };

  const statusColor =
    status === 'drawing' ? '#16A34A' : status === 'error' ? '#DC2626' : status === 'context' ? '#D97706' : '#6B7280';
  const statusLabel =
    status === 'drawing' ? '✅ THREE.JS DIBUJANDO'
    : status === 'context' ? '🟠 CONTEXTO CREADO'
    : status === 'error' ? '❌ ERROR THREE.JS'
    : '⏳ ESPERANDO CONTEXTO';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header title={'Prueba Three.js'} subtitle={garment.name} onBack={onBack} />

      <View style={styles.uiFrame}>
        <Text style={styles.uiFrameLabel}>Three.js sobre expo-gl</Text>
        <GLView style={styles.glView} onContextCreate={onContextCreate} />
      </View>

      <View style={styles.infoArea}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        <Text style={[Typography.caption, { color: colors.primaryText, textAlign: 'center', marginTop: Spacing.sm }]}>
          {detail}
        </Text>
        <Text style={[Typography.caption, { color: colors.secondaryText, textAlign: 'center', marginTop: 4 }]}>
          Frames presentados: {frames}
        </Text>
        <Text style={[Typography.caption, { color: colors.secondaryText, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 18 }]}>
          Éxito = fondo azul oscuro con una camiseta 3D girando.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  uiFrame: {
    flex: 1,
    margin: Spacing.xl,
    padding: 10,
    paddingTop: 26,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#3B82F6',
    backgroundColor: '#9CA3AF',
  },
  uiFrameLabel: {
    position: 'absolute',
    top: 6,
    left: 12,
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  glView: { flex: 1 },
  infoArea: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
