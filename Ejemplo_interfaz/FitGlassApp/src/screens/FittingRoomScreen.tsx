import React, { Suspense, useState, useRef } from 'react';
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
import { Viewport3DPlaceholder } from '../components/Viewport3DPlaceholder';
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
          /* Visor 3D interactivo */
          <View style={styles.canvasContainer}>
            <Viewport3DPlaceholder
              currentGarmentName={metadata?.tipo_prenda || 'Prenda Atelier'}
              heightRatio={0.52}
              highlightFit={true}
              selectedLayer={metadata?.tipo_prenda || 'Capa 3D'}
            />
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
    ...Typography.headline,
    fontWeight: '700',
  },
  screenSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 6,
  },
  toggleBtnText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    gap: 6,
  },
  addBtnText: {
    ...Typography.caption,
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
    backgroundColor: 'rgba(17, 17, 19, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  touchHintText: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '500',
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  badge2DText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
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
    backgroundColor: '#22C55E',
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  cameraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 4,
  },
  cameraActionText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  metadataTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  tagText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  hintNote: {
    ...Typography.micro,
    marginTop: 2,
    lineHeight: 15,
  },
});
