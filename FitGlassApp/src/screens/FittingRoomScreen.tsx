import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
  Platform,
  Modal,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer, preloadGLTF } from '../components/Model3DViewer';
import { LiquidGlassView } from '../components/LiquidGlassView';
import { VibrantBackground } from '../components/VibrantBackground';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { translateOr } from '../i18n/lookCategories';
import { useUser } from '../contexts/UserContext';
import { useForegroundJob, useJobs } from '../contexts/JobsContext';
import { WaitActions } from '../components/WaitActions';
import { openGame } from '../navigation/jobNavigation';
import {
  generateTryOn,
  generateOutfitTryOn,
  generateWaterfallCascadeTryOn,
  CascadeStepProgress,
} from '../services/ai/garmentAnalyzer';
import { Garment, SavedLookItem } from '../types';
import { GarmentViewScreen } from './GarmentViewScreen';
import { isColorHarmonious as checkColorHarmony } from '../utils/colorHarmony';
import { errorText } from '../services/jobs/jobErrors.ts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Trabajos de cascada cuyo resultado ya se mostró (a nivel de módulo: sobrevive a desmontar la pantalla).
const APPLIED_CASCADE_JOBS = new Set<string>();

interface FittingRoomScreenProps {
  route?: {
    params?: {
      model_3d_url?: string;
      image_2d_url?: string;
      metadata?: any;
      selectedGarment?: Garment;
    };
  };
  model_3d_url?: string;
  image_2d_url?: string;
  selectedGarment?: Garment;
  navigation?: any;
  onOpenAddGarment?: () => void;
}

