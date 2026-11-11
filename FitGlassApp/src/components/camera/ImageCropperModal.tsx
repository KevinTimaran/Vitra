import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, Radius, Typography } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../contexts/LanguageContext';
import {
  applyZoom,
  clampTranslate,
  cropRect,
  displaySize,
  fitFrame,
  frameAspectFor,
  touchDistance,
  type CropState,
  type Size,
} from './cropMath';

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string | null;
  onConfirm: (croppedUri: string, base64?: string) => void;
  onCancel: () => void;
  /** 'body': retrato de cuerpo entero (cabeza→pies). 'face': cuadrado con guía circular. */
  mode?: 'body' | 'face';
}

const INITIAL: CropState = { zoom: 1, tx: 0, ty: 0 };
const PRESETS = [
  { key: 'full', labelKey: 'crop.preset.full', zoom: 1 },
  { key: 'tight', labelKey: 'crop.preset.tight', zoom: 1.25 },
  { key: 'close', labelKey: 'crop.preset.close', zoom: 1.6 },
] as const;

/**
 * Recortador de fotos: la foto se muestra COMPLETA dentro de un marco con su misma proporción y se puede arrastrar y
 * ampliar (pellizco o botones). Lo que se ve es exactamente lo que se recorta (ver cropMath.ts).
 */
