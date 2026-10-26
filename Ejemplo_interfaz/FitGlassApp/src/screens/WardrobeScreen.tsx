import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';
import { Garment } from '../types';
import { GarmentViewScreen } from './GarmentViewScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

const CATEGORY_FILTERS = [
  { id: 'Todas', label: 'Todas', icon: 'grid-outline' },
  { id: 'Favoritas', label: 'Favoritas', icon: 'heart-outline' },
  { id: 'Outerwear', label: 'Chaquetas', icon: 'layers-outline' },
  { id: 'Tops', label: 'Tops', icon: 'shirt-outline' },
  { id: 'Dresses', label: 'Vestidos', icon: 'woman-outline' },
  { id: 'Pants', label: 'Pantalones', icon: 'reorder-two-outline' },
  { id: 'Shoes', label: 'Calzado', icon: 'footsteps-outline' },
  { id: 'Accessories', label: 'Accesorios', icon: 'sparkles-outline' },
];

export const WardrobeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { wardrobeItems, toggleFavoriteGarment } = useUser();

  const [selectedFilter, setSelectedFilter] = useState<string>('Todas');
  const [activeGarmentDetail, setActiveGarmentDetail] = useState<Garment | null>(null);

  const filteredGarments = useMemo(() => {
    if (!wardrobeItems || wardrobeItems.length === 0) return [];

    if (selectedFilter === 'Todas') {
      return wardrobeItems;
    }
    if (selectedFilter === 'Favoritas') {
      return wardrobeItems.filter((g) => Boolean(g.isFavorite));
    }
    if (selectedFilter === 'Outerwear') {
      return wardrobeItems.filter(
        (g) =>
          g.category === 'Outerwear' ||
          g.silhouetteType === 'jacket' ||
          g.silhouetteType === 'coat'
      );
    }
    if (selectedFilter === 'Tops') {
      return wardrobeItems.filter(
        (g) => g.category === 'Tops' || g.silhouetteType === 'tshirt'
      );
    }
    if (selectedFilter === 'Dresses') {
      return wardrobeItems.filter(
        (g) => g.category === 'Dresses' || (g.category as string) === 'Dress' || g.silhouetteType === 'dress'
      );
    }
    if (selectedFilter === 'Pants') {
      return wardrobeItems.filter(
        (g) => g.category === 'Pants' || g.silhouetteType === 'trousers'
      );
    }
    if (selectedFilter === 'Shoes') {
      return wardrobeItems.filter(
        (g) => g.category === 'Shoes' || g.silhouetteType === 'shoes'
      );
    }
    if (selectedFilter === 'Accessories') {
      return wardrobeItems.filter(
        (g) => g.category === 'Accessories' || g.silhouetteType === 'accessory'
      );
    }
    return wardrobeItems;
  }, [wardrobeItems, selectedFilter]);

  const handleOpenAddGarment = () => {
    if (navigation) {
      navigation.navigate('AddGarment');
    }
  };

  const handleOpenGarmentDetail = (garment: Garment) => {
    console.log('[WardrobeScreen] Abriendo GarmentView para:', garment.name, garment.id);
    setActiveGarmentDetail(garment);
  };

  // CASO A: Armario vacío (al principio antes de generar el primer modelo)
  if (!wardrobeItems || wardrobeItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <VibrantBackground />
        <GlassCard style={styles.emptyCard} intensity={75}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
          >
            <Ionicons name="shirt-outline" size={42} color={colors.primaryText} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>
            {t('wardrobe.title')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
            Aún no tienes prendas en tu colección. Fotografía tu primera prenda de ropa para escanearla y generar su modelo 3D interactivo.
          </Text>
          <View
            style={[
              styles.emptyBadge,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
          >
            <Ionicons name="sparkles" size={12} color="#8EB6C7" />
            <Text style={[styles.emptyBadgeText, { color: colors.tertiaryText }]}>
              BIBLIOTECA 3D · LISTA PARA TU PRIMERA PRENDA
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: colors.cta }]}
            onPress={handleOpenAddGarment}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={19} color={colors.ctaText} />
            <Text style={[styles.emptyAddBtnText, { color: colors.ctaText }]}>
              {t('wardrobe.addGarmentBtn')}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  // CASO B: Biblioteca con prendas guardadas y filtros de clasificación
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <VibrantBackground />

      {/* Cabecera Superior de la Biblioteca */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerSublabel, { color: colors.tertiaryText }]}>
            BIBLIOTECA VIRTUAL
          </Text>
          <Text style={[styles.headerMainTitle, { color: colors.primaryText }]}>
            Mi Armario
          </Text>
          <Text style={[styles.headerCountText, { color: colors.secondaryText }]}>
            {wardrobeItems.length} {wardrobeItems.length === 1 ? 'prenda registrada' : 'prendas registradas'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addTopBtn, { backgroundColor: colors.cta }]}
          onPress={handleOpenAddGarment}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={17} color={colors.ctaText} />
          <Text style={[styles.addTopBtnText, { color: colors.ctaText }]}>Añadir</Text>
        </TouchableOpacity>
      </View>

      {/* Carrusel Horizontal de Filtros / Clasificaciones */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          data={CATEGORY_FILTERS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => {
            const isActive = selectedFilter === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? colors.cta
                      : isDark
                      ? 'rgba(25, 27, 32, 0.65)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isActive
                      ? colors.cta
                      : isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
                onPress={() => setSelectedFilter(item.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={isActive ? colors.ctaText : colors.primaryText}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isActive ? colors.ctaText : colors.primaryText,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Cuadrícula de 2 Columnas de Tarjetas 2D */}
      <FlatList
        data={filteredGarments}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.filterEmptyBox}>
            <Ionicons name="search-outline" size={38} color={colors.tertiaryText} />
            <Text style={[styles.filterEmptyTitle, { color: colors.primaryText }]}>
              Sin prendas en "{selectedFilter}"
            </Text>
            <Text style={[styles.filterEmptyDesc, { color: colors.secondaryText }]}>
              No se encontraron prendas bajo este filtro.
            </Text>
            <TouchableOpacity
              style={[styles.resetFilterBtn, { borderColor: colors.borderLight }]}
              onPress={() => setSelectedFilter('Todas')}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetFilterText, { color: colors.primaryText }]}>
                Ver todas las prendas
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isFav = Boolean(item.isFavorite);
          const has3D = Boolean(item.model3dUrl);

          return (
            <TouchableOpacity
              style={[
                styles.garmentCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(25, 27, 32, 0.70)'
                    : 'rgba(255, 255, 255, 0.90)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.14)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
              onPress={() => handleOpenGarmentDetail(item)}
              activeOpacity={0.82}
            >
              {/* Imagen 2D de la Prenda */}
              <View style={styles.imageFrame}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.garmentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="shirt-outline" size={34} color={colors.tertiaryText} />
                  </View>
                )}

                {/* Badge 3D flotante si ya tiene modelo generado */}
                {has3D && (
                  <View style={styles.badge3D}>
                    <Ionicons name="cube" size={11} color="#8EB6C7" />
                    <Text style={styles.badge3DText}>3D</Text>
                  </View>
                )}

                {/* Botón de Favorito Rápido */}
                <TouchableOpacity
                  style={[
                    styles.favBtn,
                    {
                      backgroundColor: isFav
                        ? 'rgba(239, 68, 68, 0.85)'
                        : isDark
                        ? 'rgba(20, 22, 28, 0.65)'
                        : 'rgba(255, 255, 255, 0.85)',
                    },
                  ]}
                  onPress={() => toggleFavoriteGarment(item.id)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={15}
                    color={isFav ? '#FFFFFF' : colors.primaryText}
                  />
                </TouchableOpacity>
              </View>

              {/* Información de la Tarjeta */}
              <View style={styles.cardInfo}>
                <View style={styles.cardCategoryRow}>
                  <Text style={[styles.cardCategoryText, { color: colors.tertiaryText }]}>
                    {item.category.toUpperCase()}
                  </Text>
                  <View style={[styles.colorDot, { backgroundColor: item.colorHex }]} />
                </View>

                <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={2}>
                  {item.name}
                </Text>

                {item.fit && (
                  <Text style={[styles.cardFitText, { color: colors.secondaryText }]}>
                    Corte: {item.fit}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 70,
  },
  emptyCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  emptyTitle: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 26,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Typography.outfit.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: Spacing.md,
    maxWidth: 290,
  },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  emptyBadgeText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyAddBtnText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerSublabel: {
    fontFamily: Typography.outfit.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerMainTitle: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 28,
    lineHeight: 32,
  },
  headerCountText: {
    fontFamily: Typography.outfit.medium,
    fontSize: 12,
    marginTop: 2,
  },
  addTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  addTopBtnText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 13,
  },
  filtersWrapper: {
    paddingVertical: Spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: Typography.outfit.regular,
    fontSize: 12,
  },
  gridContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 95,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  garmentCard: {
    width: CARD_WIDTH,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageFrame: {
    width: '100%',
    height: CARD_WIDTH * 1.15,
    backgroundColor: 'rgba(0,0,0,0.03)',
    position: 'relative',
    overflow: 'hidden',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge3D: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(20, 22, 28, 0.78)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(142, 182, 199, 0.4)',
  },
  badge3DText: {
    color: '#8EB6C7',
    fontFamily: Typography.outfit.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: Spacing.sm,
  },
  cardCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardCategoryText: {
    fontFamily: Typography.outfit.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  cardFitText: {
    fontFamily: Typography.outfit.regular,
    fontSize: 11,
    marginTop: 2,
  },
  filterEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: Spacing.xs,
  },
  filterEmptyTitle: {
    fontFamily: Typography.bodoni.bold,
    fontSize: 18,
    marginTop: Spacing.sm,
  },
  filterEmptyDesc: {
    fontFamily: Typography.outfit.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  resetFilterText: {
    fontFamily: Typography.outfit.semiBold,
    fontSize: 12,
  },
});
