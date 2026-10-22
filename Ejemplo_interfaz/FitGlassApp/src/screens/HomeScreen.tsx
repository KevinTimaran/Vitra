import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer, preloadGLTF } from '../components/Model3DViewer';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { generateTryOn } from '../services/ai/garmentAnalyzer';
import { Garment } from '../types';
import { GarmentViewScreen } from './GarmentViewScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HomeScreenProps {
  navigation?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // Estado global del usuario
  const {
    userProfile,
    avatarUrl,
    avatar_2d_image,
    avatar_3d_base_url,
    colorimetry_profile,
    wardrobe_items,
    completedOnboarding,
  } = useUser();

  // Consumir del estado global la URL del avatar del usuario (avatar_3d_url)
  const avatar_3d_url = avatar_3d_base_url || avatarUrl || userProfile?.avatar_url || null;

  // 4. Regla de Onboarding Obligatorio: Si el usuario no tiene avatar ni fotos registradas
  const hasAvatarOrPhotos = Boolean(
    avatar_3d_url ||
    userProfile?.bodyPhotoUri ||
    userProfile?.facePhotoUri ||
    completedOnboarding
  );

  useEffect(() => {
    if (!hasAvatarOrPhotos) {
      console.log('[HomeScreen] Usuario sin avatar o fotos base, redirigiendo a Onboarding...');
      if (navigation) {
        navigation.navigate('Welcome');
      }
    }
  }, [hasAvatarOrPhotos, navigation]);

  // Estado dinámico del modelo 3D activo en el visor (Avatar / Try-On)
  const [activeModelUrl, setActiveModelUrl] = useState<string | null>(avatar_3d_url);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeGarmentDetail, setActiveGarmentDetail] = useState<Garment | null>(null);

  // Sincronizar si cambia el avatar global
  useEffect(() => {
    if (avatar_3d_url && !selectedGarment) {
      setActiveModelUrl(avatar_3d_url);
      preloadGLTF(avatar_3d_url);
    }
  }, [avatar_3d_url, selectedGarment]);

  // 5. Interactividad Core: Disparar generateTryOn al tocar cualquier prenda
  const handleQuickTryOn = async (garment: Garment) => {
    if (isGenerating) return;
    setSelectedGarment(garment);
    setIsGenerating(true);

    const humanImage =
      avatar_2d_image ||
      userProfile?.bodyPhotoUri ||
      userProfile?.facePhotoUri ||
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';

    const garmentImage =
      garment.imageUrl ||
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';

    const vtonCategory =
      garment.category === 'Outerwear' || garment.category === 'Tops' || garment.category === 'Accessories'
        ? 'upper_body'
        : garment.category === 'Pants'
        ? 'lower_body'
        : 'upper_body';

    try {
      console.log('[HomeScreen] Generando Quick Try-On para:', garment.name);
      const result = await generateTryOn(
        humanImage,
        garmentImage,
        vtonCategory,
        garment.name
      );

      if (result.model_3d_url) {
        console.log('[HomeScreen] Modelo 3D recibido del backend:', result.model_3d_url);
        setActiveModelUrl(result.model_3d_url);
        preloadGLTF(result.model_3d_url);
      }
    } catch (err: any) {
      console.warn('[HomeScreen] Aviso en Quick TryOn backend:', err?.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Inventario por 4 Filas Categorizadas (Orden Estricto)
  const rows = useMemo(() => {
    const items = wardrobe_items || [];

    // Fila 1: Accesorios superiores (Gorras / Sombreros)
    const row1Accessories = items.filter(
      (g) =>
        g.category === 'Accessories' ||
        g.silhouetteType === 'accessory'
    );

    // Fila 2: Prendas superiores (Chaquetas / Camisetas / Tops)
    const row2Tops = items.filter(
      (g) =>
        g.category === 'Tops' ||
        g.category === 'Outerwear' ||
        g.silhouetteType === 'tshirt' ||
        g.silhouetteType === 'jacket' ||
        g.silhouetteType === 'coat'
    );

    // Fila 3: Prendas inferiores (Pantalones / Faldas)
    const row3Pants = items.filter(
      (g) =>
        g.category === 'Pants' ||
        g.silhouetteType === 'trousers'
    );

    // Fila 4: Calzado (Zapatos / Sneakers)
    const row4Shoes = items.filter(
      (g) =>
        g.category === 'Shoes' ||
        g.silhouetteType === 'shoes'
    );

    return [
      {
        id: 'row-1',
        title: 'ACCESORIOS SUPERIORES',
        subtitle: 'Gorras · Sombreros',
        icon: 'headset-outline',
        data: row1Accessories,
      },
      {
        id: 'row-2',
        title: 'PRENDAS SUPERIORES',
        subtitle: 'Chaquetas · Camisetas · Tops',
        icon: 'shirt-outline',
        data: row2Tops,
      },
      {
        id: 'row-3',
        title: 'PRENDAS INFERIORES',
        subtitle: 'Pantalones · Faldas',
        icon: 'layers-outline',
        data: row3Pants,
      },
      {
        id: 'row-4',
        title: 'CALZADO',
        subtitle: 'Zapatos · Sneakers',
        icon: 'footsteps-outline',
        data: row4Shoes,
      },
    ];
  }, [wardrobe_items]);

  // Si no cuenta con avatar o fotos, bloquear interacción y forzar redirección
  if (!hasAvatarOrPhotos) {
    return (
      <View style={styles.container}>
        <VibrantBackground />
        <View style={styles.onboardingBlockedOverlay}>
          <GlassCard style={styles.onboardingBlockedCard} intensity={85}>
            <View
              style={[
                styles.onboardingBlockedIconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
            >
              <Ionicons name="finger-print-outline" size={44} color={colors.primaryText} />
            </View>
            <Text style={[styles.onboardingBlockedTitle, { color: colors.primaryText }]}>
              Identidad Biométrica Requerida
            </Text>
            <Text style={[styles.onboardingBlockedDesc, { color: colors.secondaryText }]}>
              Para desplegar tu Avatar 3D y habilitar el probador virtual con tu silueta milimétrica, completa tu calibración inicial.
            </Text>
            <TouchableOpacity
              style={[styles.onboardingBlockedBtn, { backgroundColor: colors.primaryText }]}
              onPress={() => navigation?.navigate('Welcome')}
              activeOpacity={0.8}
            >
              <Text style={[styles.onboardingBlockedBtnText, { color: colors.bg }]}>
                Iniciar Calibración Biométrica
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.bg} />
            </TouchableOpacity>
          </GlassCard>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VibrantBackground />

      {/* SECCIÓN SUPERIOR (55%): Visor 3D Avatar-First con OrbitControls / PanResponder 360 */}
      <View style={styles.topViewerSection}>
        <Model3DViewer
          activeModelUrl={activeModelUrl}
          modelUrl={activeModelUrl}
          currentGarmentName={selectedGarment?.name || 'Silueta Avatar'}
          selectedLayer={selectedGarment?.category || 'Avatar 3D'}
          garmentColorHex={selectedGarment?.colorHex || '#8B5CF6'}
          onLoadError={(err) => {
            console.warn('[HomeScreen] Error al cargar modelo 3D:', err);
          }}
        />

        {/* Floating Top Header: Avatar Status & Quick Actions */}
        <View style={styles.floatingHeaderBar}>
          <View
            style={[
              styles.avatarStatusBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(20, 22, 28, 0.75)'
                  : 'rgba(255, 255, 255, 0.85)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.18)'
                  : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            <View style={styles.onlineDot} />
            <Text style={[styles.avatarStatusText, { color: colors.primaryText }]}>
              {userProfile?.name ? userProfile.name.split(' ')[0] : 'Avatar'} · Silueta 3D
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[
                styles.actionGlassBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(20, 22, 28, 0.75)'
                    : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.18)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
              onPress={() =>
                navigation?.navigate('FittingRoom', {
                  model_3d_url: activeModelUrl || undefined,
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={14} color="#8EB6C7" />
              <Text style={[styles.actionGlassBtnText, { color: colors.primaryText }]}>
                Probador
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionGlassIconBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(20, 22, 28, 0.75)'
                    : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.18)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
              onPress={() => navigation?.navigate('AddGarment')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.primaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tag Flotante de Prenda Activa */}
        {selectedGarment && (
          <GlassCard style={styles.floatingActiveGarmentCard} intensity={65}>
            <View style={styles.activeGarmentRow}>
              <View
                style={[
                  styles.activeGarmentColorDot,
                  { backgroundColor: selectedGarment.colorHex },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.activeGarmentName, { color: colors.primaryText }]}
                  numberOfLines={1}
                >
                  {selectedGarment.name}
                </Text>
                <Text
                  style={[styles.activeGarmentCategory, { color: colors.secondaryText }]}
                  numberOfLines={1}
                >
                  {selectedGarment.category} · {selectedGarment.colorName}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Guía táctil 360 */}
        <View style={styles.touchHintBadge}>
          <Ionicons name="finger-print-outline" size={14} color="#FFFFFF" />
          <Text style={styles.touchHintText}>ARRASTRA PARA ROTAR 360°</Text>
        </View>

        {/* Modal Inmersivo durante Fusión Try-On */}
        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <GlassCard style={styles.loadingModal} intensity={85}>
              <ActivityIndicator size="large" color={colors.primaryText} />
              <Text style={[styles.loadingTitle, { color: colors.primaryText }]}>
                Fusionando con tu Avatar...
              </Text>
              <Text style={[styles.loadingSubtitle, { color: colors.secondaryText }]}>
                IDM-VTON 2D + Generación 3D
              </Text>
              {selectedGarment && (
                <View style={styles.loadingGarmentBadge}>
                  {selectedGarment.imageUrl ? (
                    <Image
                      source={{ uri: selectedGarment.imageUrl }}
                      style={styles.loadingGarmentThumb}
                    />
                  ) : null}
                  <Text
                    style={[styles.loadingGarmentName, { color: colors.tertiaryText }]}
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

      {/* SECCIÓN INFERIOR (45%): Inventario por Filas Categorizadas estilo GlassCard */}
      <View style={styles.bottomInventorySection}>
        <GlassCard style={styles.inventoryGlassCard} intensity={65}>
          {/* Cabecera del Inventario */}
          <View style={styles.inventoryHeaderRow}>
            <View>
              <Text style={[styles.inventoryTitle, { color: colors.primaryText }]}>
                Tu Armario Inteligente
              </Text>
              <Text style={[styles.inventorySubtitle, { color: colors.secondaryText }]}>
                Toca cualquier prenda para probar al instante sobre tu silueta
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.addQuickPill,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
              onPress={() => navigation?.navigate('Wardrobe')}
              activeOpacity={0.7}
            >
              <Text style={[styles.addQuickPillText, { color: colors.primaryText }]}>
                Ver Todo
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primaryText} />
            </TouchableOpacity>
          </View>

          {/* ScrollView Vertical que aloja las 4 Filas Estrictas */}
          <ScrollView
            style={styles.rowsVerticalScroll}
            contentContainerStyle={styles.rowsVerticalContent}
            showsVerticalScrollIndicator={false}
          >
            {rows.map((row) => (
              <View key={row.id} style={styles.categoryRowBlock}>
                {/* Título sutil de la fila */}
                <View style={styles.rowTitleRow}>
                  <Text style={[styles.rowCategoryTitle, { color: colors.primaryText }]}>
                    {row.title}
                  </Text>
                  <Text style={[styles.rowCountLabel, { color: colors.tertiaryText }]}>
                    {row.data.length} {row.data.length === 1 ? 'prenda' : 'prendas'}
                  </Text>
                </View>

                {/* Scroll Horizontal de Tarjetas Cuadradas Pequeñas 2D */}
                {row.data.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalRowContent}
                  >
                    {row.data.map((garment) => {
                      const isSelected = selectedGarment?.id === garment.id;

                      return (
                        <TouchableOpacity
                          key={garment.id}
                          style={[
                            styles.garmentSquareCard,
                            {
                              backgroundColor: isDark
                                ? 'rgba(25, 27, 32, 0.65)'
                                : 'rgba(255, 255, 255, 0.80)',
                              borderColor: isSelected
                                ? colors.primaryText
                                : isDark
                                ? 'rgba(255, 255, 255, 0.14)'
                                : 'rgba(0, 0, 0, 0.08)',
                              borderWidth: isSelected ? 2 : 1,
                              transform: isSelected ? [{ scale: 1.04 }] : [{ scale: 1.0 }],
                            },
                          ]}
                          onPress={() => setActiveGarmentDetail(garment)}
                          onLongPress={() => handleQuickTryOn(garment)}
                          activeOpacity={0.75}
                        >
                          {/* Miniatura 2D */}
                          {garment.imageUrl ? (
                            <Image
                              source={{ uri: garment.imageUrl }}
                              style={styles.squareThumbImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.squarePlaceholder}>
                              <Ionicons
                                name="shirt-outline"
                                size={22}
                                color={colors.secondaryText}
                              />
                            </View>
                          )}

                          {/* Badge de Selección Activa */}
                          {isSelected && (
                            <View
                              style={[
                                styles.selectedCheckBadge,
                                { backgroundColor: colors.primaryText },
                              ]}
                            >
                              <Ionicons name="checkmark" size={10} color={colors.bg} />
                            </View>
                          )}

                          {/* Punto de Color Dominante */}
                          <View
                            style={[
                              styles.dominantColorDot,
                              { backgroundColor: garment.colorHex },
                            ]}
                          />

                          {/* Nombre sutil inferior */}
                          <View style={styles.garmentMiniInfo}>
                            <Text
                              style={[
                                styles.garmentMiniName,
                                {
                                  color: colors.primaryText,
                                  fontWeight: isSelected ? '700' : '500',
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {garment.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyRowBox}>
                    <Text style={[styles.emptyRowText, { color: colors.tertiaryText }]}>
                      Sin prendas registradas en esta categoría.
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </GlassCard>
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
  // SECCIÓN SUPERIOR (55%): Visor 3D
  topViewerSection: {
    flex: 5.5,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  floatingHeaderBar: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  avatarStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 7,
    borderWidth: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  avatarStatusText: {
    ...Typography.labelSm,
    fontWeight: '700',
    fontSize: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1,
  },
  actionGlassBtnText: {
    ...Typography.labelSm,
    fontWeight: '600',
    fontSize: 12,
  },
  actionGlassIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  floatingActiveGarmentCard: {
    position: 'absolute',
    top: 68,
    left: 16,
    maxWidth: 240,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    zIndex: 20,
  },
  activeGarmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeGarmentColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeGarmentName: {
    ...Typography.labelSm,
    fontWeight: '700',
    fontSize: 12,
  },
  activeGarmentCategory: {
    ...Typography.micro,
    fontSize: 10,
    marginTop: 1,
  },
  touchHintBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 22, 28, 0.70)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 10,
  },
  touchHintText: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
    fontSize: 9,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    padding: Spacing.xl,
  },
  loadingModal: {
    width: '100%',
    maxWidth: 280,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  loadingTitle: {
    ...Typography.headlineMd,
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  loadingSubtitle: {
    ...Typography.micro,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingGarmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  loadingGarmentThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  loadingGarmentName: {
    ...Typography.micro,
    fontSize: 11,
    maxWidth: 150,
  },

  // SECCIÓN INFERIOR (45%): Inventario categorizado en 4 filas
  bottomInventorySection: {
    flex: 4.5,
    width: '100%',
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 72, // Calibrado para la barra flotante inferior
  },
  inventoryGlassCard: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingTop: Spacing.sm,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  inventoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  inventoryTitle: {
    ...Typography.headlineMd,
    fontSize: 15,
    fontWeight: '700',
  },
  inventorySubtitle: {
    ...Typography.micro,
    fontSize: 10,
    marginTop: 1,
  },
  addQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  addQuickPillText: {
    ...Typography.micro,
    fontWeight: '600',
    fontSize: 11,
  },
  rowsVerticalScroll: {
    flex: 1,
  },
  rowsVerticalContent: {
    paddingBottom: 24,
    gap: 12,
  },
  categoryRowBlock: {
    width: '100%',
  },
  rowTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    marginBottom: 6,
  },
  rowCategoryTitle: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  rowCountLabel: {
    ...Typography.micro,
    fontSize: 10,
  },
  horizontalRowContent: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: 'center',
  },
  garmentSquareCard: {
    width: 86,
    height: 104,
    borderRadius: Radius.md,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  squareThumbImage: {
    width: 78,
    height: 74,
    borderRadius: Radius.sm,
  },
  squarePlaceholder: {
    width: 78,
    height: 74,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  dominantColorDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 5,
  },
  garmentMiniInfo: {
    width: '100%',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  garmentMiniName: {
    ...Typography.micro,
    fontSize: 9,
    textAlign: 'center',
  },
  emptyRowBox: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyRowText: {
    ...Typography.micro,
    fontSize: 10,
    fontStyle: 'italic',
  },
  onboardingBlockedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  onboardingBlockedCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  onboardingBlockedIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  onboardingBlockedTitle: {
    ...Typography.headlineMd,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  onboardingBlockedDesc: {
    ...Typography.callout,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  onboardingBlockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    width: '100%',
  },
  onboardingBlockedBtnText: {
    ...Typography.labelSm,
    fontWeight: '700',
    fontSize: 13,
  },
});