export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  visible,
  imageUri,
  onConfirm,
  onCancel,
  mode = 'body',
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [natural, setNatural] = useState<Size | null>(null);
  const [area, setArea] = useState<Size>({ width: 0, height: 0 });
  const [state, setState] = useState<CropState>(INITIAL);
  const [isProcessing, setIsProcessing] = useState(false);

  // Referencias para los gestos (se leen dentro de PanResponder sin re-crearlo)
  const stateRef = useRef<CropState>(INITIAL);
  const naturalRef = useRef<Size | null>(null);
  const frameRef = useRef<Size>({ width: 1, height: 1 });
  const gestureStart = useRef<{ state: CropState; distance: number } | null>(null);
  stateRef.current = state;
  naturalRef.current = natural;

  useEffect(() => {
    if (visible && imageUri) {
      setState(INITIAL);
      Image.getSize(
        imageUri,
        (width, height) => setNatural({ width, height }),
        () => setNatural({ width: 1080, height: 1440 })
      );
    } else {
      setNatural(null);
    }
  }, [visible, imageUri]);

  const aspect = mode === 'face' ? 1 : natural ? frameAspectFor(natural) : 0.75;
  const frame = useMemo<Size>(() => {
    const maxWidth = Math.max(1, Math.min(area.width, 480));
    const maxHeight = Math.max(1, area.height);
    return fitFrame(maxWidth, maxHeight, aspect);
  }, [area, aspect]);
  frameRef.current = frame;

  const update = useCallback((next: CropState) => {
    const n = naturalRef.current;
    if (!n) return;
    const clamped = clampTranslate(n, frameRef.current, next.zoom, next.tx, next.ty);
    setState({ zoom: Math.min(Math.max(next.zoom, 1), 4), tx: clamped.tx, ty: clamped.ty });
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          gestureStart.current = {
            state: stateRef.current,
            distance:
              touches.length >= 2
                ? touchDistance(
                    { x: touches[0].pageX, y: touches[0].pageY },
                    { x: touches[1].pageX, y: touches[1].pageY }
                  )
                : 0,
          };
        },
        onPanResponderMove: (event, gesture) => {
          const start = gestureStart.current;
          const n = naturalRef.current;
          if (!start || !n) return;
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            const distance = touchDistance(
              { x: touches[0].pageX, y: touches[0].pageY },
              { x: touches[1].pageX, y: touches[1].pageY }
            );
            if (start.distance === 0) {
              gestureStart.current = { state: stateRef.current, distance };
              return;
            }
            const next = applyZoom(n, frameRef.current, start.state, start.state.zoom * (distance / start.distance));
            setState(next);
          } else {
            update({ zoom: start.state.zoom, tx: start.state.tx + gesture.dx, ty: start.state.ty + gesture.dy });
          }
        },
        onPanResponderRelease: () => {
          gestureStart.current = null;
        },
        onPanResponderTerminate: () => {
          gestureStart.current = null;
        },
      }),
    [update]
  );

  if (!visible || !imageUri) return null;

  const isLandscape = Boolean(natural && natural.width > natural.height * 1.15);
  const shown = natural ? displaySize(natural, frame, state.zoom) : { width: frame.width, height: frame.height };

  const setZoom = (zoom: number) => {
    if (!natural) return;
    setState(applyZoom(natural, frame, state, zoom));
  };

  const handleApply = async () => {
    if (!natural) return;
    try {
      setIsProcessing(true);
      const rect = cropRect(natural, frame, state);
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: rect }, { resize: { width: mode === 'face' ? 768 : 1024 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const b64 = result.base64 ? `data:image/jpeg;base64,${result.base64}` : undefined;
      onConfirm(result.uri, b64);
    } catch (error: any) {
      console.error('[ImageCropperModal] Falló el recorte:', error);
      Alert.alert(t('common.error'), t('crop.err'));
    } finally {
      setIsProcessing(false);
    }
  };

  const onAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  const maskColor = colors.bg + 'D9'; // ~85 % de opacidad del fondo de la app
  const title = mode === 'face' ? t('crop.faceTitle') : t('crop.bodyTitle');
  const hint =
    mode === 'face'
      ? t('crop.faceHint')
      : t('crop.bodyHint');

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onCancel}
            disabled={isProcessing}
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
          >
            <Ionicons name="close" size={22} color={colors.primaryText} />
          </Pressable>
          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>
            <Text style={[styles.hint, { color: colors.secondaryText }]} numberOfLines={2}>
              {hint}
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        {isLandscape && mode === 'body' ? (
          <View style={[styles.notice, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.secondaryText} />
            <Text style={[styles.noticeText, { color: colors.secondaryText }]}>
              {t('crop.landscape')}
            </Text>
          </View>
        ) : null}

        {/* Marco de recorte */}
        <View style={styles.area} onLayout={onAreaLayout}>
          {natural && area.height > 0 ? (
            <View
              style={[
                styles.frame,
                {
                  width: frame.width,
                  height: frame.height,
                  borderColor: colors.primary,
                  borderRadius: mode === 'face' ? frame.width / 2 : 22,
                  backgroundColor: colors.surfaceSubtle,
                },
              ]}
              {...panResponder.panHandlers}
            >
              <Image
                source={{ uri: imageUri }}
                resizeMode="cover"
                style={{
                  position: 'absolute',
                  width: shown.width,
                  height: shown.height,
                  left: (frame.width - shown.width) / 2 + state.tx,
                  top: (frame.height - shown.height) / 2 + state.ty,
                }}
              />

              {/* Guías (no interceptan toques) */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {mode === 'body' ? (
                  <>
                    <View style={[styles.thirdV, { left: '33.33%', backgroundColor: colors.primary + '30' }]} />
                    <View style={[styles.thirdV, { left: '66.66%', backgroundColor: colors.primary + '30' }]} />
                    <View style={[styles.axis, { borderColor: colors.primary + '55' }]} />
                    <View style={[styles.guideLine, { top: '7%', backgroundColor: colors.primary + '99' }]} />
                    <View style={[styles.guideLine, { bottom: '7%', backgroundColor: colors.primary + '99' }]} />
                    <View style={[styles.tag, { top: '7%', backgroundColor: colors.primary }]}>
                      <Text style={[styles.tagText, { color: colors.ctaText }]}>{t('crop.head')}</Text>
                    </View>
                    <View style={[styles.tag, { bottom: '7%', backgroundColor: colors.primary }]}>
                      <Text style={[styles.tagText, { color: colors.ctaText }]}>{t('crop.feet')}</Text>
                    </View>
                  </>
                ) : (
                  <View style={[styles.faceGuide, { borderColor: colors.primary + '99' }]} />
                )}
              </View>
            </View>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>

        {/* Controles */}
        <View style={styles.controls}>
          <View style={styles.zoomRow}>
            <Pressable
              accessibilityLabel={t('crop.zoomOut')}
              onPress={() => setZoom(state.zoom - 0.25)}
              style={[styles.zoomBtn, { borderColor: colors.borderLight, backgroundColor: colors.surfaceSubtle }]}
            >
              <Ionicons name="remove" size={20} color={colors.primaryText} />
            </Pressable>
            <View style={[styles.zoomTrack, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={[styles.zoomFill, { width: `${((state.zoom - 1) / 3) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Pressable
              accessibilityLabel={t('crop.zoomIn')}
              onPress={() => setZoom(state.zoom + 0.25)}
              style={[styles.zoomBtn, { borderColor: colors.borderLight, backgroundColor: colors.surfaceSubtle }]}
            >
              <Ionicons name="add" size={20} color={colors.primaryText} />
            </Pressable>
          </View>

          <View style={styles.presets}>
            {PRESETS.map((preset) => {
              const active = Math.abs(state.zoom - preset.zoom) < 0.02 && state.tx === 0 && state.ty === 0;
              return (
                <Pressable
                  key={preset.key}
                  onPress={() => update({ zoom: preset.zoom, tx: 0, ty: 0 })}
                  style={[
                    styles.preset,
                    { borderColor: colors.borderLight },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.presetText, { color: active ? colors.ctaText : colors.secondaryText }]}>{t(preset.labelKey)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.gestureTip}>
            <Ionicons name="hand-left-outline" size={14} color={colors.tertiaryText} />
            <Text style={[styles.gestureTipText, { color: colors.tertiaryText }]}>{t('crop.gestureTip')}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleApply}
            disabled={isProcessing || !natural}
            style={[styles.cta, (isProcessing || !natural) && { opacity: 0.7 }]}
          >
            <LinearGradient
              colors={Colors.buttons.authGradient as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {isProcessing ? (
                <ActivityIndicator color={Colors.buttons.authText} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.buttons.authText} />
                  <Text style={[styles.ctaText, { color: Colors.buttons.authText }]}>{t('crop.usePhoto')}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  titleBox: { flex: 1, alignItems: 'center', gap: 2 },
  title: { fontFamily: Typography.bodoni.bold, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  hint: { fontFamily: Typography.outfit.regular, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontFamily: Typography.outfit.regular, fontSize: 11, lineHeight: 16 },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  frame: { overflow: 'hidden', borderWidth: 2.5 },
  thirdV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2 },
  axis: { position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeftWidth: 1, borderStyle: 'dashed' },
  guideLine: { position: 'absolute', left: 0, right: 0, height: 1.5 },
  tag: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 6,
    marginVertical: -9,
  },
  tagText: { fontFamily: Typography.outfit.semiBold, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  faceGuide: { flex: 1, margin: 14, borderRadius: 999, borderWidth: 2, borderStyle: 'dashed' },
  controls: { paddingHorizontal: 20, gap: 12 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoomBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  zoomTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  zoomFill: { height: 6, borderRadius: 3 },
  presets: { flexDirection: 'row', gap: 10 },
  preset: { flex: 1, minHeight: 42, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presetText: { fontFamily: Typography.outfit.semiBold, fontSize: 13, fontWeight: '600' },
  gestureTip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  gestureTipText: { fontFamily: Typography.outfit.regular, fontSize: 11 },
  cta: { borderRadius: Radius.pill, overflow: 'hidden' },
  ctaGradient: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  ctaText: { fontFamily: Typography.outfit.semiBold, fontSize: 16, fontWeight: '700' },
});
