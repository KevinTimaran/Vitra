import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Model3DViewer } from '../components/Model3DViewer';
import { SavedLookItem, Garment } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface SavedLookScreenProps {
  route?: {
    params?: {
      look?: SavedLookItem;
    };
  };
  navigation?: any;
  look?: SavedLookItem;
  onBack?: () => void;
  onTryAgain?: (look: SavedLookItem) => void;
  onEditLook?: (look: SavedLookItem) => void;
  onRemoveLook?: (id: string) => void;
  onSelectGarment?: (garment: Garment) => void;
}

export const SavedLookScreen: React.FC<SavedLookScreenProps> = (props) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    removeLook,
    toggleFavoriteLook,
    updateLookCategory,
    lookCategories,
    addLookCategory,
    avatarUrl,
    gender,
    savedLooks,
  } = useUser();

  const initialLook = props.look || props.route?.params?.look;
  // Sincronizar con el look más reciente en contexto si existe
  const look = savedLooks.find((l) => l.id === initialLook?.id) || initialLook;

  const [activeViewMode, setActiveViewMode] = useState<'3d' | '2d'>('3d');
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else if (props.navigation?.canGoBack()) {
      props.navigation.goBack();
    }
  };

  const handleTryAgain = () => {
    if (!look) return;
    if (props.onTryAgain) {
      props.onTryAgain(look);
    } else if (props.navigation) {
      props.navigation.navigate('FittingRoom', {
        model_3d_url: look.model3dUrl || avatarUrl,
        image_2d_url: look.image2dUrl,
      });
    }
  };

  const handleToggleFavorite = () => {
    if (!look) return;
    toggleFavoriteLook(look.id);
  };

  const handleConfirmDelete = () => {
    if (!look) return;
    Alert.alert(
      '¿Eliminar este look?',
      'Esta acción eliminará el modelo y su composición de tu colección.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (props.onRemoveLook) {
              props.onRemoveLook(look.id);
            } else {
              removeLook(look.id);
              if (props.navigation?.canGoBack()) {
                props.navigation.goBack();
              }
            }
          },
        },
      ]
    );
  };

  const handleSelectCategory = (cat: string) => {
    if (!look) return;
    updateLookCategory(look.id, cat);
    setShowCategoryModal(false);
  };

  const handleCreateNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    addLookCategory(trimmed);
    if (look) {
      updateLookCategory(look.id, trimmed);
    }
    setNewCategoryName('');
    setIsCreatingCategory(false);
    setShowCategoryModal(false);
  };

  if (!look) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <View style={styles.topHeaderBar}>
          <TouchableOpacity onPress={handleBack} style={styles.headerIconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Detalle de Look</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.errorTitle, { color: colors.primaryText }]}>
            No se encontró el modelo
          </Text>
          <PrimaryButton label="Volver" onPress={handleBack} style={{ marginTop: Spacing.lg }} />
        </View>
      </View>
    );
  }

  const modelUrl = look.model3dUrl || avatarUrl || null;
  const isFavorite = Boolean(look.isFavorite);
  const currentCategory = look.category || 'Elegante';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Cabecera Superior con Safe Area Insets (Inmune a Dynamic Island) */}
      <View
        style={[
          styles.topHeaderBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? 'rgba(15, 17, 21, 0.85)' : 'rgba(249, 249, 247, 0.92)',
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.headerIconButton, { backgroundColor: colors.surfaceSubtle }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]} numberOfLines={1}>
            {look.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
            {currentCategory} · {look.date}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleToggleFavorite}
          style={[
            styles.headerIconButton,
            {
              backgroundColor: isFavorite ? '#FEE2E2' : colors.surfaceSubtle,
            },
          ]}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Contenedor del Visor 3D / Preview 2D */}
        <GlassCard style={styles.viewerCanvasCard} intensity={25}>
          {activeViewMode === '3d' ? (
            <View style={styles.viewer3DWrapper}>
              <Model3DViewer
                activeModelUrl={modelUrl}
                modelUrl={modelUrl}
                currentGarmentName={look.title}
                selectedLayer="Look Completo"
                garmentColorHex={look.garments?.[0]?.colorHex || '#8B5CF6'}
                isAvatarMode={false}
                avatarGender={gender || 'female'}
                onLoadError={(err) => {
                  console.warn('[SavedLookScreen] Aviso 3D:', err);
                }}
              />
              <View style={styles.hintBadge}>
                <Ionicons name="finger-print-outline" size={13} color="#FFFFFF" />
                <Text style={styles.hintBadgeText}>ARRASTRA PARA ROTAR 360°</Text>
              </View>
            </View>
          ) : (
            <View style={styles.viewer2DWrapper}>
              {look.image2dUrl ? (
                <Image
                  source={{ uri: look.image2dUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.empty2DPlaceholder}>
                  <Ionicons name="shirt-outline" size={48} color={colors.secondaryText} />
                  <Text style={[styles.empty2DText, { color: colors.secondaryText }]}>
                    Vista 2D no disponible para este look
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Selector de Modo 3D / 2D en esquina inferior */}
          {look.image2dUrl ? (
            <View style={styles.viewModeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  activeViewMode === '3d' && styles.viewModeBtnActive,
                  { backgroundColor: activeViewMode === '3d' ? colors.primaryText : 'rgba(0,0,0,0.6)' },
                ]}
                onPress={() => setActiveViewMode('3d')}
              >
                <Ionicons
                  name="cube-outline"
                  size={14}
                  color={activeViewMode === '3d' ? colors.bg : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.viewModeBtnText,
                    { color: activeViewMode === '3d' ? colors.bg : '#FFFFFF' },
                  ]}
                >
                  3D
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  activeViewMode === '2d' && styles.viewModeBtnActive,
                  { backgroundColor: activeViewMode === '2d' ? colors.primaryText : 'rgba(0,0,0,0.6)' },
                ]}
                onPress={() => setActiveViewMode('2d')}
              >
                <Ionicons
                  name="image-outline"
                  size={14}
                  color={activeViewMode === '2d' ? colors.bg : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.viewModeBtnText,
                    { color: activeViewMode === '2d' ? colors.bg : '#FFFFFF' },
                  ]}
                >
                  2D
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </GlassCard>

        {/* Tarjeta de Categoría y Metadatos Básicos */}
        <GlassCard style={styles.infoGlassCard} intensity={20}>
          <View style={styles.categoryHeaderRow}>
            <View>
              <Text style={[styles.metaSectionLabel, { color: colors.secondaryText }]}>
                CATEGORÍA DEL MODELO
              </Text>
              <View style={styles.categoryBadgeRow}>
                <View style={[styles.categoryPill, { backgroundColor: colors.surfaceSubtle }]}>
                  <Ionicons name="pricetag-outline" size={13} color={colors.primaryText} />
                  <Text style={[styles.categoryPillText, { color: colors.primaryText }]}>
                    {currentCategory}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.changeCategoryBtn, { borderColor: colors.borderLight }]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={14} color={colors.primaryText} />
              <Text style={[styles.changeCategoryBtnText, { color: colors.primaryText }]}>
                Cambiar Categoría
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.metaMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.secondaryText }]}>Armonía</Text>
              <Text style={[styles.metricValue, { color: colors.primaryText }]}>
                {look.fitScore || '94% Match'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.secondaryText }]}>Paleta</Text>
              <Text style={[styles.metricValue, { color: colors.primaryText }]} numberOfLines={1}>
                {look.paletteTheme || 'Neutral Elegance'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.secondaryText }]}>Prendas</Text>
              <Text style={[styles.metricValue, { color: colors.primaryText }]}>
                {look.garments?.length || 0} piezas
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Sección: Prendas que usa el modelo */}
        <View style={styles.garmentsSectionHeader}>
          <Ionicons name="shirt-outline" size={18} color={colors.primaryText} />
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            Prendas que usa el modelo ({look.garments?.length || 0})
          </Text>
        </View>

        {look.garments && look.garments.length > 0 ? (
          look.garments.map((garment, idx) => (
            <GlassCard key={garment.id || idx} style={styles.garmentItemCard} intensity={18}>
              <View style={styles.garmentItemRow}>
                {garment.imageUrl ? (
                  <Image source={{ uri: garment.imageUrl }} style={styles.garmentThumb} />
                ) : (
                  <View
                    style={[
                      styles.garmentThumbPlaceholder,
                      { backgroundColor: garment.colorHex || colors.surfaceSubtle },
                    ]}
                  >
                    <Ionicons name="shirt" size={24} color="#FFFFFF" />
                  </View>
                )}

                <View style={styles.garmentItemInfo}>
                  <Text style={[styles.garmentName, { color: colors.primaryText }]} numberOfLines={1}>
                    {garment.name}
                  </Text>
                  <Text style={[styles.garmentSubInfo, { color: colors.secondaryText }]} numberOfLines={1}>
                    {garment.category || 'Prenda'} · {garment.brand || 'Vitra Atelier'}
                  </Text>
                  <View style={styles.garmentColorRow}>
                    <View
                      style={[
                        styles.colorSwatchDot,
                        { backgroundColor: garment.colorHex || '#8B5CF6' },
                      ]}
                    />
                    <Text style={[styles.colorSwatchText, { color: colors.secondaryText }]}>
                      {garment.colorName || garment.colorHex || 'Color Atelier'}
                      {garment.fit ? ` · Corte ${garment.fit}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          ))
        ) : (
          <GlassCard style={styles.emptyGarmentsCard} intensity={15}>
            <Text style={[styles.emptyGarmentsText, { color: colors.secondaryText }]}>
              Silueta base personalizada de atelier sin prendas individuales asociadas.
            </Text>
          </GlassCard>
        )}

        {/* Botones de Acción */}
        <View style={styles.actionButtonsContainer}>
          <PrimaryButton
            label="Probar en Probador Virtual"
            onPress={handleTryAgain}
            icon="sparkles"
          />

          <SecondaryButton
            label={isFavorite ? 'Quitar de Favoritos' : 'Guardar en Favoritos'}
            onPress={handleToggleFavorite}
            icon={isFavorite ? 'heart' : 'heart-outline'}
            style={{ marginTop: Spacing.sm }}
          />

          <TouchableOpacity
            style={styles.deleteLookButton}
            onPress={handleConfirmDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteLookButtonText}>Eliminar Look</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal para Cambiar o Crear Categoría */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContentCard} intensity={85}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                Categorizar Modelo
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
              Selecciona una categoría o crea una nueva para clasificar este modelo 3D.
            </Text>

            {/* Lista de categorías disponibles */}
            <ScrollView style={styles.categoriesModalScroll} showsVerticalScrollIndicator={false}>
              {lookCategories
                .filter((c) => c !== 'Todos')
                .map((cat) => {
                  const isSelected = currentCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOptionItem,
                        {
                          backgroundColor: isSelected
                            ? colors.primaryText
                            : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => handleSelectCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          { color: isSelected ? colors.bg : colors.primaryText },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {cat}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.bg} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            {/* Sección para crear nueva categoría */}
            {isCreatingCategory ? (
              <View style={styles.createCategoryInputRow}>
                <TextInput
                  style={[
                    styles.newCategoryTextInput,
                    {
                      color: colors.primaryText,
                      borderColor: colors.borderLight,
                      backgroundColor: colors.surfaceSubtle,
                    },
                  ]}
                  placeholder="Nombre de nueva categoría..."
                  placeholderTextColor={colors.secondaryText}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.confirmCreateBtn, { backgroundColor: colors.primaryText }]}
                  onPress={handleCreateNewCategory}
                >
                  <Ionicons name="checkmark" size={18} color={colors.bg} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelCreateBtn, { backgroundColor: colors.surfaceSubtle }]}
                  onPress={() => {
                    setIsCreatingCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  <Ionicons name="close" size={18} color={colors.primaryText} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addNewCategoryPillBtn, { borderColor: colors.borderLight }]}
                onPress={() => setIsCreatingCategory(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primaryText} />
                <Text style={[styles.addNewCategoryPillText, { color: colors.primaryText }]}>
                  Crear Nueva Categoría
                </Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.subhead,
    fontFamily: Typography.bodoni.bold,
    fontSize: 17,
  },
  headerSubtitle: {
    ...Typography.micro,
    fontSize: 11,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  viewerCanvasCard: {
    height: 330,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  viewer3DWrapper: {
    flex: 1,
  },
  viewer2DWrapper: {
    flex: 1,
    position: 'relative',
  },
  empty2DPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  empty2DText: {
    ...Typography.caption,
  },
  hintBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 22, 28, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  hintBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  viewModeToggleRow: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 6,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  viewModeBtnActive: {},
  viewModeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoGlassCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaSectionLabel: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  changeCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  changeCategoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  metaMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    ...Typography.micro,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  garmentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subhead,
    fontFamily: Typography.bodoni.bold,
    fontSize: 16,
  },
  garmentItemCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  garmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  garmentThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: '#EEEEEE',
  },
  garmentThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentItemInfo: {
    flex: 1,
  },
  garmentName: {
    ...Typography.subhead,
    fontWeight: '600',
    fontSize: 14,
  },
  garmentSubInfo: {
    ...Typography.micro,
    fontSize: 12,
    marginTop: 2,
  },
  garmentColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  colorSwatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorSwatchText: {
    ...Typography.micro,
    fontSize: 11,
  },
  emptyGarmentsCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyGarmentsText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  deleteLookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  deleteLookButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    ...Typography.headline,
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContentCard: {
    width: '100%',
    maxHeight: 460,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    ...Typography.headline,
    fontSize: 18,
  },
  modalSubtitle: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  categoriesModalScroll: {
    maxHeight: 200,
    marginBottom: Spacing.md,
  },
  categoryOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginBottom: 6,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addNewCategoryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addNewCategoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createCategoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  newCategoryTextInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  confirmCreateBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCreateBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
