import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer, preloadGLTF } from '../components/Model3DViewer';
import { LiquidGlassView } from '../components/LiquidGlassView';
import { VibrantBackground } from '../components/VibrantBackground';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import {
  generateTryOn,
  generateOutfitTryOn,
  generateWaterfallCascadeTryOn,
  CascadeStepProgress,
} from '../services/ai/garmentAnalyzer';
import { Garment, SavedLookItem } from '../types';
import { GarmentViewScreen } from './GarmentViewScreen';
import { isColorHarmonious as checkColorHarmony } from '../utils/colorHarmony';

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
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // FASE 2 & 4: Consumir estado global (Avatar 2D/3D, Colorimetría, Armario, Guardar Look)
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

  // Estado dinámico del modelo 3D generado por la API
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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeGarmentDetail, setActiveGarmentDetail] = useState<Garment | null>(null);

  const initialGarment = props.selectedGarment || props.route?.params?.selectedGarment;
  const [selectedGarments, setSelectedGarments] = useState<Garment[]>(
    initialGarment
      ? [initialGarment]
      : wardrobe_items && wardrobe_items.length > 0
      ? [wardrobe_items[0]]
      : []
  );
  const [tryOnSuccess, setTryOnSuccess] = useState<boolean>(false);
  const [cascadeProgress, setCascadeProgress] = useState<CascadeStepProgress | null>(null);

  // Filtro de categorías del carrusel
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Referencias para debouncing, bloqueo síncrono inmediato y limpieza al desmontar
  const isGeneratingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Limpieza estricta al desmontar para evitar fugas de memoria y llamadas huérfanas
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        console.log('[FittingRoom] Desmontando pantalla: abortando sondeo de cascada...');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Precargar modelo dinámico cuando activeModelUrl cambia
  useEffect(() => {
    if (activeModelUrl) {
      preloadGLTF(activeModelUrl);
    }
  }, [activeModelUrl]);

  // Actualizar si cambian los parámetros de navegación
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
    }
  }, [
    props.model_3d_url,
    props.route?.params?.model_3d_url,
    props.image_2d_url,
    props.route?.params?.image_2d_url,
    props.selectedGarment,
    props.route?.params?.selectedGarment,
  ]);

  // Filtrado de prendas para el carrusel inferior
  const categories = ['Todas', 'Tops', 'Dresses', 'Outerwear', 'Pants', 'Shoes', 'Accessories'];
  const filteredGarments = useMemo(() => {
    if (selectedCategory === 'Todas') return wardrobe_items;
    return wardrobe_items.filter((g) => g.category === selectedCategory);
  }, [wardrobe_items, selectedCategory]);

  // FASE 4: Selección / deselección multi-prenda en cascada (CERO LLAMADAS A API)
  const toggleGarmentSelection = (garment: Garment) => {
    setSelectedGarments((prev) => {
      const exists = prev.some((g) => g.id === garment.id);
      if (exists) {
        return prev.filter((g) => g.id !== garment.id);
      }

      // Filtrar prendas en conflicto sin impedir combinar Chaqueta (Outerwear) + Pantaloneta (Pants) + Top
      let filtered = [...prev];
      const isDress = garment.category === 'Dresses' || (garment.category as string) === 'Dress';

      if (isDress) {
        // Vestido sustituye Tops y Pantalones
        filtered = filtered.filter(
          (g) => g.category !== 'Tops' && g.category !== 'Pants' && g.category !== 'Dresses' && (g.category as string) !== 'Dress'
        );
      } else if (garment.category === 'Pants') {
        // Sustituye solo el pantalón anterior y vestidos
        filtered = filtered.filter(
          (g) => g.category !== 'Pants' && g.category !== 'Dresses' && (g.category as string) !== 'Dress'
        );
      } else if (garment.category === 'Outerwear') {
        // Chaqueta: sustituye solo la chaqueta anterior y vestidos (permite llevar camiseta y pantalón debajo)
        filtered = filtered.filter(
          (g) => g.category !== 'Outerwear' && g.category !== 'Dresses' && (g.category as string) !== 'Dress'
        );
      } else if (garment.category === 'Tops') {
        // Top: sustituye solo el top anterior y vestidos (permite llevar chaqueta encima)
        filtered = filtered.filter(
          (g) => g.category !== 'Tops' && g.category !== 'Dresses' && (g.category as string) !== 'Dress'
        );
      } else {
        // Zapatos, accesorios, etc.
        filtered = filtered.filter((g) => g.category !== garment.category);
      }

      return [...filtered, garment];
    });
  };

  const clearSelection = () => {
    setSelectedGarments([]);
  };

  // FASE 5: Invocar el pipeline en Cascada (Waterfall) 2D -> 3D con protección anti-doble tap
  const handleTryOnLook = async () => {
    // Bloqueo síncrono inmediato: si ya está generando o ref activo, descartar de inmediato
    if (selectedGarments.length === 0 || isGenerating || isGeneratingRef.current) {
      return;
    }
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setTryOnSuccess(false);

    // Cancelar cualquier tarea previa si existiera
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    setCascadeProgress({
      step: 'init',
      progress: 0.08,
      detail: 'Iniciando pipeline de Cascada 2D a 3D...',
      totalGarments: selectedGarments.length,
      currentGarmentIndex: 0,
    });

    // Las URI file:// se invalidan al reinstalar/abrir otra sesión Expo. En ese
    // caso dejamos que el backend resuelva la imagen persistida del usuario.
    const candidateHumanImage = avatar_2d_image || '';
    const isExpiredLocalImage =
      candidateHumanImage.startsWith('file://') ||
      candidateHumanImage.startsWith('ph://') ||
      candidateHumanImage.startsWith('content://');
    const presetHumanImage =
      gender === 'male'
        ? 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80'
        : gender === 'non-binary'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';
    const humanImage = isExpiredLocalImage ? presetHumanImage : candidateHumanImage || presetHumanImage;

    try {
      console.log(
        `[FittingRoom Waterfall] Ejecutando Cascada para look con ${selectedGarments.length} prendas...`
      );
      console.log(
        `[FittingRoom Waterfall] Imagen base: ${isExpiredLocalImage ? 'foto local caducada; se usa imagen preset' : candidateHumanImage ? 'foto del perfil' : 'imagen preset'}.`
      );
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
      garmentPayloads.forEach((garment, index) => {
        console.log(
          `[FittingRoom Waterfall] Entrada ${index + 1}/${garmentPayloads.length}: ${garment.name} -> ${garment.category}, imagen ${garment.image ? 'disponible' : 'faltante'}.`
        );
      });

      // Invocación a la Cascada 2D secuencial y posterior generación 3D unificada con AbortSignal
      const result = await generateWaterfallCascadeTryOn(
        userProfile?.id || userProfile?.name,
        humanImage,
        garmentPayloads,
        (progressInfo) => {
          if (isMountedRef.current) {
            setCascadeProgress(progressInfo);
          }
        },
        currentAbortController.signal
      );

      // Si el componente se desmontó mientras esperaba la respuesta, no actualizar estado
      if (!isMountedRef.current) return;

      if (result.status !== 'completed' || !result.model_3d_url) {
        throw new Error(result.message || 'El servidor no devolvió un modelo 3D para este look.');
      }
      const appliedGarments = result.total_garments_applied ?? result.steps_completed?.length;
      if (appliedGarments !== undefined && appliedGarments < selectedGarments.length) {
        throw new Error(
          `Solo se pudieron aplicar ${appliedGarments} de ${selectedGarments.length} prendas. No se mostró el modelo incompleto.`
        );
      }

      if (result.model_3d_url) {
        console.log('[FittingRoom Waterfall] ¡Modelo 3D unificado recibido del backend!', result.model_3d_url);
        console.log('[FittingRoom Waterfall] Entregando el nuevo GLB al visor 3D del Probador.');
        preloadGLTF(result.model_3d_url);
        // Intercambio fluido (swap) del modelo 3D unificado en el visor Three.js
        setActiveModelUrl(result.model_3d_url);
      }
      if (result.final_dressed_image_url) {
        setCurrent2DUrl(result.final_dressed_image_url);
      }
      setTryOnSuccess(true);
    } catch (err: any) {
      // Si la llamada fue cancelada por salir de pantalla, salir silenciosamente sin alertas
      if (err?.name === 'AbortError' || err?.message?.includes('cancelad') || !isMountedRef.current) {
        console.log('[FittingRoom Waterfall] Operación abortada limpiamente.');
        return;
      }

      console.warn('[FittingRoom Waterfall] Aviso en Cascada de look:', err?.message);
      if (isMountedRef.current) {
        Alert.alert('No se pudo generar el look', err?.message || 'Intenta nuevamente en unos momentos.');
      }
    } finally {
      isGeneratingRef.current = false;
      if (isMountedRef.current) {
        setIsGenerating(false);
        setCascadeProgress(null);
      }
    }
  };

  // Guardar Look generado en looks persistentes
  const handleSaveCurrentLook = () => {
    if (selectedGarments.length === 0) {
      Alert.alert('Selecciona prendas', 'Selecciona al menos una prenda para guardar el look.');
      return;
    }

    const categoriesList = selectedGarments.map((g) => g.category).join(' & ');
    const newLook: SavedLookItem = {
      id: `look-${Date.now()}`,
      title: `Look Atelier ${selectedGarments[0]?.name ? selectedGarments[0].name.split(' ')[0] : 'Look'} (${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })})`,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      garments: [...selectedGarments],
      fitScore: 'Alta Armonía · Calce Atelier',
      paletteTheme: `${selectedGarments.length} piezas en armonía`,
      model3dUrl: activeModelUrl || undefined,
      image2dUrl: current2DUrl || selectedGarments[0]?.imageUrl,
    };

    saveLook(newLook);
    Alert.alert(
      '¡Look Guardado!',
      'Tu conjunto ha sido guardado exitosamente y aparecerá en tus tarjetas de Inicio.'
    );
  };

  const handleResetViewerToAvatar = () => {
    setActiveModelUrl(userAvatar3D);
    if (userAvatar3D) preloadGLTF(userAvatar3D);
    setCurrent2DUrl(undefined);
    setTryOnSuccess(false);
  };

  const handleLaunchAddGarment = () => {
    if (props.onOpenAddGarment) {
      props.onOpenAddGarment();
    } else if (props.navigation) {
      props.navigation.navigate('AddGarment');
    }
  };

  // FASE 3: Comprobación de armonía perceptual con la colorimetría del usuario
  const isColorHarmonious = (colorHex?: string | null) => {
    return checkColorHarmony(colorHex, colorimetry_profile?.recommended_colors);
  };


  return (
    <View style={styles.container}>
      <VibrantBackground />

      {/* SECCIÓN SUPERIOR (60%): Visor 3D y Canvas con OrbitControls */}
      <View style={styles.topSection}>
        {show2DView && current2DUrl ? (
          /* Vista 2D con imagen fusionada VTON */
          <View style={styles.image2DWrapper}>
            <Image
              source={{ uri: current2DUrl }}
              style={styles.image2DFull}
              resizeMode="contain"
            />
            <LiquidGlassView style={styles.badge2D} intensity={80} borderRadius={Radius.pill}>
              <Ionicons name="sparkles" size={13} color="#8EB6C7" />
              <Text style={styles.badge2DText}>Resultado Fusión 2D (IDM-VTON)</Text>
            </LiquidGlassView>
          </View>
        ) : (
          /* Visor 3D estricto con Canvas de @react-three/fiber */
          <View style={styles.canvasContainer}>
            <Model3DViewer
              activeModelUrl={activeModelUrl}
              modelUrl={activeModelUrl}
              currentGarmentName={
                selectedGarments.length > 0
                  ? selectedGarments.map((g) => g.name).join(' + ')
                  : 'Avatar Base'
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

            {/* Guía táctil 360 */}
            <LiquidGlassView style={styles.touchHintBadge} intensity={70} borderRadius={Radius.pill}>
              <Ionicons name="finger-print-outline" size={15} color="#FFFFFF" />
              <Text style={styles.touchHintText}>{t('fittingRoom.touchHint')}</Text>
            </LiquidGlassView>
          </View>
        )}

        {/* Tags Informativos Flotantes Glassmorphism (Top-Left) */}
        {selectedGarments.length > 0 && (
          <LiquidGlassView style={styles.floatingGarmentInfoTag} intensity={85} borderRadius={Radius.lg}>
            <View style={styles.garmentHeaderRow}>
              {selectedGarments.length === 1 && selectedGarments[0] ? (
                <>
                  <View
                    style={[
                      styles.dominantColorCircle,
                      { backgroundColor: selectedGarments[0].colorHex || '#8B5CF6' },
                    ]}
                  />
                  <View style={styles.garmentTextCol}>
                    <Text
                      style={[styles.garmentTagName, { color: colors.primaryText }]}
                      numberOfLines={1}
                    >
                      {selectedGarments[0].name || ''}
                    </Text>
                    <View style={styles.garmentMetaRow}>
                      <Text
                        style={[styles.garmentColorLabel, { color: colors.secondaryText }]}
                      >
                        {selectedGarments[0].category || ''} · {selectedGarments[0].colorName || ''}
                      </Text>
                      {selectedGarments[0].colorHex && isColorHarmonious(selectedGarments[0].colorHex) && (
                        <View style={styles.harmonyTagBadge}>
                          <Ionicons name="sparkles" size={9} color="#8EB6C7" />
                          <Text style={styles.harmonyTagText}>Armonía Color</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.garmentTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="shirt-outline" size={13} color={colors.primaryText} />
                    <Text
                      style={[styles.garmentTagName, { color: colors.primaryText }]}
                      numberOfLines={1}
                    >
                      Look ({selectedGarments.length} piezas)
                    </Text>
                  </View>
                  <View style={styles.garmentMetaRow}>
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                      {selectedGarments.map((g) => (
                        <View
                          key={g.id}
                          style={[styles.multiColorDot, { backgroundColor: g.colorHex }]}
                        />
                      ))}
                    </View>
                    <Text
                      style={[styles.garmentColorLabel, { color: colors.secondaryText }]}
                    >
                      {selectedGarments.map((g) => g.category).join(' + ')}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </LiquidGlassView>
        )}

        {/* Controles Flotantes Superiores (Top-Right): Reset Avatar, Alternar 2D/3D & Añadir Prenda */}
        <View style={styles.floatingControlsTopRight}>
          {avatar_3d_base_url && activeModelUrl !== avatar_3d_base_url && (
            <TouchableOpacity
              onPress={handleResetViewerToAvatar}
              activeOpacity={0.7}
            >
              <LiquidGlassView
                style={styles.avatarResetBtn}
                intensity={85}
                borderRadius={Radius.pill}
              >
                <Ionicons name="person-circle-outline" size={15} color={colors.primaryText} />
                <Text style={[styles.avatarResetText, { color: colors.primaryText }]}>
                  Avatar Base
                </Text>
              </LiquidGlassView>
            </TouchableOpacity>
          )}

          {current2DUrl && (
            <TouchableOpacity
              onPress={() => setShow2DView(!show2DView)}
              activeOpacity={0.7}
            >
              <LiquidGlassView
                style={styles.toggleBtn}
                intensity={85}
                borderRadius={Radius.pill}
              >
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

          <TouchableOpacity
            onPress={handleLaunchAddGarment}
            activeOpacity={0.8}
          >
            <LiquidGlassView
              style={styles.cameraQuickBtn}
              intensity={85}
              borderRadius={18}
            >
              <Ionicons name="camera-outline" size={17} color={colors.primaryText} />
            </LiquidGlassView>
          </TouchableOpacity>
        </View>

        {/* Estado Inmersivo de Carga durante la Fusión VTON en Cascada */}
        {isGenerating && (
          <View style={styles.generatingOverlay}>
            <LiquidGlassView style={styles.generatingModal} intensity={90} borderRadius={Radius.xl}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={[styles.generatingTitle, { color: colors.primaryText }]}>
                {selectedGarments.length > 1 ? 'Aplicando Cascada 2D ➔ 3D' : 'Fusionando Prenda...'}
              </Text>
              <Text style={[styles.generatingSubtitle, { color: colors.secondaryText }]}>
                {cascadeProgress?.detail || 'Componiendo prendas secuencialmente con IDM-VTON...'}
              </Text>

              {/* Barra de progreso animada */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(10, Math.round((cascadeProgress?.progress || 0.15) * 100)))}%`,
                    },
                  ]}
                />
              </View>

              {/* Cadena gráfica secuencial de la cascada: Base -> Prenda 1 -> Prenda 2 -> 3D */}
              {selectedGarments.length > 0 && (
                <View style={styles.cascadeFlowContainer}>
                  <View style={styles.cascadeStepItem}>
                    <Ionicons name="person" size={12} color="#8EB6C7" />
                    <Text style={[styles.cascadeStepLabel, { color: colors.secondaryText }]}>Base</Text>
                  </View>

                  {selectedGarments.map((g, idx) => {
                    const isDone = (cascadeProgress?.currentGarmentIndex || 0) > idx;
                    const isCurrent = (cascadeProgress?.currentGarmentIndex || 0) === idx + 1;
                    return (
                      <React.Fragment key={g.id}>
                        <Ionicons
                          name="arrow-forward"
                          size={10}
                          color={isDone ? '#10B981' : isCurrent ? '#8B5CF6' : colors.secondaryText}
                        />
                        <View style={[styles.cascadeStepItem, isCurrent && styles.cascadeStepActive]}>
                          {g.imageUrl ? (
                            <Image source={{ uri: g.imageUrl }} style={styles.cascadeStepThumb} />
                          ) : (
                            <View style={[styles.cascadeStepThumb, { backgroundColor: g.colorHex || '#8B5CF6' }]} />
                          )}
                          <Text
                            style={[
                              styles.cascadeStepLabel,
                              { color: isCurrent ? '#8B5CF6' : colors.secondaryText, fontWeight: isCurrent ? '700' : '400' },
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
            </LiquidGlassView>
          </View>
        )}
      </View>

      {/* SECCIÓN INFERIOR: Carrusel de Armario con Look Tray y Selección Multi-Prenda */}
      <View style={styles.bottomSection}>
        <LiquidGlassView style={styles.wardrobeCarouselCard} intensity={80} borderRadius={Radius.lg}>
          {/* BANDEJA DEL LOOK (CERO LLAMADAS A API HASTA PRESIONAR "Aplicar Cascada") */}
          <View style={styles.lookTrayContainer}>
            <View style={styles.lookTrayHeader}>
              <View style={styles.lookTrayInfo}>
                <Ionicons name="sparkles" size={13} color="#8EB6C7" />
                <Text style={[styles.lookTrayTitle, { color: colors.primaryText }]}>
                  {selectedGarments.length === 0
                    ? 'Arma tu Look (toca prendas)'
                    : `Look Cascada: ${selectedGarments.length} ${selectedGarments.length === 1 ? 'pieza' : 'piezas'}`}
                </Text>
              </View>

              {selectedGarments.length > 0 && (
                <View style={styles.lookTrayHeaderActions}>
                  <TouchableOpacity
                    style={styles.trayClearBtn}
                    onPress={clearSelection}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.trayClearText, { color: colors.secondaryText }]}>
                      Limpiar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.traySaveBtn, { borderColor: colors.borderLight }]}
                    onPress={handleSaveCurrentLook}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="bookmark-outline" size={12} color={colors.primaryText} />
                    <Text style={[styles.traySaveText, { color: colors.primaryText }]}>
                      Guardar Look
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Chips de prendas seleccionadas y botón Probar Look */}
            {selectedGarments.length > 0 ? (
              <View style={styles.lookTrayBody}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScrollContent}
                >
                  {selectedGarments.map((g, idx) => (
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
                        {selectedGarments.length > 1 ? `${idx + 1}. ${g.name}` : g.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => toggleGarmentSelection(g)}
                        style={styles.chipRemoveBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close-circle" size={14} color={colors.secondaryText} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.tryOnLookPrimaryBtn,
                    {
                      backgroundColor: isGenerating ? 'rgba(139, 92, 246, 0.45)' : colors.primaryText,
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
                      <Ionicons name="sparkles" size={14} color={colors.bg} />
                      <Text style={[styles.tryOnLookBtnText, { color: colors.bg }]}>
                        {selectedGarments.length > 1
                          ? `Aplicar Look en Cascada (${selectedGarments.length})`
                          : `Probar Prenda (1)`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.lookTrayEmptyHint, { color: colors.secondaryText }]}>
                Toca prendas abajo para combinarlas sin llamadas a la API.
              </Text>
            )}
          </View>

          {/* Cabecera del Carrusel */}
          <View style={styles.carouselHeaderRow}>
            <View>
              <Text style={[styles.carouselTitle, { color: colors.primaryText }]}>
                {t('home.yourWardrobe')}
              </Text>
              <Text style={[styles.carouselSubtitle, { color: colors.secondaryText }]}>
                {filteredGarments.length} prendas · Toca para agregar/quitar
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addMiniActionBtn}
              onPress={handleLaunchAddGarment}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={colors.primaryText} />
              <Text style={[styles.addMiniActionText, { color: colors.primaryText }]}>
                Añadir
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filtros de Categoría */}
          <View style={styles.categoriesFilterRow}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catFilterPill,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(255, 255, 255, 0.20)'
                          : 'rgba(0, 0, 0, 0.10)'
                        : 'transparent',
                      borderColor: isActive
                        ? colors.primaryText
                        : isDark
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.catFilterPillText,
                      {
                        color: isActive ? colors.primaryText : colors.secondaryText,
                        fontWeight: isActive ? '700' : '400',
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Carrusel Horizontal de Prendas con Miniaturas 2D */}
          <FlatList
            data={filteredGarments}
            keyExtractor={(item) => item.id}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.garmentsListContent}
            renderItem={({ item }) => {
              const isSelected = selectedGarments.some((g) => g.id === item.id);
              const hasColorHarmony = isColorHarmonious(item.colorHex);

              return (
                <TouchableOpacity
                  style={[
                    styles.garmentCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(25, 27, 32, 0.65)'
                        : 'rgba(255, 255, 255, 0.75)',
                      borderColor: isSelected
                        ? colors.primaryText
                        : isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.08)',
                      borderWidth: isSelected ? 2 : 1,
                      transform: isSelected ? [{ scale: 1.03 }] : [{ scale: 1.0 }],
                    },
                  ]}
                  onPress={() => toggleGarmentSelection(item)}
                  onLongPress={() => setActiveGarmentDetail(item)}
                  activeOpacity={0.75}
                >
                  {/* Miniatura 2D */}
                  <View style={styles.thumbnailFrame}>
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.garmentThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noThumbnailPlaceholder}>
                        <Ionicons name="shirt-outline" size={26} color={colors.secondaryText} />
                      </View>
                    )}

                    {/* Badge de Selección Activa */}
                    {isSelected && (
                      <View
                        style={[
                          styles.activeCheckBadge,
                          { backgroundColor: colors.primaryText },
                        ]}
                      >
                        {selectedGarments.length > 1 ? (
                          <Text style={[styles.activeCheckNumber, { color: colors.bg }]}>
                            {selectedGarments.findIndex((g) => g.id === item.id) + 1}
                          </Text>
                        ) : (
                          <Ionicons name="checkmark" size={11} color={colors.bg} />
                        )}
                      </View>
                    )}

                    {/* Muestra circular de color dominante */}
                    <View
                      style={[
                        styles.colorDotBadge,
                        { backgroundColor: item.colorHex },
                      ]}
                    />
                  </View>

                  {/* Nombre y detalles de prenda */}
                  <View style={styles.cardDetails}>
                    <Text
                      style={[
                        styles.cardName,
                        {
                          color: colors.primaryText,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    <View style={styles.cardBottomRow}>
                      <Text
                        style={[styles.cardCategory, { color: colors.secondaryText }]}
                        numberOfLines={1}
                      >
                        {item.category}
                      </Text>

                      {hasColorHarmony && (
                        <Ionicons
                          name="sparkles"
                          size={11}
                          color="#8EB6C7"
                          style={{ marginLeft: 3 }}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  gap: 6,
                }}
              >
                <Ionicons name="shirt-outline" size={26} color={colors.tertiaryText} />
                <Text
                  style={{
                    fontFamily: Typography.outfit.medium,
                    fontSize: 12,
                    color: colors.secondaryText,
                    textAlign: 'center',
                  }}
                >
                  No hay prendas en tu armario aún.
                </Text>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: Radius.pill,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceSubtle,
                    marginTop: 4,
                  }}
                  onPress={handleLaunchAddGarment}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontFamily: Typography.outfit.bold,
                      fontSize: 11,
                      color: colors.primaryText,
                    }}
                  >
                    + Escanear Prenda
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        </LiquidGlassView>
      </View>

      {/* Modal de Detalle con Visor 3D y Opciones */}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // SECCIÓN SUPERIOR (50%): Visor 3D y Canvas
  topSection: {
    flex: 5,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loaderFallback: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderFallbackText: {
    ...Typography.bodySm,
    marginTop: 8,
    fontWeight: '500',
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
    position: 'absolute',
    bottom: Spacing.md,
    alignSelf: 'center',
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
  // Tags flotantes superiores Glassmorphism
  floatingGarmentInfoTag: {
    position: 'absolute',
    top: 24,
    left: 18,
    maxWidth: 220,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    zIndex: 20,
  },
  garmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dominantColorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  garmentTextCol: {
    flex: 1,
  },
  garmentTagName: {
    ...Typography.labelMd,
    fontWeight: '700',
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  garmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  garmentColorLabel: {
    ...Typography.micro,
    fontSize: 10,
  },
  harmonyTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(142, 182, 199, 0.18)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  harmonyTagText: {
    ...Typography.micro,
    fontSize: 9,
    color: '#8EB6C7',
    fontWeight: '600',
  },
  floatingControlsTopRight: {
    position: 'absolute',
    top: 24,
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
  cameraQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 5,
    borderWidth: 1,
  },
  avatarResetText: {
    ...Typography.micro,
    fontWeight: '600',
    fontSize: 11,
  },
  multiColorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // Modal de carga inmersivo en 3D
  generatingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    padding: Spacing.xl,
  },
  generatingModal: {
    width: '100%',
    maxWidth: 290,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
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
  generatingGarmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  generatingThumbWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  generatingThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  generatingGarmentName: {
    ...Typography.micro,
    fontSize: 11,
    maxWidth: 160,
  },
  // SECCIÓN INFERIOR: Carrusel de Armario & Bandeja del Look
  bottomSection: {
    flex: 5,
    width: '100%',
    paddingHorizontal: 6,
    paddingTop: Spacing.xs,
    paddingBottom: 68,
  },
  wardrobeCarouselCard: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  // BANDEJA DEL LOOK (Multi-prenda)
  lookTrayContainer: {
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  lookTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lookTrayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lookTrayTitle: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lookTrayHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trayClearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  trayClearText: {
    ...Typography.micro,
    fontSize: 10,
  },
  traySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  traySaveText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '600',
  },
  lookTrayBody: {
    gap: 6,
  },
  chipsScrollContent: {
    gap: 6,
    paddingVertical: 2,
  },
  garmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
    maxWidth: 140,
  },
  chipThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  chipDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  chipText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 1,
  },
  chipRemoveBtn: {
    marginLeft: 2,
  },
  lookTrayEmptyHint: {
    ...Typography.micro,
    fontSize: 10,
    fontStyle: 'italic',
    paddingVertical: 2,
  },
  tryOnLookPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    marginTop: 2,
  },
  tryOnLookBtnText: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  carouselHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  carouselTitle: {
    ...Typography.headlineMd,
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  carouselSubtitle: {
    ...Typography.micro,
    fontSize: 10,
    marginTop: 1,
  },
  addMiniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  addMiniActionText: {
    ...Typography.micro,
    fontWeight: '600',
    fontSize: 10,
  },
  categoriesFilterRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
    marginTop: 1,
  },
  catFilterPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  catFilterPillText: {
    ...Typography.micro,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  garmentsListContent: {
    paddingHorizontal: 4,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  garmentCard: {
    width: 120,
    height: 144,
    borderRadius: Radius.lg,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnailFrame: {
    width: '100%',
    height: 86,
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
    top: 5,
    left: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  colorDotBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1.5,
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
    fontSize: 10.5,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  cardCategory: {
    ...Typography.micro,
    fontSize: 9.5,
  },
});
