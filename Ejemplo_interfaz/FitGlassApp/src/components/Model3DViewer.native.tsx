import React, { Suspense, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Viewport3DPlaceholder } from './Viewport3DPlaceholder';

interface Model3DViewerProps {
  modelUrl: string;
  onLoadError?: (error: any) => void;
  currentGarmentName?: string;
  selectedLayer?: string;
}

/**
 * Precarga el archivo .glb para que el navegador y la caché local lo tengan listo.
 */
export const preloadGLTF = (url: string) => {
  if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    fetch(url, { method: 'HEAD' }).catch(() => {
      // Ignorar fallo de precarga en segundo plano
    });
  }
};

/**
 * Loader renderizado dentro de Suspense mientras se descomprime la geometría y texturas.
 */
const Model3DLoader: React.FC = () => {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text style={styles.loaderText}>Cargando modelo 3D optimizado (Draco / WebP)...</Text>
    </View>
  );
};

export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  modelUrl,
  onLoadError,
  currentGarmentName = 'Prenda Atelier',
  selectedLayer = 'Capa 3D',
}) => {
  useEffect(() => {
    if (modelUrl) {
      preloadGLTF(modelUrl);
    }
  }, [modelUrl]);

  return (
    <View style={styles.container}>
      <Suspense fallback={<Model3DLoader />}>
        <Viewport3DPlaceholder
          currentGarmentName={currentGarmentName}
          heightRatio={0.52}
          highlightFit={true}
          selectedLayer={selectedLayer}
        />
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
