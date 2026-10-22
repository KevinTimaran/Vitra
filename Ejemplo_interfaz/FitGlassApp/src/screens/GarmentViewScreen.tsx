import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { removeGarmentFromWardrobe, toggleFavoriteGarment, wardrobeItems } = useUser();

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
    silhouetteType: 'tshirt',
    paletteHarmony: true,
  };

  const has3D = Boolean(garment.model3dUrl);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>(has3D ? '3D' : '2D');
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
    Alert.alert(
      'Simulación en Avatar 3D',
      `Esta función adaptará y modelará "${garment.name}" en 3D directamente sobre la silueta tridimensional de tu avatar personal.\n\n(Módulo en preparación para la siguiente fase).`,
      [
        {
          text: 'Probar en Probador',
          onPress: () => {
            if (props.navigation) {
              props.navigation.navigate('MainTabs', {
                screen: 'FittingRoom',
                params: {
                  model_3d_url: garment.model3dUrl,
                  image_2d_url: garment.image2dUrl || garment.imageUrl,
                },
              });
            }
          },
        },
        { text: 'Entendido', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <VibrantBackground />

      {/* Cabecera Superior Glassmorphism */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.headerCircleBtn, { backgroundColor: colors.surfaceSubtle }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primaryText} />
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
            size={22}
            color={isFavorite ? '#EF4444' : colors.primaryText}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Visor Principal Hero (3D interactivo o Fotografía 2D) */}
        <View style={styles.heroSection}>
          <GlassCard style={styles.heroCard} intensity={70}>
            {viewMode === '3D' && garment.model3dUrl ? (
              <View style={styles.viewer3DContainer}>
                <Model3DViewer
                  activeModelUrl={garment.model3dUrl}
                  currentGarmentName={garment.name}
                  garmentColorHex={garment.colorHex}
                />
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
              <View style={styles.placeholderContainer}>
                <Ionicons name="shirt-outline" size={72} color={colors.tertiaryText} />
                <Text style={[styles.placeholderText, { color: colors.secondaryText }]}>
                  Sin imagen disponible
                </Text>
              </View>
            )}

            {/* Selector Flotante 3D / 2D si la prenda tiene modelo tridimensional */}
            {has3D && (
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
              </View>
            )}
          </GlassCard>
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

          {/* Chips de Especificaciones Rápidas */}
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

            {/* Talla */}
            {garment.size && (
              <View
                style={[
                  styles.specPill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.specPillLabel, { color: colors.tertiaryText }]}>TALLA</Text>
                <Text style={[styles.specPillText, { color: colors.primaryText }]}>
                  {garment.size}
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
                {garment.details || garment.material || 'Análisis de textura e iluminación generado por Gemini Vision.'}
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

      {/* Barra Inferior Flotante de Acción: "Probar en Avatar" */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: isDark ? 'rgba(18, 20, 24, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.tryOnButton, { backgroundColor: colors.cta }]}
          onPress={handleTryOnAvatar}
          activeOpacity={0.85}
        >
          <Ionicons name="person-outline" size={19} color={colors.ctaText} />
          <Text style={[styles.tryOnButtonText, { color: colors.ctaText }]}>
            Probar en mi Avatar 3D
          </Text>
          <Ionicons name="sparkles" size={16} color={colors.ctaText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    paddingBottom: 110,
  },
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  heroCard: {
    height: 380,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewer3DContainer: {
    ...StyleSheet.absoluteFill,
  },
  photo2DContainer: {
    ...StyleSheet.absoluteFill,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo2DImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  placeholderText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 13,
  },
  viewModeToggleRow: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    zIndex: 10,
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
  specPillLabel: {
    fontFamily: Typography.outfit.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  specPillText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
  },
  cardDetails: {
    marginTop: Spacing.lg,
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
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontFamily: Typography.outfit.semiBold,
    fontSize: 13,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tryOnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 15,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  tryOnButtonText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
