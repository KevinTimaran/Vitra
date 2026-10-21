import React, { Suspense, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer, preloadGLTF } from '../components/Model3DViewer';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';

interface FittingRoomScreenProps {
  route?: {
    params?: {
      model_3d_url?: string;
      image_2d_url?: string;
      metadata?: any;
    };
  };
  model_3d_url?: string;
  image_2d_url?: string;
  navigation?: any;
  onOpenAddGarment?: () => void;
}

const DEFAULT_SAMPLE_MODEL_URL =
  'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';

export const FittingRoomScreen: React.FC<FittingRoomScreenProps> = (props) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const modelUrl =
    props.model_3d_url ||
    props.route?.params?.model_3d_url ||
    DEFAULT_SAMPLE_MODEL_URL;

  const image2dUrl = props.image_2d_url || props.route?.params?.image_2d_url;
  const metadata = props.route?.params?.metadata;

  const [show2DView, setShow2DView] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  // Precarga del modelo 3D optimizado (useGLTF.preload)
  useEffect(() => {
    if (modelUrl) {
      preloadGLTF(modelUrl);
    }
  }, [modelUrl]);

  const handleLaunchAddGarment = () => {
    if (props.onOpenAddGarment) {
      props.onOpenAddGarment();
    } else if (props.navigation) {
      props.navigation.navigate('AddGarment');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Barra superior con metadatos y alternador 2D/3D */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.titleColumn}>
          <Text style={[styles.screenTitle, { color: colors.primaryText }]}>{t('fittingRoom.title')}</Text>
          <Text style={[styles.screenSubtitle, { color: colors.secondaryText }]}>
            {metadata?.tipo_prenda
              ? `${metadata.tipo_prenda} · ${metadata.estilo_recomendado || 'Generativo'}`
              : t('fittingRoom.subtitle')}
          </Text>
        </View>

        {image2dUrl ? (
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => setShow2DView(!show2DView)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={show2DView ? 'cube-outline' : 'image-outline'}
              size={18}
              color={colors.primaryText}
            />
            <Text style={[styles.toggleBtnText, { color: colors.primaryText }]}>
              {show2DView ? t('fittingRoom.view3D') : t('fittingRoom.view2D')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.cta }]}
            onPress={handleLaunchAddGarment}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={16} color={colors.ctaText} />
            <Text style={[styles.addBtnText, { color: colors.ctaText }]}>{t('fittingRoom.tryGarment')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Área Principal de Renderizado */}
      <View style={styles.viewport}>
        {show2DView && image2dUrl ? (
          /* Vista de la imagen 2D fusionada (VTON) */
          <View style={styles.image2DWrapper}>
            <Image source={{ uri: image2dUrl }} style={styles.image2DFull} />
            <View style={styles.badge2D}>
              <Text style={styles.badge2DText}>Resultado VTON 2D (IDM-VTON)</Text>
            </View>
          </View>
        ) : (
          /* Visor 3D interactivo con soporte Draco y WebP */
          <View style={styles.canvasContainer}>
            <Suspense
              fallback={
                <View style={styles.loaderFallback}>
                  <ActivityIndicator size="large" color={colors.cta} />
                  <Text style={[styles.loaderFallbackText, { color: colors.secondaryText }]}>
                    Descomprimiendo modelo 3D (Draco / WebP)...
                  </Text>
                </View>
              }
            >
              <Model3DViewer
                modelUrl={modelUrl}
                currentGarmentName={metadata?.tipo_prenda || 'Prenda Atelier'}
                selectedLayer={metadata?.tipo_prenda || 'Capa 3D'}
                onLoadError={(err: any) => {
                  console.warn('[FittingRoom] Error al cargar modelo 3D:', err);
                  setLoadError(true);
                }}
              />
            </Suspense>
            {/* Guía táctil superpuesta */}
            <View style={styles.touchHintBadge}>
              <Ionicons name="finger-print-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.touchHintText}>{t('fittingRoom.touchHint')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Panel inferior de información y acciones */}
      <View style={[styles.bottomCard, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <View style={styles.cardHeader}>
          <View style={styles.statusIndicator}>
            <View style={styles.dotOnline} />
            <Text style={[styles.statusText, { color: colors.secondaryText }]}>{t('fittingRoom.activeModel')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.cameraActionBtn, { backgroundColor: colors.cta }]}
            onPress={handleLaunchAddGarment}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.ctaText} />
            <Text style={[styles.cameraActionText, { color: colors.ctaText }]}>{t('fittingRoom.newGarment')}</Text>
          </TouchableOpacity>
        </View>

        {metadata ? (
          <View style={styles.metadataTagsRow}>
            {metadata.tipo_prenda && (
              <View style={[styles.tag, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.tagText, { color: colors.primaryText }]}>{metadata.tipo_prenda}</Text>
              </View>
            )}
            {metadata.estilo_recomendado && (
              <View style={[styles.tag, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.tagText, { color: colors.primaryText }]}>{metadata.estilo_recomendado}</Text>
              </View>
            )}
            {metadata.color_dominante && (
              <View style={[styles.tag, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.tagText, { color: colors.primaryText }]}>{metadata.color_dominante}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.hintNote, { color: colors.tertiaryText }]}>
            {t('fittingRoom.rotationHint')}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  titleColumn: {
    flex: 1,
  },
  screenTitle: {
    ...Typography.headlineMd,
    fontSize: 20,
    lineHeight: 26,
  },
  screenSubtitle: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 237, 0.4)',
  },
  toggleBtnText: {
    ...Typography.labelMd,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 6,
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  addBtnText: {
    ...Typography.labelMd,
    fontWeight: '600',
  },
  viewport: {
    flex: 1,
    position: 'relative',
  },
  canvasContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  touchHintBadge: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    backgroundColor: 'rgba(46, 50, 56, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  touchHintText: {
    ...Typography.labelSm,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  image2DWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image2DFull: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  badge2D: {
    position: 'absolute',
    top: Spacing.lg,
    alignSelf: 'center',
    backgroundColor: 'rgba(46, 50, 56, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badge2DText: {
    ...Typography.labelSm,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bottomCard: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotOnline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9EBCB3', // Powdered mint
  },
  statusText: {
    ...Typography.labelMd,
    fontWeight: '500',
  },
  cameraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 4,
    shadowColor: '#2E3238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cameraActionText: {
    ...Typography.labelMd,
    fontWeight: '600',
  },
  metadataTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(193, 199, 203, 0.4)',
  },
  tagText: {
    ...Typography.labelSm,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  hintNote: {
    ...Typography.labelSm,
    marginTop: 2,
    lineHeight: 16,
  },
  loaderFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderFallbackText: {
    ...Typography.bodySm,
    marginTop: 8,
    fontWeight: '500',
  },
});
