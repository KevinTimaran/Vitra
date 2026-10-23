import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer } from '../components/Model3DViewer';
import { GlassCard } from '../components/GlassCard';
import { VibrantBackground } from '../components/VibrantBackground';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { SavedLookItem, Garment } from '../types';
import { SavedLookScreen } from './SavedLookScreen';
import { GarmentViewScreen } from './GarmentViewScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HomeScreenProps {
  navigation?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Estado global del usuario desde UserContext
  const {
    userProfile,
    avatarUrl,
    avatar_3d_base_url,
    savedLooks,
    removeLook,
    gender,
    lookCategories,
    addLookCategory,
    updateLookCategory,
    toggleFavoriteLook,
  } = useUser();

  const avatar_3d_url = avatar_3d_base_url || avatarUrl || userProfile?.avatar_url || null;

  // Filtro de categorías activo en Home
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Referencia al ScrollView y botón flotante para volver arriba
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const scrollTopAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scrollTopAnim, {
      toValue: showScrollTop ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();
  }, [showScrollTop]);

  // Modal para ver más información / detalle del look en otra pantalla
  const [selectedSavedLookDetail, setSelectedSavedLookDetail] = useState<SavedLookItem | null>(null);

  // Modal para detalle de prenda individual si se requiere
  const [activeGarmentDetail, setActiveGarmentDetail] = useState<Garment | null>(null);

  // Modal para crear nueva categoría
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Modal para cambiar categoría de un look específico
  const [editingLookCategory, setEditingLookCategory] = useState<SavedLookItem | null>(null);

  // Filtro de looks según la categoría seleccionada
  const filteredLooks = useMemo(() => {
    if (selectedCategory === 'Todos') {
      return savedLooks;
    }
    return savedLooks.filter(
      (look) => (look.category || 'Elegante').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [savedLooks, selectedCategory]);

  // Manejo de creación de nueva categoría
  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert('Categoría vacía', 'Por favor ingresa un nombre para la categoría.');
      return;
    }
    addLookCategory(trimmed);
    setSelectedCategory(trimmed);
    if (editingLookCategory) {
      updateLookCategory(editingLookCategory.id, trimmed);
      setEditingLookCategory(null);
    }
    setNewCategoryName('');
    setCategoryModalVisible(false);
  };

  const handleOpenFittingRoomWithLook = (look: SavedLookItem) => {
    if (navigation) {
      navigation.navigate('FittingRoom', {
        model_3d_url: look.model3dUrl || avatar_3d_url || undefined,
        image_2d_url: look.image2dUrl,
      });
    }
  };

  const handleDeleteLook = (lookId: string) => {
    Alert.alert(
      '¿Eliminar Look?',
      'Esta acción eliminará el modelo 3D y su conjunto de tu colección.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => removeLook(lookId),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <VibrantBackground />

      <ScrollView
        ref={scrollViewRef}
        style={styles.mainScrollView}
        contentContainerStyle={[
          styles.mainScrollContent,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: insets.bottom + 95,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          const shouldShow = offsetY > 260;
          if (shouldShow !== showScrollTop) {
            setShowScrollTop(shouldShow);
          }
        }}
      >
        {/* Cabecera Superior: Marca Atelier y Acciones Rápidas (Segura ante Dynamic Island) */}
        <View style={styles.topHeader}>
          <View style={styles.brandTitleContainer}>
            <View style={styles.brandBadgePill}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.brandBadgeText, { color: colors.secondaryText }]}>
                VITRA ATELIER · 3D
              </Text>
            </View>
            <Text style={[styles.brandWordmark, { color: colors.primaryText }]}>VITRA</Text>
            <Text style={[styles.greetingSubtitle, { color: colors.secondaryText }]}>
              {userProfile?.name ? `Colección de ${userProfile.name.split(' ')[0]}` : 'Probador & Modelos 3D'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => navigation?.navigate('FittingRoom')}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={15} color="#8EB6C7" />
              <Text style={[styles.headerActionBtnText, { color: colors.primaryText }]}>
                Probador
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerActionIconBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => navigation?.navigate('AddGarment')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.primaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Categorización con chips horizontales y botón de Crear Categoría */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesSectionHeader}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              Avatares 3D ({selectedCategory === 'Todos' ? filteredLooks.length + 1 : filteredLooks.length})
            </Text>
            <TouchableOpacity
              style={styles.newCategoryHeaderLink}
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.newCategoryHeaderLinkText, { color: colors.primary }]}>
                Nueva Categoría
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesChipsScroll}
          >
            {lookCategories.map((category) => {
              const isSelected = selectedCategory.toLowerCase() === category.toLowerCase();
              const categoryCount =
                category === 'Todos'
                  ? savedLooks.length + 1
                  : savedLooks.filter(
                      (l) => (l.category || 'Elegante').toLowerCase() === category.toLowerCase()
                    ).length;

              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryText
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.75)',
                      borderColor: isSelected
                        ? colors.primaryText
                        : colors.borderLight,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? colors.bg : colors.primaryText,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {category}
                  </Text>
                  <View
                    style={[
                      styles.categoryCountBadge,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(255,255,255,0.22)'
                          : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryCountText,
                        { color: isSelected ? colors.bg : colors.secondaryText },
                      ]}
                    >
                      {categoryCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Chip de Crear Categoría (+) */}
            <TouchableOpacity
              style={[
                styles.addCategoryChip,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                },
              ]}
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={15} color={colors.primaryText} />
              <Text style={[styles.addCategoryChipText, { color: colors.primaryText }]}>
                Crear categoría
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Feed de Tarjetas de Modelos 3D (Cards) */}
        <View style={styles.cardsFeedContainer}>
          {/* 1. MODELO PRINCIPAL (POR DEFECTO O DEL USUARIO) - PRIMERO EN LA LISTA */}
          {selectedCategory === 'Todos' && (
            <GlassCard style={styles.model3DCard} intensity={isDark ? 30 : 50}>
              {/* Visor 3D Embebido del Modelo Principal / Gemelo Digital */}
              <View style={styles.cardViewerWrapper}>
                <Model3DViewer
                  key={`home-main-avatar-${avatar_3d_url || gender}`}
                  activeModelUrl={avatar_3d_url}
                  modelUrl={avatar_3d_url}
                  currentGarmentName="Silueta Principal"
                  selectedLayer="Avatar 3D"
                  garmentColorHex="#8EB6C7"
                  isAvatarMode={true}
                  avatarGender={userProfile?.gender || gender || 'female'}
                  onLoadError={(err) => {
                    console.warn('[HomeScreen] Error 3D en avatar base:', err);
                  }}
                />

                {/* Badge 360 flotante dentro de la card */}
                <View style={styles.card3DBadge}>
                  <Ionicons name="cube-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.card3DBadgeText}>MODELO PRINCIPAL 3D</Text>
                </View>

                {/* Tag de estado gemelo digital activo */}
                <View style={styles.cardStatusFloatingTag}>
                  <View style={[styles.avatarStatusMiniDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.cardStatusFloatingTagText}>CALIBRADO</Text>
                </View>
              </View>

              {/* Información Básica del Modelo Principal */}
              <View style={styles.cardInfoBody}>
                <View style={styles.cardCategoryRow}>
                  <View style={[styles.cardCategoryPill, { backgroundColor: colors.surfaceSubtle }]}>
                    <Ionicons name="person-circle-outline" size={12} color={colors.primaryText} />
                    <Text style={[styles.cardCategoryPillText, { color: colors.primaryText }]}>
                      Gemelo Digital
                    </Text>
                  </View>

                  <Text style={[styles.cardDateText, { color: colors.secondaryText }]}>
                    {avatar_3d_base_url || avatarUrl ? 'Personalizado' : 'Por Defecto'}
                  </Text>
                </View>

                <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={1}>
                  {userProfile?.name ? `Avatar de ${userProfile.name}` : 'Silueta Vitra Atelier · 3D'}
                </Text>

                <View style={styles.cardAvatarMetaRow}>
                  <Ionicons name="sparkles-outline" size={13} color={colors.secondaryText} />
                  <Text style={[styles.cardAvatarMetaText, { color: colors.secondaryText }]}>
                    {userProfile?.gender === 'male' ? 'Silueta Masculina' : 'Silueta Femenina'} · Rotación interactiva 360°
                  </Text>
                </View>

                {/* Acciones del Modelo Principal: Vestir en probador o Editar en Perfil */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.cardDetailsButton,
                      {
                        backgroundColor: colors.primaryText,
                      },
                    ]}
                    onPress={() => navigation?.navigate('FittingRoom')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shirt-outline" size={15} color={colors.bg} />
                    <Text style={[styles.cardDetailsButtonText, { color: colors.bg }]}>
                      Vestir en Probador
                    </Text>
                    <Ionicons name="arrow-forward" size={13} color={colors.bg} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cardQuickTryOnBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.borderLight,
                      },
                    ]}
                    onPress={() => navigation?.navigate('Profile')}
                    activeOpacity={0.7}
                    accessibilityLabel="Configurar Avatar en Perfil"
                  >
                    <Ionicons name="person-outline" size={15} color={colors.primaryText} />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          )}

          {/* 2. MODELOS GUARDADOS ADICIONALES (Looks creados por el usuario) */}
          {filteredLooks.map((look) => {
            const isFavorite = Boolean(look.isFavorite);
            const modelUrl = look.model3dUrl || avatar_3d_url;
            const lookCategory = look.category || 'Elegante';

            return (
              <GlassCard
                key={look.id}
                style={styles.model3DCard}
                intensity={isDark ? 30 : 50}
              >
                {/* Visor 3D Embebido y Contenido dentro de la Card (No invade la Dynamic Island) */}
                <View style={styles.cardViewerWrapper}>
                  <Model3DViewer
                    key={`look-viewer-${look.id}-${modelUrl}`}
                    activeModelUrl={modelUrl}
                    modelUrl={modelUrl}
                    currentGarmentName={look.title}
                    selectedLayer="Look Completo"
                    garmentColorHex={look.garments?.[0]?.colorHex || '#8B5CF6'}
                    isAvatarMode={false}
                    avatarGender={userProfile?.gender || gender || 'female'}
                    onLoadError={(err) => {
                      console.warn('[HomeScreen] Error 3D en card:', err);
                    }}
                  />

                  {/* Badge 360 flotante dentro de la card */}
                  <View style={styles.card3DBadge}>
                    <Ionicons name="cube-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.card3DBadgeText}>3D INTERACTIVO</Text>
                  </View>

                  {/* Botón rápido de Favorito flotante en la card */}
                  <TouchableOpacity
                    style={[
                      styles.cardFavoriteFloatingBtn,
                      { backgroundColor: isFavorite ? '#EF4444' : 'rgba(20, 22, 28, 0.75)' },
                    ]}
                    onPress={() => toggleFavoriteLook(look.id)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isFavorite ? 'heart' : 'heart-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>

                {/* Información Básica del Modelo en la Card */}
                <View style={styles.cardInfoBody}>
                  <View style={styles.cardCategoryRow}>
                    <TouchableOpacity
                      style={[styles.cardCategoryPill, { backgroundColor: colors.surfaceSubtle }]}
                      onPress={() => setEditingLookCategory(look)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pricetag-outline" size={11} color={colors.primaryText} />
                      <Text style={[styles.cardCategoryPillText, { color: colors.primaryText }]}>
                        {lookCategory}
                      </Text>
                      <Ionicons name="chevron-down" size={11} color={colors.secondaryText} />
                    </TouchableOpacity>

                    <Text style={[styles.cardDateText, { color: colors.secondaryText }]}>
                      {look.date}
                    </Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={1}>
                    {look.title}
                  </Text>

                  {/* Información del Avatar (Prendas ocultas en Home, solo visibles en pantalla de detalle) */}
                  <View style={styles.cardAvatarMetaRow}>
                    <View style={[styles.avatarStatusMiniDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.cardAvatarMetaText, { color: colors.secondaryText }]}>
                      Avatar 3D Interactivo · Silueta Atelier
                    </Text>
                  </View>

                  {/* Botón para Abrir el Modelo en Otra Pantalla y Acciones Rápidas */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.cardDetailsButton,
                        {
                          backgroundColor: colors.primaryText,
                        },
                      ]}
                      onPress={() => setSelectedSavedLookDetail(look)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={15} color={colors.bg} />
                      <Text style={[styles.cardDetailsButtonText, { color: colors.bg }]}>
                        Ver más información
                      </Text>
                      <Ionicons name="arrow-forward" size={13} color={colors.bg} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cardQuickTryOnBtn,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.borderLight,
                        },
                      ]}
                      onPress={() => handleOpenFittingRoomWithLook(look)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="sparkles" size={14} color={colors.primaryText} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cardQuickDeleteBtn,
                        {
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                        },
                      ]}
                      onPress={() => handleDeleteLook(look.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            );
          })}

          {/* Estado vacío SOLO cuando una categoría secundaria (distinta de "Todos") no tiene looks */}
          {selectedCategory !== 'Todos' && filteredLooks.length === 0 && (
            <GlassCard style={styles.emptyCategoryCard} intensity={25}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name="shirt-outline" size={30} color={colors.primaryText} />
              </View>
              <Text style={[styles.emptyCategoryTitle, { color: colors.primaryText }]}>
                No hay avatares en "{selectedCategory}"
              </Text>
              <Text style={[styles.emptyCategorySubtitle, { color: colors.secondaryText }]}>
                Aún no has creado ni asignado avatares a esta categoría.
              </Text>

              <View style={styles.emptyCategoryActions}>
                <TouchableOpacity
                  style={[styles.emptyActionSecondaryBtn, { borderColor: colors.borderLight }]}
                  onPress={() => setSelectedCategory('Todos')}
                >
                  <Text style={[styles.emptyActionSecondaryBtnText, { color: colors.primaryText }]}>
                    Ver Todos los Modelos
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}

          {/* 3. TARJETA DE CREAR UN MODELO 3D (Siempre después de los modelos) */}
          <GlassCard style={styles.createModelCard} intensity={isDark ? 28 : 50}>
            <View style={styles.createModelHeader}>
              <View
                style={[
                  styles.createModelIconContainer,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
                ]}
              >
                <Ionicons name="sparkles" size={24} color="#8EB6C7" />
              </View>

              <View style={styles.createModelTextContainer}>
                <Text style={[styles.createModelEyebrow, { color: colors.secondaryText }]}>
                  NUEVA CREACIÓN 3D
                </Text>
                <Text style={[styles.createModelTitle, { color: colors.primaryText }]}>
                  Crear un Modelo 3D
                </Text>
                <Text style={[styles.createModelSubtitle, { color: colors.secondaryText }]}>
                  Combina prendas en el Probador Virtual y genera un nuevo gemelo digital interactivo con IA.
                </Text>
              </View>
            </View>

            <View style={styles.createModelActionsRow}>
              <TouchableOpacity
                style={[styles.createModelPrimaryBtn, { backgroundColor: colors.primaryText }]}
                onPress={() => navigation?.navigate('FittingRoom')}
                activeOpacity={0.8}
              >
                <Ionicons name="shirt-outline" size={16} color={colors.bg} />
                <Text style={[styles.createModelPrimaryBtnText, { color: colors.bg }]}>
                  Ir al Probador Virtual
                </Text>
                <Ionicons name="arrow-forward" size={14} color={colors.bg} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createModelSecondaryBtn,
                  {
                    borderColor: colors.borderLight,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                  },
                ]}
                onPress={() => navigation?.navigate('AddGarment')}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={colors.primaryText} />
                <Text style={[styles.createModelSecondaryBtnText, { color: colors.primaryText }]}>
                  Subir Prenda
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* MODAL 1: Pantalla Completa para Ver Más Información del Modelo (SavedLookScreen) */}
      <Modal
        visible={Boolean(selectedSavedLookDetail)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedSavedLookDetail(null)}
      >
        {selectedSavedLookDetail && (
          <SavedLookScreen
            look={selectedSavedLookDetail}
            onBack={() => setSelectedSavedLookDetail(null)}
            onTryAgain={(look) => {
              setSelectedSavedLookDetail(null);
              handleOpenFittingRoomWithLook(look);
            }}
            onRemoveLook={(id) => {
              setSelectedSavedLookDetail(null);
              removeLook(id);
            }}
            onSelectGarment={(g) => {
              setSelectedSavedLookDetail(null);
              setActiveGarmentDetail(g);
            }}
          />
        )}
      </Modal>

      {/* MODAL 2: Crear Nueva Categoría */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard} intensity={90}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.primaryText }]}>
                Crear Nueva Categoría
              </Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.secondaryText }]}>
              Ejemplos: "Elegante", "Fiesta", "Gala", "Playa", "Casual", "Citas".
            </Text>

            <TextInput
              style={[
                styles.modalTextInput,
                {
                  color: colors.primaryText,
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surfaceSubtle,
                },
              ]}
              placeholder="Nombre de la categoría..."
              placeholderTextColor={colors.secondaryText}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.borderLight }]}
                onPress={() => {
                  setNewCategoryName('');
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.secondaryText }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primaryText }]}
                onPress={handleCreateCategory}
              >
                <Text style={[styles.modalConfirmBtnText, { color: colors.bg }]}>
                  Crear y Aplicar
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* MODAL 3: Cambiar Categoría de un Look Específico */}
      <Modal
        visible={Boolean(editingLookCategory)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingLookCategory(null)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard} intensity={90}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.primaryText }]}>
                Cambiar Categoría
              </Text>
              <TouchableOpacity onPress={() => setEditingLookCategory(null)}>
                <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.secondaryText }]}>
              Selecciona la categoría para "{editingLookCategory?.title}":
            </Text>

            <ScrollView style={{ maxHeight: 220, marginVertical: Spacing.sm }}>
              {lookCategories
                .filter((c) => c !== 'Todos')
                .map((cat) => {
                  const isCurrent = (editingLookCategory?.category || 'Elegante') === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categorySelectRow,
                        {
                          backgroundColor: isCurrent ? colors.primaryText : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => {
                        if (editingLookCategory) {
                          updateLookCategory(editingLookCategory.id, cat);
                          setEditingLookCategory(null);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.categorySelectText,
                          { color: isCurrent ? colors.bg : colors.primaryText },
                          isCurrent && { fontWeight: '700' },
                        ]}
                      >
                        {cat}
                      </Text>
                      {isCurrent && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.bg} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.createNewFromPickerBtn, { borderColor: colors.borderLight }]}
              onPress={() => {
                setCategoryModalVisible(true);
              }}
            >
              <Ionicons name="add" size={16} color={colors.primaryText} />
              <Text style={[styles.createNewFromPickerText, { color: colors.primaryText }]}>
                Crear otra categoría...
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* MODAL 4: Detalle de Prenda Individual */}
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
          />
        )}
      </Modal>

      {/* Botón Flotante para Volver Arriba Rápidamente (Aparece cuando el usuario ha bajado) */}
      <Animated.View
        pointerEvents={showScrollTop ? 'auto' : 'none'}
        style={[
          styles.scrollToTopFloatingWrapper,
          {
            bottom: insets.bottom + 85,
            opacity: scrollTopAnim,
            transform: [
              {
                translateY: scrollTopAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
              {
                scale: scrollTopAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.scrollToTopFloatingBtn,
            {
              backgroundColor: isDark ? 'rgba(26, 28, 35, 0.92)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.10)',
            },
          ]}
          onPress={() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.scrollToTopIconBadge, { backgroundColor: colors.primaryText }]}>
            <Ionicons name="arrow-up" size={14} color={colors.bg} />
          </View>
          <Text style={[styles.scrollToTopText, { color: colors.primaryText }]}>Subir</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  brandTitleContainer: {
    flex: 1,
  },
  brandBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandBadgeText: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  brandWordmark: {
    ...Typography.displayLg,
    fontFamily: Typography.bodoni.bold,
    fontSize: 28,
    letterSpacing: 4,
    lineHeight: 32,
  },
  greetingSubtitle: {
    ...Typography.caption,
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  headerActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesSection: {
    marginBottom: Spacing.lg,
  },
  categoriesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    ...Typography.subhead,
    fontFamily: Typography.bodoni.bold,
    fontSize: 16,
  },
  newCategoryHeaderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newCategoryHeaderLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
  },
  categoryCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addCategoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardsFeedContainer: {
    gap: Spacing.xl,
  },
  model3DCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cardViewerWrapper: {
    height: 260,
    width: '100%',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  card3DBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(20, 22, 28, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  card3DBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardFavoriteFloatingBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfoBody: {
    padding: Spacing.md,
  },
  cardCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  cardCategoryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDateText: {
    fontSize: 11,
  },
  cardTitle: {
    ...Typography.subhead,
    fontFamily: Typography.bodoni.bold,
    fontSize: 17,
    marginBottom: 8,
  },
  cardAvatarMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  avatarStatusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardAvatarMetaText: {
    fontSize: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  cardDetailsButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardQuickTryOnBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardQuickDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCategoryCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyCategoryTitle: {
    ...Typography.headline,
    fontSize: 17,
    textAlign: 'center',
  },
  emptyCategorySubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyCategoryActions: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
    width: '100%',
  },
  emptyActionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  emptyActionPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActionSecondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  emptyActionSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  baseAvatarCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginTop: Spacing.sm,
  },
  baseAvatarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  baseAvatarBadge: {
    ...Typography.micro,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 2,
  },
  baseAvatarTitle: {
    ...Typography.subhead,
    fontFamily: Typography.bodoni.bold,
    fontSize: 16,
  },
  profileNavigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  profileNavigateBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  baseAvatarViewerWrapper: {
    height: 220,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginBottom: Spacing.md,
  },
  tryOnBaseAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  tryOnBaseAvatarBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    padding: Spacing.xl,
    borderRadius: Radius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalHeading: {
    ...Typography.headline,
    fontSize: 18,
  },
  modalDesc: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  modalTextInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categorySelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginBottom: 6,
  },
  categorySelectText: {
    fontSize: 14,
  },
  createNewFromPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 6,
  },
  createNewFromPickerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardStatusFloatingTag: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(20, 22, 28, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  cardStatusFloatingTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  createModelCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  createModelHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  createModelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModelTextContainer: {
    flex: 1,
  },
  createModelEyebrow: {
    ...Typography.micro,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  createModelTitle: {
    ...Typography.subhead,
    fontFamily: Typography.bodoni.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  createModelSubtitle: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 17,
  },
  createModelActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  createModelPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  createModelPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  createModelSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  createModelSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollToTopFloatingWrapper: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  scrollToTopFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  scrollToTopIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollToTopText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
