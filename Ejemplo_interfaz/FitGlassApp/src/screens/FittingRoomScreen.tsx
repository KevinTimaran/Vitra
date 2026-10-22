import React, { Suspense, useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer, preloadGLTF } from '../components/Model3DViewer';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { generateTryOn, getLatestModel } from '../services/ai/garmentAnalyzer';

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

export const FittingRoomScreen: React.FC<FittingRoomScreenProps> = (props) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // FASE 2: Consumir estado global (Onboarding, Avatar 2D/3D, Colorimetría, Armario)
  const {
    avatar_2d_image,
    avatar_3d_base_url,
    colorimetry_profile,
    wardrobe_items,
  } = useUser();

  // Estado dinámico del modelo 3D generado por la API (null = camiseta decorativa local)
  const initial3D =
    props.model_3d_url ||
    props.route?.params?.model_3d_url ||
    null;

  const initial2D =
    props.image_2d_url ||
    props.route?.params?.image_2d_url ||
    undefined;

  const [activeModelUrl, setActiveModelUrl] = useState<string | null>(initial3D);
  const [current2DUrl, setCurrent2DUrl] = useState<string | undefined>(initial2D);
  const [show2DView, setShow2DView] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Prenda seleccionada
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(
    wardrobe_items && wardrobe_items.length > 0 ? wardrobe_items[0] : null
  );

  // Filtro de categorías del carrusel
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

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
    if (route3d) {
      setActiveModelUrl(route3d);
      preloadGLTF(route3d);
    }
    if (route2d) {
      setCurrent2DUrl(route2d);
    }
  }, [props.model_3d_url, props.route?.params?.model_3d_url, props.image_2d_url, props.route?.params?.image_2d_url]);

  // Filtrado de prendas para el carrusel inferior
  const categories = ['Todas', 'Tops', 'Outerwear', 'Pants', 'Shoes'];
  const filteredGarments = useMemo(() => {
    if (selectedCategory === 'Todas') return wardrobe_items;
    return wardrobe_items.filter((g) => g.category === selectedCategory);
  }, [wardrobe_items, selectedCategory]);

  // FASE 2: Flujo Core Generativo de Selección y Fusión VTON + 3D
  const handleSelectGarment = async (garment: Garment) => {
    if (isGenerating) return;
    setSelectedGarment(garment);
    setIsGenerating(true);

    const humanImage =
      avatar_2d_image ||
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';

    const garmentImage =
      garment.imageUrl ||
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';

    const vtonCategory =
      garment.category === 'Outerwear' || garment.category === 'Tops'
        ? 'upper_body'
        : garment.category === 'Pants'
        ? 'lower_body'
        : 'upper_body';

    try {
      console.log('[FittingRoom] Generando Virtual Try-On para:', garment.name);
      const result = await generateTryOn(
        humanImage,
        garmentImage,
        vtonCategory,
        garment.name
      );

      if (result.model_3d_url) {
        console.log('[FittingRoom] Modelo 3D recibido del backend, actualizando visor:', result.model_3d_url);
        setActiveModelUrl(result.model_3d_url);
        preloadGLTF(result.model_3d_url);
      }
      if (result.image_2d_url) {
        setCurrent2DUrl(result.image_2d_url);
      }
    } catch (err: any) {
      console.warn(
        '[FittingRoom] Aviso en TryOn backend:',
        err?.message
      );
      if (garment.imageUrl) {
        setCurrent2DUrl(garment.imageUrl);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchAddGarment = () => {
    if (props.onOpenAddGarment) {
      props.onOpenAddGarment();
    } else if (props.navigation) {
      props.navigation.navigate('AddGarment');
    }
  };

  // FASE 3: Comprobación de armonía con la colorimetría del usuario
  const isColorHarmonious = (colorHex: string) => {
    if (!colorimetry_profile?.recommended_colors) return true;
    const cleanHex = colorHex.trim().toLowerCase();
    return colorimetry_profile.recommended_colors.some(
      (c) => c.toLowerCase() === cleanHex
    );
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
            <GlassCard style={styles.badge2D} intensity={70}>
              <Ionicons name="sparkles" size={13} color="#8EB6C7" />
              <Text style={styles.badge2DText}>Resultado Fusión 2D (IDM-VTON)</Text>
            </GlassCard>
          </View>
        ) : (
          /* Visor 3D estricto con Canvas de @react-three/fiber */
          <View style={styles.canvasContainer}>
            <Model3DViewer
              activeModelUrl={activeModelUrl}
              modelUrl={activeModelUrl}
              currentGarmentName={selectedGarment?.name || 'Prenda Atelier'}
              selectedLayer={selectedGarment?.category || 'Capa 3D'}
              garmentColorHex={selectedGarment?.colorHex || '#8B5CF6'}
              onLoadError={(err) => {
                console.warn('[FittingRoom] Error al cargar modelo 3D dinámico:', err);
              }}
            />

            {/* Guía táctil 360 */}
            <View style={styles.touchHintBadge}>
              <Ionicons name="finger-print-outline" size={15} color="#FFFFFF" />
              <Text style={styles.touchHintText}>{t('fittingRoom.touchHint')}</Text>
            </View>
          </View>
        )}

        {/* Tags Informativos Flotantes Glassmorphism (Top-Left) */}
        {selectedGarment && (
          <GlassCard style={styles.floatingGarmentInfoTag} intensity={65}>
            <View style={styles.garmentHeaderRow}>
              <View
                style={[
                  styles.dominantColorCircle,
                  { backgroundColor: selectedGarment.colorHex },
                ]}
              />
              <View style={styles.garmentTextCol}>
                <Text
                  style={[styles.garmentTagName, { color: colors.primaryText }]}
                  numberOfLines={1}
                >
                  {selectedGarment.name}
                </Text>
                <View style={styles.garmentMetaRow}>
                  <Text
                    style={[styles.garmentColorLabel, { color: colors.secondaryText }]}
                  >
                    {selectedGarment.colorName}
                  </Text>
                  {isColorHarmonious(selectedGarment.colorHex) && (
                    <View style={styles.harmonyTagBadge}>
                      <Ionicons name="sparkles" size={9} color="#8EB6C7" />
                      <Text style={styles.harmonyTagText}>Armonía Color</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Controles Flotantes Superiores (Top-Right): Alternar 2D/3D & Añadir Prenda */}
        <View style={styles.floatingControlsTopRight}>
          {current2DUrl && (
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(20, 22, 28, 0.75)'
                    : 'rgba(255, 255, 255, 0.88)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.18)'
                    : 'rgba(0, 0, 0, 0.10)',
                },
              ]}
              onPress={() => setShow2DView(!show2DView)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={show2DView ? 'cube-outline' : 'image-outline'}
                size={16}
                color={colors.primaryText}
              />
              <Text style={[styles.toggleBtnText, { color: colors.primaryText }]}>
                {show2DView ? t('fittingRoom.view3D') : t('fittingRoom.view2D')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.cameraQuickBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(20, 22, 28, 0.75)'
                  : 'rgba(255, 255, 255, 0.88)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.18)'
                  : 'rgba(0, 0, 0, 0.10)',
              },
            ]}
            onPress={handleLaunchAddGarment}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={17} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        {/* Estado Inmersivo de Carga durante la Fusión VTON */}
        {isGenerating && (
          <View style={styles.generatingOverlay}>
            <GlassCard style={styles.generatingModal} intensity={85}>
              <ActivityIndicator size="large" color={colors.primaryText} />
              <Text style={[styles.generatingTitle, { color: colors.primaryText }]}>
                Fusionando ropa...
              </Text>
              <Text style={[styles.generatingSubtitle, { color: colors.secondaryText }]}>
                IDM-VTON inpainting + Extrusión 3D
              </Text>
              {selectedGarment && (
                <View style={styles.generatingGarmentPreview}>
                  {selectedGarment.imageUrl ? (
                    <Image
                      source={{ uri: selectedGarment.imageUrl }}
                      style={styles.generatingThumb}
                    />
                  ) : null}
                  <Text
                    style={[styles.generatingGarmentName, { color: colors.tertiaryText }]}
                    numberOfLines={1}
                  >
                    {selectedGarment.name}
                  </Text>
                </View>
              )}
            </GlassCard>
          </View>
        )}
      </View>

      {/* SECCIÓN INFERIOR (40%): Carrusel de Armario estilo GlassCard */}
      <View style={styles.bottomSection}>
        <GlassCard style={styles.wardrobeCarouselCard} intensity={60}>
          {/* Cabecera del Carrusel */}
          <View style={styles.carouselHeaderRow}>
            <View>
              <Text style={[styles.carouselTitle, { color: colors.primaryText }]}>
                {t('home.yourWardrobe')}
              </Text>
              <Text style={[styles.carouselSubtitle, { color: colors.secondaryText }]}>
                {filteredGarments.length} prendas · Selecciona para probar
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
              const isSelected = selectedGarment?.id === item.id;
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
                  onPress={() => handleSelectGarment(item)}
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
                        <Ionicons name="checkmark" size={11} color={colors.bg} />
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
          />
        </GlassCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // SECCIÓN SUPERIOR (60%): Visor 3D y Canvas
  topSection: {
    flex: 6,
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
  generatingGarmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
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
  // SECCIÓN INFERIOR (40%): Carrusel de Armario
  bottomSection: {
    flex: 4,
    width: '100%',
    paddingHorizontal: 6,
    paddingTop: Spacing.xs,
    paddingBottom: 68, // Espacio calibrado para que no lo tape la barra inferior
  },
  wardrobeCarouselCard: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  carouselHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  carouselTitle: {
    ...Typography.headlineMd,
    fontSize: 16,
    fontWeight: '700',
  },
  carouselSubtitle: {
    ...Typography.micro,
    fontSize: 11,
    marginTop: 1,
  },
  addMiniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  addMiniActionText: {
    ...Typography.micro,
    fontWeight: '600',
  },
  categoriesFilterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
    marginTop: 2,
  },
  catFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  catFilterPillText: {
    ...Typography.micro,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  garmentsListContent: {
    paddingHorizontal: 4,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  garmentCard: {
    width: 130,
    height: 154,
    borderRadius: Radius.lg,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnailFrame: {
    width: '100%',
    height: 96,
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
  colorDotBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
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
    fontSize: 11,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  cardCategory: {
    ...Typography.micro,
    fontSize: 10,
  },
});
