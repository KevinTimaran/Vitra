import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Animated,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';
import { Model3DViewer } from '../components/Model3DViewer';
import { Garment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { getLatestModel } from '../services/ai/garmentAnalyzer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_NOTES_CHARS = 160;

interface GarmentViewScreenProps {
  route?: {
    params?: {
      garment?: Garment;
    };
  };
  navigation?: any;
  garment?: Garment;
  onBack?: () => void;
  onTryOn?: (garment: Garment) => void;
  onEdit?: (garment: Garment) => void;
  onView3D?: (garment: Garment) => void;
}

export const GarmentViewScreen: React.FC<GarmentViewScreenProps> = (props) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const {
    removeGarmentFromWardrobe,
    toggleFavoriteGarment,
    wardrobeItems,
    addGarmentToWardrobe,
  } = useUser();

  const passedGarment = props.garment || props.route?.params?.garment;
  // Buscar en estado global actualizado si existe
  const liveGarment = wardrobeItems.find((g) => g.id === passedGarment?.id) || passedGarment;

  const garment: Garment = liveGarment || {
    id: 'unknown',
    name: 'Prenda no encontrada',
    category: 'Tops',
    colorName: 'Carbón',
    colorHex: '#2C2C2C',
    size: 'M',
    fit: 'Regular',
    brand: 'Atelier',
    material: 'Algodón orgánico',
    addedDate: 'Hoy',
    notes: '',
    silhouetteType: 'tshirt',
    paletteHarmony: true,
  };

  const [resolvedModelUrl, setResolvedModelUrl] = useState<string | null>(
    garment.model3dUrl || null
  );
  const [isFullscreen3D, setIsFullscreen3D] = useState<boolean>(false);
  const [notesText, setNotesText] = useState<string>(garment.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);

  // Animación suave de entrada y desvanecimiento temporal para la guía táctil 360°
  const hintAnim = useRef(new Animated.Value(0)).current;
  const hintTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (garment.model3dUrl) {
      setResolvedModelUrl(garment.model3dUrl);
    } else {
      // Si la prenda no tiene la URL 3D guardada o no terminó de sincronizarse,
      // recuperar el último modelo 3D real generado en el servidor
      getLatestModel()
        .then((latest) => {
          if (latest?.model_3d_url) {
            console.log('[GarmentView] Modelo 3D recuperado del backend:', latest.model_3d_url);
            setResolvedModelUrl(latest.model_3d_url);
            if (garment.id && garment.id !== 'unknown') {
              addGarmentToWardrobe({
                ...garment,
                model3dUrl: latest.model_3d_url,
              });
            }
          }
        })
        .catch((err) => {
          console.warn('[GarmentView] No se pudo recuperar último modelo:', err);
        });
    }
  }, [garment.model3dUrl]);

  const active3DUrl = resolvedModelUrl || garment.model3dUrl || null;
  const has3D = Boolean(active3DUrl);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>(
    has3D ? '3D' : garment.imageUrl ? '2D' : '3D'
  );

  useEffect(() => {
    if (has3D) {
      setViewMode('3D');
    }
  }, [has3D]);

  // Animación temporal para la insignia "Arrastra para rotar 360°"
  useEffect(() => {
    if (viewMode === '3D') {
      hintAnim.setValue(0);
      hintTranslateY.setValue(8);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(hintAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(hintTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(3500),
        Animated.parallel([
          Animated.timing(hintAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(hintTranslateY, {
            toValue: -8,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [viewMode]);

  // Sincronizar notas si cambian desde la prenda externa
  useEffect(() => {
    if (garment.notes !== undefined && !isEditingNotes) {
      setNotesText(garment.notes || '');
    }
  }, [garment.notes]);

  const isFavorite = Boolean(garment.isFavorite);

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else if (props.navigation?.canGoBack()) {
      props.navigation.goBack();
    }
  };

  const handleToggleFavorite = () => {
    toggleFavoriteGarment(garment.id);
  };

  const handleSaveNotes = () => {
    const trimmed = notesText.trim();
    if (garment.id && garment.id !== 'unknown') {
      addGarmentToWardrobe({
        ...garment,
        notes: trimmed,
      });
    }
    setIsEditingNotes(false);
  };

  const handleDelete = () => {
    Alert.alert(
      '¿Eliminar prenda?',
      `¿Estás seguro de que deseas eliminar "${garment.name}" de tu armario digital? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeGarmentFromWardrobe(garment.id);
            handleBack();
          },
        },
      ]
    );
  };

  const handleTryOnAvatar = () => {
    if (props.onTryOn) {
      props.onTryOn(garment);
      return;
    }
    if (props.navigation) {
      props.navigation.navigate('MainTabs', {
        screen: 'FittingRoom',
        params: {
          selectedGarment: garment,
          model_3d_url: active3DUrl || garment.model3dUrl,
          image_2d_url: garment.image2dUrl || garment.imageUrl,
        },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <VibrantBackground />

      {/* 2. Barra Superior Flotante Glassmorphism con Bordes Redondeados */}
      <View style={styles.headerBarWrapper}>
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: isDark
                ? 'rgba(25, 27, 32, 0.72)'
                : 'rgba(255, 255, 255, 0.82)',
              borderColor: colors.borderLight,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.headerCircleBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primaryText} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerSubtitle, { color: colors.tertiaryText }]}>
              {garment.category.toUpperCase()} · DETALLE
            </Text>
            <Text style={[styles.headerTitle, { color: colors.primaryText }]} numberOfLines={1}>
              {garment.name}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.headerCircleBtn,
              { backgroundColor: isFavorite ? 'rgba(239, 68, 68, 0.15)' : colors.surfaceSubtle },
            ]}
            onPress={handleToggleFavorite}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#EF4444' : colors.primaryText}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Visor Principal Hero (3D interactivo o Fotografía 2D) */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark
                  ? 'rgba(25, 27, 32, 0.75)'
                  : 'rgba(255, 255, 255, 0.90)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.14)'
                  : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            {viewMode === '3D' ? (
              <View style={styles.viewer3DContainer}>
                <Model3DViewer
                  activeModelUrl={active3DUrl}
                  modelUrl={active3DUrl}
                  currentGarmentName={garment.name}
                  garmentColorHex={garment.colorHex}
                  selectedLayer={garment.category}
                />

                {/* 1. Botón para ver en Pantalla Completa */}
                <TouchableOpacity
                  style={[
                    styles.fullscreenHeroBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(20, 22, 28, 0.75)'
                        : 'rgba(255, 255, 255, 0.88)',
                      borderColor: colors.borderLight,
                    },
                  ]}
                  onPress={() => setIsFullscreen3D(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="scan-outline" size={15} color={colors.primaryText} />
                  <Text style={[styles.fullscreenHeroBtnText, { color: colors.primaryText }]}>
                    Pantalla completa
                  </Text>
                </TouchableOpacity>

                {/* 3. Guía táctil animada que desaparece a los pocos segundos */}
                <Animated.View
                  style={[
                    styles.touchHintBadge,
                    {
                      opacity: hintAnim,
                      transform: [{ translateY: hintTranslateY }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Ionicons name="finger-print-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.touchHintText}>Arrastra para rotar 360°</Text>
                </Animated.View>
              </View>
            ) : garment.imageUrl ? (
              <View style={styles.photo2DContainer}>
                <Image
                  source={{ uri: garment.imageUrl }}
                  style={styles.photo2DImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.viewer3DContainer}>
                <Model3DViewer
                  currentGarmentName={garment.name}
                  garmentColorHex={garment.colorHex}
                />
              </View>
            )}

            {/* Selector Flotante 3D / 2D si la prenda tiene modelo tridimensional o foto */}
            {(has3D || garment.imageUrl) && (
              <View style={styles.viewModeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.viewModePill,
                    viewMode === '3D'
                      ? { backgroundColor: colors.cta, borderColor: colors.cta }
                      : { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  ]}
                  onPress={() => setViewMode('3D')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="cube-outline"
                    size={14}
                    color={viewMode === '3D' ? colors.ctaText : colors.primaryText}
                  />
                  <Text
                    style={[
                      styles.viewModePillText,
                      { color: viewMode === '3D' ? colors.ctaText : colors.primaryText },
                    ]}
                  >
                    Modelo 3D
                  </Text>
                </TouchableOpacity>

                {Boolean(garment.imageUrl) && (
                  <TouchableOpacity
                    style={[
                      styles.viewModePill,
                      viewMode === '2D'
                        ? { backgroundColor: colors.cta, borderColor: colors.cta }
                        : { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                    ]}
                    onPress={() => setViewMode('2D')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="image-outline"
                      size={14}
                      color={viewMode === '2D' ? colors.ctaText : colors.primaryText}
                    />
                    <Text
                      style={[
                        styles.viewModePillText,
                        { color: viewMode === '2D' ? colors.ctaText : colors.primaryText },
                      ]}
                    >
                      Foto 2D
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Bloque Informativo de la Prenda */}
        <View style={styles.detailsContainer}>
          {/* Título y Marca */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.garmentCategoryBadge, { color: colors.tertiaryText }]}>
                {garment.category.toUpperCase()} · REGISTRADA EL {garment.addedDate}
              </Text>
              <Text style={[styles.garmentName, { color: colors.primaryText }]}>
                {garment.name}
              </Text>
            </View>
          </View>

          {/* Chips de Especificaciones Rápidas (Nota: la TALLA fue removida por solicitud) */}
          <View style={styles.pillsRow}>
            {/* Color */}
            <View
              style={[
                styles.specPill,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View style={[styles.colorSwatchDot, { backgroundColor: garment.colorHex }]} />
              <Text style={[styles.specPillText, { color: colors.primaryText }]}>
                {garment.colorName}
              </Text>
            </View>

            {/* Corte / Fit */}
            {garment.fit && (
              <View
                style={[
                  styles.specPill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                ]}
              >
                <Ionicons name="resize-outline" size={13} color={colors.secondaryText} />
                <Text style={[styles.specPillText, { color: colors.primaryText }]}>
                  {garment.fit}
                </Text>
              </View>
            )}

            {/* Estilo recomendado */}
            {garment.style && (
              <View
                style={[
                  styles.specPill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                ]}
              >
                <Ionicons name="sparkles-outline" size={13} color="#8EB6C7" />
                <Text style={[styles.specPillText, { color: colors.primaryText }]}>
                  {garment.style}
                </Text>
              </View>
            )}
          </View>

          {/* 4. Sección de Notas con límite de caracteres (Reemplaza a la talla) */}
          <GlassCard style={styles.notesCard} intensity={60}>
            <View style={styles.notesHeaderRow}>
              <View style={styles.notesTitleBox}>
                <Ionicons name="document-text-outline" size={16} color={colors.primaryText} />
                <Text style={[styles.notesCardTitle, { color: colors.primaryText }]}>
                  Notas & Observaciones
                </Text>
              </View>
              <Text
                style={[
                  styles.notesCounter,
                  {
                    color:
                      notesText.length >= MAX_NOTES_CHARS ? '#EF4444' : colors.tertiaryText,
                  },
                ]}
              >
                {notesText.length} / {MAX_NOTES_CHARS}
              </Text>
            </View>

            <TextInput
              style={[
                styles.notesInput,
                {
                  color: colors.primaryText,
                  backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)',
                  borderColor: isEditingNotes ? colors.cta : colors.borderLight,
                },
              ]}
              placeholder="Añade notas sobre combinaciones, cuidados o procedencia..."
              placeholderTextColor={colors.tertiaryText}
              value={notesText}
              onChangeText={(text) => {
                if (text.length <= MAX_NOTES_CHARS) {
                  setNotesText(text);
                  setIsEditingNotes(true);
                }
              }}
              maxLength={MAX_NOTES_CHARS}
              multiline
              numberOfLines={3}
              onBlur={handleSaveNotes}
            />

            {isEditingNotes && (
              <TouchableOpacity
                style={[styles.saveNotesBtn, { backgroundColor: colors.cta }]}
                onPress={handleSaveNotes}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.ctaText} />
                <Text style={[styles.saveNotesBtnText, { color: colors.ctaText }]}>
                  Guardar nota
                </Text>
              </TouchableOpacity>
            )}
          </GlassCard>

          {/* Tarjeta de Detalles y Materiales */}
          <GlassCard style={styles.cardDetails} intensity={60}>
            <View style={styles.cardDetailsHeader}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primaryText} />
              <Text style={[styles.cardDetailsTitle, { color: colors.primaryText }]}>
                Ficha Técnica & Análisis
              </Text>
            </View>

            <View style={styles.metaField}>
              <Text style={[styles.metaFieldLabel, { color: colors.tertiaryText }]}>
                DETALLES & CAÍDA
              </Text>
              <Text style={[styles.metaFieldValue, { color: colors.secondaryText }]}>
                {garment.details ||
                  garment.material ||
                  'Análisis de textura e iluminación generado por Gemini Vision.'}
              </Text>
            </View>

            {garment.occasion && (
              <View style={[styles.metaField, { marginTop: Spacing.sm }]}>
                <Text style={[styles.metaFieldLabel, { color: colors.tertiaryText }]}>
                  OCASIÓN RECOMENDADA
                </Text>
                <Text style={[styles.metaFieldValue, { color: colors.secondaryText }]}>
                  {garment.occasion}
                </Text>
              </View>
            )}

            {garment.model3dUrl && (
              <View style={[styles.metaField, { marginTop: Spacing.sm }]}>
                <Text style={[styles.metaFieldLabel, { color: colors.tertiaryText }]}>
                  ESTADO 3D
                </Text>
                <View style={styles.modelStatusBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={[styles.modelStatusText, { color: '#10B981' }]}>
                    Malla GLB optimizada con rotación táctil activa
                  </Text>
                </View>
              </View>
            )}
          </GlassCard>

          {/* Botón de Eliminación */}
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: 'rgba(239, 68, 68, 0.35)' }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Eliminar prenda del armario</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 2. Barra Inferior Flotante Glassmorphism con Bordes Redondeados */}
      <View style={styles.bottomActionBarWrapper}>
        <View
          style={[
            styles.bottomActionBar,
            {
              backgroundColor: isDark
                ? 'rgba(22, 25, 30, 0.82)'
                : 'rgba(255, 255, 255, 0.90)',
              borderColor: colors.borderLight,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.tryOnButton, { backgroundColor: colors.cta }]}
            onPress={handleTryOnAvatar}
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={18} color={colors.ctaText} />
            <Text style={[styles.tryOnButtonText, { color: colors.ctaText }]}>
              Probar en mi Avatar 3D
            </Text>
            <Ionicons name="sparkles" size={15} color={colors.ctaText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Modal Inmersivo de Pantalla Completa para el Modelo 3D */}
      <Modal
        visible={isFullscreen3D}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsFullscreen3D(false)}
      >
        <View style={styles.fullscreenModalContainer}>
          <StatusBar barStyle="light-content" />

          {/* Visor 3D cubriendo el 100% de la pantalla */}
          <View style={styles.fullscreenCanvasWrapper}>
            <Model3DViewer
              activeModelUrl={active3DUrl}
              modelUrl={active3DUrl}
              currentGarmentName={garment.name}
              garmentColorHex={garment.colorHex}
              selectedLayer={garment.category}
            />
          </View>

          {/* Cabecera Flotante Inmersiva con Botón de Salir */}
          <SafeAreaView style={styles.fullscreenSafeArea} pointerEvents="box-none">
            <View style={styles.fullscreenHeaderBar} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.fullscreenCloseBtn}
                onPress={() => setIsFullscreen3D(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="contract-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.fullscreenHeaderInfo} pointerEvents="none">
                <Text style={styles.fullscreenSubtitle}>
                  {garment.category.toUpperCase()} · VISTA INMERSIVA 360°
                </Text>
                <Text style={styles.fullscreenTitle} numberOfLines={1}>
                  {garment.name}
                </Text>
              </View>

              <View style={{ width: 42 }} pointerEvents="none" />
            </View>
          </SafeAreaView>

          {/* Insignia inferior táctil */}
          <View style={styles.fullscreenBottomHint} pointerEvents="none">
            <Ionicons name="sync-outline" size={14} color="#8EB6C7" />
            <Text style={styles.fullscreenBottomHintText}>
              Giro táctil 360° con inercia e inspección milimétrica
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Barra Superior Flotante con Bordes Redondeados y Estilo Glass
  headerBarWrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
    paddingBottom: Spacing.xs,
    zIndex: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerSubtitle: {
    fontFamily: Typography.outfit.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontFamily: Typography.bodoni.semiBold,
    fontSize: 16,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  heroCard: {
    width: '100%',
    height: 380,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewer3DContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photo2DContainer: {
    width: '100%',
    height: '100%',
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo2DImage: {
    width: '100%',
    height: '100%',
  },
  // Botón Flotante de Pantalla Completa dentro de la tarjeta
  fullscreenHeroBtn: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  fullscreenHeroBtnText: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 11,
  },
  // Insignia animada que desaparece
  touchHintBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  touchHintText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  viewModeToggleRow: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    zIndex: 10,
    alignSelf: 'center',
  },
  viewModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  viewModePillText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 12,
  },
  detailsContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  garmentCategoryBadge: {
    fontFamily: Typography.outfit.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  garmentName: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 24,
    lineHeight: 30,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  colorSwatchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  specPillText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
  },
  // Sección de Notas Personales con Límite de Caracteres
  notesCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  notesTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesCardTitle: {
    fontFamily: Typography.outfit.bold,
    fontSize: 13,
  },
  notesCounter: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  notesInput: {
    fontFamily: Typography.outfit.regular,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    textAlignVertical: 'top',
    marginTop: Spacing.xs,
  },
  saveNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
  },
  saveNotesBtnText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 11,
  },
  cardDetails: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  cardDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cardDetailsTitle: {
    fontFamily: Typography.outfit.bold,
    fontSize: 14,
  },
  metaField: {
    marginTop: Spacing.xs,
  },
  metaFieldLabel: {
    fontFamily: Typography.outfit.bold,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaFieldValue: {
    fontFamily: Typography.outfit.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  modelStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  modelStatusText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontFamily: Typography.outfit.semiBold,
    fontSize: 13,
  },
  // Barra Inferior Flotante con Bordes Redondeados y Estilo Glass
  bottomActionBarWrapper: {
    position: 'absolute',
    bottom: 24,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 30,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  tryOnButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  tryOnButtonText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  // Estilos del Modal de Pantalla Completa Inmersiva
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#0A0C10',
    position: 'relative',
  },
  fullscreenCanvasWrapper: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  fullscreenSafeArea: {
    zIndex: 20,
  },
  fullscreenHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  fullscreenCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenHeaderInfo: {
    alignItems: 'center',
  },
  fullscreenSubtitle: {
    fontFamily: Typography.outfit.bold,
    fontSize: 9,
    color: '#8EB6C7',
    letterSpacing: 1.4,
  },
  fullscreenTitle: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 2,
  },
  fullscreenBottomHint: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(10, 12, 16, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  fullscreenBottomHintText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
    color: '#E2E8F0',
    letterSpacing: 0.3,
  },
});
