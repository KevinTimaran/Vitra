import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { Garment } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface Garment3DPreviewScreenProps {
  garment: Garment;
  onBack: () => void;
}

export const Garment3DPreviewScreen: React.FC<Garment3DPreviewScreenProps> = ({ garment, onBack }) => {
  const { colors } = useTheme();

  const onContextCreate = (gl: any) => {
    // Configurar viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    // Limpiar pantalla con un color Cyan brillante para confirmar que WebGL pinta
    gl.clearColor(0, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Forzar el renderizado a la pantalla nativa
    gl.flush();
    gl.endFrameEXP();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={'Prueba Base WebGL'}
        subtitle={garment.name}
        onBack={onBack}
      />
      
      <View style={[styles.canvasContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={onContextCreate}
        />
      </View>
      
      <View style={styles.infoArea}>
         <Text style={[Typography.subhead, { color: colors.primaryText, textAlign: 'center', marginBottom: Spacing.sm }]}>
           Prueba 1: expo-gl aislado
         </Text>
         <Text style={[Typography.caption, { color: colors.secondaryText, textAlign: 'center', lineHeight: 20 }]}>
           Estamos comprobando si el puente WebGL nativo de Expo funciona correctamente. Si el recuadro superior es cyan brillante, expo-gl es 100% compatible.
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
  infoArea: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  }
});