export const FittingRoomScreen: React.FC<FittingRoomScreenProps> = (props) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, language, formatDate } = useTranslation();

  const {
    userProfile,
    avatarUrl,
    avatar_2d_image,
    avatar_3d_base_url,
    colorimetry_profile,
    wardrobe_items,
    saveLook,
    gender,
  } = useUser();

  const userAvatar3D = avatar_3d_base_url || avatarUrl || userProfile?.avatar_url || null;

  const initial3D =
    props.model_3d_url ||
    props.route?.params?.model_3d_url ||
    userAvatar3D;

  const initial2D =
    props.image_2d_url ||
    props.route?.params?.image_2d_url ||
    undefined;

  const [activeModelUrl, setActiveModelUrl] = useState<string | null>(initial3D);
  const [current2DUrl, setCurrent2DUrl] = useState<string | undefined>(initial2D);
  const [show2DView, setShow2DView] = useState<boolean>(false);
  const [activeGarmentDetail, setActiveGarmentDetail] = useState<Garment | null>(null);

  const initialGarment = props.selectedGarment || props.route?.params?.selectedGarment;
  
  const cleanedWardrobe = useMemo(() => {
    return (wardrobe_items || []).filter(
      (g) => g.id !== 'g-1' && g.name !== 'Essential Heavyweight T-Shirt'
    );
  }, [wardrobe_items]);

  const [selectedGarments, setSelectedGarments] = useState<Garment[]>(
    initialGarment
      ? [initialGarment]
      : []
  );
  
  const [tryOnSuccess, setTryOnSuccess] = useState<boolean>(false);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  // La generación vive en el servicio global de trabajos: cerrar o salir de esta pantalla NO la cancela.
  const { jobs, startJob, cancelJob, markJobSeen } = useJobs();
  const isFocused = useIsFocused();
  const cascadeJob = useMemo(() => [...jobs].reverse().find((job) => job.kind === 'cascade'), [jobs]);
  const isGenerating = cascadeJob?.status === 'running';
  const [overlayHidden, setOverlayHidden] = useState<boolean>(false);
  const overlayVisible = isGenerating && !overlayHidden;
  // Mientras el overlay se ve (y esta pestaña está activa) la capa global no repite la píldora.
  useForegroundJob(overlayVisible && isFocused ? cascadeJob?.id : null);
  const cascadeProgress: CascadeStepProgress | null = isGenerating && cascadeJob
    ? {
        step: cascadeJob.phase || 'init',
        progress: cascadeJob.progress,
        // El detalle llega del servidor en español: en otro idioma se muestra el texto de la fase.
        detail:
          language === 'es' && cascadeJob.detail
            ? cascadeJob.detail
            : translateOr(t, `room.step.${cascadeJob.phase || 'init'}`, translateOr(t, `phase.${cascadeJob.phase}`, t('room.step.default'))),
        currentGarmentIndex: cascadeJob.meta?.currentGarmentIndex,
        totalGarments: cascadeJob.meta?.totalGarments,
      }
    : null;

  const overlayVisibleRef = useRef<boolean>(false);
  overlayVisibleRef.current = overlayVisible;

  const [showTouchHint, setShowTouchHint] = useState<boolean>(true);
  const touchHintOpacity = useRef(new Animated.Value(1)).current;


  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(touchHintOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowTouchHint(false));
    }, 3000);

    return () => clearTimeout(timer);
  }, [touchHintOpacity]);

  useEffect(() => {
    if (!selectionHint) return undefined;
    const timer = setTimeout(() => setSelectionHint(null), 6000);
    return () => clearTimeout(timer);
  }, [selectionHint]);

  // Aplica el resultado de la cascada (también si terminó mientras estabas en otra pantalla).
  useEffect(() => {
    if (!cascadeJob) return;
    if (cascadeJob.status === 'done' && !APPLIED_CASCADE_JOBS.has(cascadeJob.id)) {
      APPLIED_CASCADE_JOBS.add(cascadeJob.id);
      markJobSeen(cascadeJob.id);
      const result = cascadeJob.result as { model_3d_url: string; final_dressed_image_url?: string };
      preloadGLTF(result.model_3d_url);
      setActiveModelUrl(result.model_3d_url);
      if (result.final_dressed_image_url) setCurrent2DUrl(result.final_dressed_image_url);
      setTryOnSuccess(true);
    } else if (cascadeJob.status === 'failed' && !APPLIED_CASCADE_JOBS.has(cascadeJob.id) && isFocused && overlayVisibleRef.current) {
      APPLIED_CASCADE_JOBS.add(cascadeJob.id);
      markJobSeen(cascadeJob.id);
      const { title, message } = errorText(cascadeJob.error, t);
      Alert.alert(title || t('room.err.failedTitle'), message || t('room.err.tryLater'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascadeJob?.id, cascadeJob?.status]);

  useEffect(() => {
    if (activeModelUrl) {
      preloadGLTF(activeModelUrl);
    }
  }, [activeModelUrl]);

  useEffect(() => {
    if (!props.model_3d_url && !props.route?.params?.model_3d_url && userAvatar3D) {
      setActiveModelUrl(userAvatar3D);
      preloadGLTF(userAvatar3D);
    }
  }, [userAvatar3D, props.model_3d_url, props.route?.params?.model_3d_url]);

  useEffect(() => {
    const route3d = props.model_3d_url || props.route?.params?.model_3d_url;
    const route2d = props.image_2d_url || props.route?.params?.image_2d_url;
    const routeGarment = props.selectedGarment || props.route?.params?.selectedGarment;

    if (route3d) {
      setActiveModelUrl(route3d);
      preloadGLTF(route3d);
    }
    if (route2d) {
      setCurrent2DUrl(route2d);
    }
    if (routeGarment) {
      setSelectedGarments([routeGarment]);
      // Llegó desde "Probar en mi Avatar 3D": solo falta tocar "Probar".
      const nonWearable = routeGarment.category === 'Shoes' || routeGarment.category === 'Accessories';
      setSelectionHint(
        nonWearable
          ? t('room.nonWearable')
          : t('room.garmentSelected', { name: routeGarment.name })
      );
    }
  }, [
    props.model_3d_url,
    props.route?.params?.model_3d_url,
    props.image_2d_url,
    props.route?.params?.image_2d_url,
    props.selectedGarment,
    props.route?.params?.selectedGarment,
  ]);

  // Agrupación de prendas
  const topGarments = useMemo(() => 
    cleanedWardrobe.filter((g) => g.category === 'Tops' || g.category === 'Outerwear'), 
  [cleanedWardrobe]);

  const bottomGarments = useMemo(() => 
    cleanedWardrobe.filter((g) => g.category === 'Pants' || g.category === 'Dresses' || (g.category as string) === 'Dress'), 
  [cleanedWardrobe]);

  const shoeGarments = useMemo(() => 
    cleanedWardrobe.filter((g) => g.category === 'Shoes'), 
  [cleanedWardrobe]);

  const accessoryGarments = useMemo(() => 
    cleanedWardrobe.filter((g) => g.category === 'Accessories'), 
  [cleanedWardrobe]);

  // LÓGICA DE SELECCIÓN ÚNICA POR FILA
  const toggleGarmentSelection = (garment: Garment) => {
    setSelectedGarments((prev) => {
      const isSelected = prev.some((g) => g.id === garment.id);
      if (isSelected) {
        return prev.filter((g) => g.id !== garment.id);
      }

      const filtered = prev.filter((g) => {
        const isDress = g.category === 'Dresses' || (g.category as string) === 'Dress';
        const isNewDress = garment.category === 'Dresses' || (garment.category as string) === 'Dress';

        if (isNewDress) {
          if (g.category === 'Tops' || g.category === 'Outerwear' || g.category === 'Pants' || isDress) return false;
        }
        if (garment.category === 'Tops' || garment.category === 'Outerwear') {
          if (g.category === 'Tops' || g.category === 'Outerwear' || isDress) return false;
        }
        if (garment.category === 'Pants') {
          if (g.category === 'Pants' || isDress) return false;
        }
        if (garment.category === 'Shoes' && g.category === 'Shoes') return false;
        if (garment.category === 'Accessories' && g.category === 'Accessories') return false;

        return true;
      });

      return [...filtered, garment];
    });
  };

  const clearSelection = () => {
    setSelectedGarments([]);
  };

  const handleTryOnLook = () => {
    if (selectedGarments.length === 0 || isGenerating) {
      return;
    }
    setOverlayHidden(false);
    setTryOnSuccess(false);

    const candidateHumanImage = avatar_2d_image || '';
    const isExpiredLocalImage =
      candidateHumanImage.startsWith('file://') ||
      candidateHumanImage.startsWith('ph://') ||
      candidateHumanImage.startsWith('content://');
    // Si no hay foto utilizable se envía undefined: el backend usa la foto guardada del usuario (por su token)
    // y, solo si no existe, una imagen de muestra según el género.
    const humanImage = isExpiredLocalImage ? undefined : candidateHumanImage || undefined;

    const garmentPayloads = selectedGarments.map((g) => ({
      image: g.imageUrl || '',
      category:
        g.category === 'Pants'
          ? 'lower_body'
          : (g.category as string) === 'Dresses' || (g.category as string) === 'Dress'
          ? 'dresses'
          : g.category === 'Outerwear'
          ? 'outerwear'
          : g.category === 'Shoes'
          ? 'shoes'
          : g.category === 'Accessories'
          ? 'accessories'
          : 'upper_body',
      name: g.name,
    }));
    // Calzado y accesorios no se visten en 2D (IDM-VTON no los soporta): no cuentan como "faltantes".
    const wearableCount = selectedGarments.filter((g) => g.category !== 'Shoes' && g.category !== 'Accessories').length;
    const totalGarments = selectedGarments.length;
    const userId = userProfile?.id || userProfile?.name;

    const started = startJob({
      kind: 'cascade',
      title: totalGarments > 1 ? t('room.job.multi') : t('room.job.single'),
      thumbnailUri: selectedGarments[0]?.imageUrl,
      run: async ({ signal, report }) => {
        report({ progress: 0.08, phase: 'init', detail: t('room.step.init'), meta: { currentGarmentIndex: 0, totalGarments } });
        const result = await generateWaterfallCascadeTryOn(
          userId,
          humanImage,
          garmentPayloads,
          (info) =>
            report({
              progress: info.progress,
              phase: info.step,
              detail: info.detail,
              meta: { currentGarmentIndex: info.currentGarmentIndex, totalGarments: info.totalGarments ?? totalGarments },
            }),
          signal
        );

        if (result.status !== 'completed' || !result.model_3d_url) {
          throw new Error(result.message || t('room.err.noModel'));
        }
        const appliedGarments = result.total_garments_applied ?? result.steps_completed?.length;
        if (appliedGarments !== undefined && appliedGarments < wearableCount) {
          throw new Error(t('room.err.partial', { applied: appliedGarments, total: wearableCount }));
        }
        return { model_3d_url: result.model_3d_url, final_dressed_image_url: result.final_dressed_image_url };
      },
    });

    if (!started.ok) {
      Alert.alert(t('room.busy.title'), t('room.busy.message'));
    }
  };

  const handleSaveCurrentLook = () => {
    if (selectedGarments.length === 0) {
      Alert.alert(t('room.save.empty.title'), t('room.save.empty.message'));
      return;
    }

    const newLook: SavedLookItem = {
      id: `look-${Date.now()}`,
      title: t('room.look.title', {
        name: selectedGarments[0]?.name ? selectedGarments[0].name.split(' ')[0] : 'Look',
        date: formatDate(new Date(), { day: '2-digit', month: 'short' }),
      }),
      date: formatDate(new Date()),
      garments: [...selectedGarments],
      fitScore: t('room.save.fitScore'),
      paletteTheme: t('room.save.theme', { count: selectedGarments.length }),
      model3dUrl: activeModelUrl || undefined,
      image2dUrl: current2DUrl || selectedGarments[0]?.imageUrl,
    };

    saveLook(newLook);
    Alert.alert(
      t('room.save.done.title'),
      t('room.save.done.message')
    );
  };

  const handleLaunchAddGarment = () => {
    if (props.onOpenAddGarment) {
      props.onOpenAddGarment();
    } else if (props.navigation) {
      props.navigation.navigate('AddGarment');
    }
  };

  const isColorHarmonious = (colorHex?: string | null) => {
    return checkColorHarmony(colorHex, colorimetry_profile?.recommended_colors);
  };

  const ITEM_WIDTH = 130; // Ancho de la tarjeta
  const ITEM_SPACING = Spacing.sm; // Espacio entre tarjetas

  return (
    <View style={styles.container}>
      <VibrantBackground />

      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={[styles.topSection, { paddingTop: insets.top }]}>
          {show2DView && current2DUrl ? (
            <View style={styles.image2DWrapper}>
              <Image
                source={{ uri: current2DUrl }}
                style={styles.image2DFull}
                resizeMode="contain"
              />
              <LiquidGlassView style={styles.badge2D} intensity={80} borderRadius={Radius.pill}>
                <Ionicons name="sparkles" size={13} color={colors.primary} />
                <Text style={styles.badge2DText}>{t('room.badge2d')}</Text>
              </LiquidGlassView>
            </View>
          ) : (
            <View style={[styles.canvasContainer, { backgroundColor: colors.viewer3DBackground }]}>
              <Model3DViewer
                activeModelUrl={activeModelUrl}
                modelUrl={activeModelUrl}
                currentGarmentName={
                  selectedGarments.length > 0
                    ? selectedGarments.map((g) => g.name).join(' + ')
                    : t('room.baseAvatar')
                }
                selectedLayer={
                  selectedGarments.length > 0
                    ? selectedGarments.map((g) => g.category).join(' & ')
                    : 'Cuerpo Base'
                }
                garmentColorHex={selectedGarments[0]?.colorHex || '#8B5CF6'}
                isAvatarMode={!tryOnSuccess && !activeModelUrl}
                avatarGender={userProfile?.gender || gender || 'female'}
                onLoadError={(err) => {
                  console.warn('[FittingRoom] Error al cargar modelo 3D dinámico:', err);
                }}
              />

              {showTouchHint && (
                <Animated.View style={{ opacity: touchHintOpacity, position: 'absolute', bottom: Spacing.md, alignSelf: 'center' }}>
                  <LiquidGlassView style={styles.touchHintBadge} intensity={70} borderRadius={Radius.pill}>
                    <Ionicons name="finger-print-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.touchHintText}>{t('fittingRoom.touchHint')}</Text>
                  </LiquidGlassView>
                </Animated.View>
              )}
            </View>
          )}

          <View style={[styles.floatingControlsTopRight, { top: insets.top + 16 }]}>
            {current2DUrl && (
              <TouchableOpacity onPress={() => setShow2DView(!show2DView)} activeOpacity={0.7}>
                <LiquidGlassView style={styles.toggleBtn} intensity={85} borderRadius={Radius.pill}>
                  <Ionicons
                    name={show2DView ? 'cube-outline' : 'image-outline'}
                    size={16}
                    color={colors.primaryText}
                  />
                  <Text style={[styles.toggleBtnText, { color: colors.primaryText }]}>
                    {show2DView ? t('fittingRoom.view3D') : t('fittingRoom.view2D')}
                  </Text>
                </LiquidGlassView>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bottomSection}>
          <LiquidGlassView style={styles.wardrobeCard} intensity={80} borderRadius={Radius.lg}>
            
            {/* BANDEJA DEL LOOK: OCULTA HASTA QUE HAYA UNA SELECCIÓN */}
            {selectedGarments.length > 0 && (
              <View style={styles.lookTrayContainer}>
                <View style={styles.lookTrayHeader}>
                  <Text style={[styles.lookTrayTitle, { color: colors.primaryText }]}>
                    {t('room.selection')}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.clearActionBtn,
                      { backgroundColor: colors.buttons.dangerSoftBackground },
                    ]}
                    onPress={clearSelection}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.buttons.dangerBackground} />
                    <Text style={[styles.clearActionText, { color: colors.buttons.dangerBackground }]}>{t('room.clear')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.lookTrayBody}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScrollContent}
                  >
                    {selectedGarments.map((g) => (
                      <View
                        key={g.id}
                        style={[
                          styles.garmentChip,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.10)'
                              : 'rgba(0, 0, 0, 0.05)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.18)'
                              : 'rgba(0, 0, 0, 0.10)',
                          },
                        ]}
                      >
                        {g.imageUrl ? (
                          <Image source={{ uri: g.imageUrl }} style={styles.chipThumb} />
                        ) : (
                          <View
                            style={[styles.chipDot, { backgroundColor: g.colorHex || '#8B5CF6' }]}
                          />
                        )}
                        <Text
                          style={[styles.chipText, { color: colors.primaryText }]}
                          numberOfLines={1}
                        >
                          {g.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => toggleGarmentSelection(g)}
                          style={styles.chipRemoveBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.saveLookBtn, { borderColor: colors.borderLight }]}
                      onPress={handleSaveCurrentLook}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="bookmark-outline" size={18} color={colors.primaryText} />
                      <Text style={[styles.saveLookBtnText, { color: colors.primaryText }]}>
                        {t('common.save')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.tryOnLookPrimaryBtn,
                        {
                          backgroundColor: isGenerating
                            ? colors.buttons.accentDisabledBackground
                            : colors.primaryText,
                          opacity: isGenerating ? 0.6 : 1,
                        },
                      ]}
                      onPress={handleTryOnLook}
                      disabled={isGenerating}
                      activeOpacity={0.85}
                    >
                      {isGenerating ? (
                        <ActivityIndicator size="small" color={colors.bg} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={18} color={colors.bg} />
                          <Text style={[styles.tryOnLookBtnText, { color: colors.bg }]}>
                            {selectedGarments.length > 1
                              ? t('room.tryLook', { count: selectedGarments.length })
                              : t('fittingRoom.tryGarment')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* LISTA DE PRENDAS POR FILAS */}
            <View style={{ paddingBottom: Spacing.sm }}>
              {topGarments.length > 0 && (
                <View style={styles.rowSection}>
                  <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{t('room.row.top')}</Text>
                  <FlatList
                    data={topGarments}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.garmentsListContent}
                    keyExtractor={(item) => item.id}
                    snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                    decelerationRate="fast"
                    renderItem={({ item }) => renderGarmentCard(item)}
                  />
                </View>
              )}

              {bottomGarments.length > 0 && (
                <View style={styles.rowSection}>
                  <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{t('room.row.bottom')}</Text>
                  <FlatList
                    data={bottomGarments}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.garmentsListContent}
                    keyExtractor={(item) => item.id}
                    snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                    decelerationRate="fast"
                    renderItem={({ item }) => renderGarmentCard(item)}
                  />
                </View>
              )}

              {shoeGarments.length > 0 && (
                <View style={styles.rowSection}>
                  <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{t('room.row.shoes')}</Text>
                  <FlatList
                    data={shoeGarments}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.garmentsListContent}
                    keyExtractor={(item) => item.id}
                    snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                    decelerationRate="fast"
                    renderItem={({ item }) => renderGarmentCard(item)}
                  />
                </View>
              )}

              {accessoryGarments.length > 0 && (
                <View style={styles.rowSection}>
                  <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{t('room.row.accessories')}</Text>
                  <FlatList
                    data={accessoryGarments}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.garmentsListContent}
                    keyExtractor={(item) => item.id}
                    snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                    decelerationRate="fast"
                    renderItem={({ item }) => renderGarmentCard(item)}
                  />
                </View>
              )}
              
              {cleanedWardrobe.length === 0 && (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }}>
                  <Ionicons name="shirt-outline" size={32} color={colors.tertiaryText} />
                  <Text style={{ fontFamily: Typography.outfit.medium, fontSize: 14, color: colors.secondaryText, marginTop: 8 }}>
                    {t('room.emptyWardrobe')}
                  </Text>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: colors.borderLight, marginTop: 12 }}
                    onPress={handleLaunchAddGarment}
                  >
                    <Text style={{ fontFamily: Typography.outfit.bold, fontSize: 13, color: colors.primaryText }}>{t('room.scanGarment')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </LiquidGlassView>
        </View>
      </ScrollView>

      {selectionHint ? (
        <View pointerEvents="box-none" style={[styles.selectionHintWrap, { top: insets.top + 8 }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectionHint(null)}
            style={[styles.selectionHint, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.selectionHintText, { color: colors.primaryText }]} numberOfLines={3}>
              {selectionHint}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* OVERLAY DE CARGA */}
      {overlayVisible && (
        <View style={styles.generatingOverlay}>
          <LiquidGlassView style={styles.generatingModal} intensity={90} borderRadius={Radius.xl}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.generatingTitle, { color: colors.primaryText }]}>
              {selectedGarments.length > 1 ? t('room.overlay.multi') : t('room.overlay.single')}
            </Text>
            <Text style={[styles.generatingSubtitle, { color: colors.secondaryText }]}>
              {cascadeProgress?.detail || t('room.step.default')}
            </Text>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(10, Math.round((cascadeProgress?.progress || 0.15) * 100)))}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>

            {selectedGarments.length > 0 && (
              <View style={styles.cascadeFlowContainer}>
                <View style={styles.cascadeStepItem}>
                  <Ionicons name="person" size={12} color={colors.primary} />
                  <Text style={[styles.cascadeStepLabel, { color: colors.secondaryText }]}>{t('room.base')}</Text>
                </View>

                {selectedGarments.map((g, idx) => {
                  const isDone = (cascadeProgress?.currentGarmentIndex || 0) > idx;
                  const isCurrent = (cascadeProgress?.currentGarmentIndex || 0) === idx + 1;
                  return (
                    <React.Fragment key={g.id}>
                      <Ionicons
                        name="arrow-forward"
                        size={10}
                        color={isDone ? colors.success : isCurrent ? colors.primary : colors.secondaryText}
                      />
                      <View
                        style={[
                          styles.cascadeStepItem,
                          isCurrent && styles.cascadeStepActive,
                          isCurrent && {
                            backgroundColor: colors.successSubtle,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        {g.imageUrl ? (
                          <Image source={{ uri: g.imageUrl }} style={styles.cascadeStepThumb} />
                        ) : (
                          <View style={[styles.cascadeStepThumb, { backgroundColor: g.colorHex || '#8B5CF6' }]} />
                        )}
                        <Text
                          style={[
                            styles.cascadeStepLabel,
                            { color: isCurrent ? colors.primary : colors.secondaryText, fontWeight: isCurrent ? '700' : '400' },
                          ]}
                          numberOfLines={1}
                        >
                          {g.name.split(' ')[0]}
                        </Text>
                      </View>
                    </React.Fragment>
                  );
                })}

                <Ionicons
                  name="arrow-forward"
                  size={10}
                  color={
                    cascadeProgress?.step?.includes('tripo') || cascadeProgress?.step?.includes('opt')
                      ? '#10B981'
                      : colors.secondaryText
                  }
                />
                <View style={styles.cascadeStepItem}>
                  <Ionicons name="cube" size={12} color="#C084FC" />
                  <Text style={[styles.cascadeStepLabel, { color: colors.secondaryText }]}>3D GLB</Text>
                </View>
              </View>
            )}

            <View style={styles.generatingActions}>
              <WaitActions
                onPlay={() => cascadeJob && openGame(cascadeJob.id)}
                onBackground={() => setOverlayHidden(true)}
                onCancel={() => cascadeJob && cancelJob(cascadeJob.id)}
              />
            </View>
          </LiquidGlassView>
        </View>
      )}

      {/* MODAL DE DETALLE */}
      <Modal
        visible={Boolean(activeGarmentDetail)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActiveGarmentDetail(null)}
      >
        {activeGarmentDetail && (
          <GarmentViewScreen
            garment={activeGarmentDetail}
            onBack={() => setActiveGarmentDetail(null)}
            navigation={navigation}
          />
        )}
      </Modal>
    </View>
  );

  function renderGarmentCard(item: Garment) {
    const isSelected = selectedGarments.some((g) => g.id === item.id);
    const hasColorHarmony = isColorHarmonious(item.colorHex);

    return (
      <TouchableOpacity
        style={[
          styles.garmentCard,
          {
            backgroundColor: isDark ? 'rgba(25, 27, 32, 0.65)' : 'rgba(255, 255, 255, 0.75)',
            borderColor: isSelected ? colors.primaryText : isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
            borderWidth: isSelected ? 2 : 1,
            transform: isSelected ? [{ scale: 1.03 }] : [{ scale: 1.0 }],
          },
        ]}
        onPress={() => toggleGarmentSelection(item)}
        onLongPress={() => setActiveGarmentDetail(item)}
        activeOpacity={0.75}
      >
        <View style={styles.thumbnailFrame}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.garmentThumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.noThumbnailPlaceholder}>
              <Ionicons name="shirt-outline" size={26} color={colors.secondaryText} />
            </View>
          )}

          {isSelected && (
            <View style={[styles.activeCheckBadge, { backgroundColor: colors.primaryText }]}>
              {selectedGarments.length > 1 ? (
                <Text style={[styles.activeCheckNumber, { color: colors.bg }]}>
                  {selectedGarments.findIndex((g) => g.id === item.id) + 1}
                </Text>
              ) : (
                <Ionicons name="checkmark" size={11} color={colors.bg} />
              )}
            </View>
          )}

          <View style={[styles.colorDotBadge, { backgroundColor: item.colorHex }]} />
        </View>

        {/* SOLO NOMBRE Y COLOR (SIN CATEGORÍA) */}
        <View style={styles.cardDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text
              style={[
                styles.cardName,
                { color: colors.primaryText, fontWeight: isSelected ? '700' : '500' },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {hasColorHarmony && (
              <Ionicons name="sparkles" size={11} color={colors.primary} style={{ marginLeft: 3 }} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    height: 480, 
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image2DWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  image2DFull: {
    width: '94%',
    height: '94%',
  },
  badge2D: {
    position: 'absolute',
    bottom: Spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1,
  },
  badge2DText: {
    ...Typography.labelSm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  touchHintBadge: {
    backgroundColor: 'rgba(20, 22, 28, 0.70)',
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  floatingControlsTopRight: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1,
  },
  toggleBtnText: {
    ...Typography.labelSm,
    fontWeight: '600',
  },
  bottomSection: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginTop: -20,
  },
  wardrobeCard: {
    borderRadius: Radius.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    paddingHorizontal: 0, // Importante: 0 para que las cards se pierdan en los bordes laterales
    borderWidth: 1,
    overflow: 'hidden', // Recorta las tarjetas que sobresalen
  },
  lookTrayContainer: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
  },
  lookTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  lookTrayTitle: {
    ...Typography.headlineMd,
    fontSize: 15,
    fontWeight: '700',
  },
  clearActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  clearActionText: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
  },
  lookTrayBody: {
    gap: Spacing.md,
  },
  chipsScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  garmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 8,
    maxWidth: 160,
  },
  chipThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  chipDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  chipText: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipRemoveBtn: {
    marginLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveLookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  saveLookBtnText: {
    ...Typography.labelMd,
    fontSize: 14,
    fontWeight: '600',
  },
  tryOnLookPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.pill,
  },
  tryOnLookBtnText: {
    ...Typography.labelMd,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rowSection: {
    marginTop: Spacing.md,
  },
  rowTitle: {
    ...Typography.headlineMd,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: Spacing.md,
  },
  garmentsListContent: {
    paddingHorizontal: Spacing.md, // Deja un margen para que el primer item no quede pegado
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  garmentCard: {
    width: 130,
    height: 145, // Ligeramente reducido en altura para mejor proporción sin texto inferior
    borderRadius: Radius.lg,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  thumbnailFrame: {
    width: '100%',
    height: 95,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  garmentThumbnail: {
    width: '100%',
    height: '100%',
  },
  noThumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  activeCheckNumber: {
    ...Typography.micro,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  colorDotBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  cardDetails: {
    width: '100%',
    paddingHorizontal: 2,
  },
  cardName: {
    ...Typography.labelSm,
    fontSize: 11.5,
  },
  selectionHintWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: 'center',
  },
  selectionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 420,
  },
  selectionHintText: { flexShrink: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  generatingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 16,
    paddingVertical: Spacing.md,
  },
  generatingModal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    borderWidth: 1,
  },
  generatingActions: {
    width: '100%',
    marginTop: 24,
  },
  generatingBtnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.pill,
  },
  generatingBtnGhost: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  generatingBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  generatingCancel: {
    fontSize: 12,
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
  generatingTitle: {
    ...Typography.title2,
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  generatingSubtitle: {
    ...Typography.bodySm,
    marginTop: 4,
    textAlign: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
  },
  cascadeFlowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
    flexWrap: 'wrap',
  },
  cascadeStepItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  cascadeStepActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  cascadeStepThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
  },
  cascadeStepLabel: {
    ...Typography.micro,
    fontSize: 9,
    maxWidth: 55,
    textAlign: 'center',
  },
});
