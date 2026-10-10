import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { Garment } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface Garment3DPreviewScreenProps {
  garment: Garment;
  onBack: () => void;
}

/**
 * PRUEBA TEMPORAL DE DIAGNÓSTICO (sin Three.js / R3F).
 *
 * Distinción visual:
 *  - Marco exterior (UI de React Native): ROJO DISCONTINUO + fondo gris rayado → NO es WebGL.
 *  - Superficie GLView: se limpia a AZUL MARINO (#0B1E5B) desde WebGL.
 *  - Triángulo AMARILLO/MAGENTA girando: dibujado con shaders y presentado
 *    con endFrameEXP() en cada frame. Si gira, el ciclo dibujo→presentación funciona.
 */

type GLStatus =
  | 'waiting'      // GLView montado, callback aún no ejecutado
  | 'context'      // onContextCreate ejecutado
  | 'drawing'      // shaders compilados, primer frame presentado, animando
  | 'error';

const TAG = '[GLTest]';

const VERT_SRC = `
attribute vec2 aPosition;
attribute vec3 aColor;
uniform float uAngle;
varying vec3 vColor;
void main() {
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 p = vec2(aPosition.x * c - aPosition.y * s, aPosition.x * s + aPosition.y * c);
  gl_Position = vec4(p, 0.0, 1.0);
  vColor = aColor;
}
`;

const FRAG_SRC = `
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

function compileShader(gl: ExpoWebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader devolvió null');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Error compilando ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ${log}`);
  }
  return shader;
}

export const Garment3DPreviewScreen: React.FC<Garment3DPreviewScreenProps> = ({ garment, onBack }) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<GLStatus>('waiting');
  const [detail, setDetail] = useState<string>('Esperando onContextCreate…');
  const [frames, setFrames] = useState(0);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    console.log(TAG, 'Pantalla montada. GLView importado de expo-gl:', typeof GLView);
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      console.log(TAG, 'Pantalla desmontada, animación detenida');
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      console.log(TAG, '1) onContextCreate ejecutado. Buffer:', gl.drawingBufferWidth, 'x', gl.drawingBufferHeight);
      console.log(TAG, '   GL_VERSION:', gl.getParameter(gl.VERSION));
      setStatus('context');
      setDetail(`Contexto creado (${gl.drawingBufferWidth}×${gl.drawingBufferHeight})`);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      // 2) Shaders
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
      const program = gl.createProgram();
      if (!program) throw new Error('createProgram devolvió null');
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Error enlazando programa: ${gl.getProgramInfoLog(program)}`);
      }
      gl.useProgram(program);
      console.log(TAG, '2) Shaders compilados y programa enlazado');

      // 3) Geometría: triángulo con colores por vértice (x, y, r, g, b)
      const vertices = new Float32Array([
         0.0,  0.7,  1.0, 0.9, 0.0,  // amarillo
        -0.6, -0.5,  1.0, 0.0, 0.8,  // magenta
         0.6, -0.5,  1.0, 0.5, 0.0,  // naranja
      ]);
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const stride = 5 * 4;
      const aPosition = gl.getAttribLocation(program, 'aPosition');
      const aColor = gl.getAttribLocation(program, 'aColor');
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 2 * 4);
      const uAngle = gl.getUniformLocation(program, 'uAngle');
      console.log(TAG, '3) Buffer de vértices cargado. aPosition =', aPosition, 'aColor =', aColor);

      let frame = 0;
      const render = () => {
        if (!mountedRef.current) return;
        try {
          gl.clearColor(0.043, 0.118, 0.357, 1); // azul marino #0B1E5B
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(uAngle, frame * 0.03);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.flush();
          gl.endFrameEXP();

          if (frame === 0) {
            const err = gl.getError();
            console.log(TAG, '4) Primer drawArrays + endFrameEXP ejecutados. gl.getError() =', err);
            if (err !== gl.NO_ERROR) throw new Error(`gl.getError() = ${err} tras el primer frame`);
            setStatus('drawing');
            setDetail('Triángulo dibujado y presentado (endFrameEXP)');
          }
          frame++;
          if (frame % 60 === 0) {
            setFrames(frame);
            if (frame % 300 === 0) console.log(TAG, `   frames presentados: ${frame}`);
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
      console.error(TAG, 'Error en onContextCreate:', e);
      setStatus('error');
      setDetail(String(e?.message ?? e));
    }
  };

  const statusColor =
    status === 'drawing' ? '#16A34A' : status === 'error' ? '#DC2626' : status === 'context' ? '#D97706' : '#6B7280';
  const statusLabel =
    status === 'drawing' ? '✅ DIBUJO PRESENTADO'
    : status === 'context' ? '🟠 CONTEXTO CREADO (sin dibujo aún)'
    : status === 'error' ? '❌ ERROR WEBGL'
    : '⏳ ESPERANDO CONTEXTO';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header title={'Prueba Base WebGL'} subtitle={garment.name} onBack={onBack} />

      {/* Marco UI (no WebGL): rojo discontinuo con fondo gris */}
      <View style={styles.uiFrame}>
        <Text style={styles.uiFrameLabel}>Marco UI (React Native, no WebGL)</Text>
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
          Éxito = fondo AZUL MARINO dentro del marco rojo con un triángulo amarillo/magenta girando.
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
    borderColor: '#DC2626',
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
