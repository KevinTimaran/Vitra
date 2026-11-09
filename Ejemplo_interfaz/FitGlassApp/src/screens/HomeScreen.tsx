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
  RefreshControl,
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
const MAX_CATEGORY_LENGTH = 15;

// Componente de botón de favorito (Animación + Icono Rojo, borde unificado)
const AnimatedFavoriteBtn = ({ isFavorite, onPress, colors }: { isFavorite: boolean, onPress: () => void, colors: any }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleValue, { toValue: 1.4, friction: 3, tension: 50, useNativeDriver: true }),
      Animated.spring(scaleValue, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity 
      style={[styles.iconBtn, { borderColor: colors.borderLight }]} 
      onPress={handlePress} 
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite ? '#EF4444' : colors.primaryText}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

interface HomeScreenProps {
  navigation?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
    syncProfileWithBackend,
    deleteAvatar,
  } = useUser();

  const avatar_3d_url = avatar_3d_base_url || avatarUrl || userProfile?.avatar_url || null;

  // Menús y Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState<boolean>(false);
  
  // Estados para guardar etiquetas asignadas
  const [isMainAvatarFavorite, setIsMainAvatarFavorite] = useState<boolean>(false);
  const [mainAvatarCategory, setMainAvatarCategory] = useState<string | null>(null);

  // Referencia al ScrollView y botón flotante
  const scrollViewRef = useRef<any>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const scrollTopAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  // Sincronización
  useEffect(() => {
    syncProfileWithBackend?.().catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (syncProfileWithBackend) await syncProfileWithBackend();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Animated.spring(scrollTopAnim, {
      toValue: showScrollTop ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();
  }, [showScrollTop]);

  // Modales
  const [selectedSavedLookDetail, setSelectedSavedLookDetail] = useState<SavedLookItem | null>(null);
  const [activeGarmentDetail, setActiveGarmentDetail] = useState<Garment | null>(null);
  
  // Modales de Categoría
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false); // Solo para crear
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [editingLookCategory, setEditingLookCategory] = useState<SavedLookItem | null>(null); // Asignar a Look
  const [isMainAvatarTagModalOpen, setIsMainAvatarTagModalOpen] = useState<boolean>(false); // Asignar a Avatar
  
  // Modales de Eliminación
  const [lookToDelete, setLookToDelete] = useState<SavedLookItem | null>(null);
  const [isDeletingMainAvatar, setIsDeletingMainAvatar] = useState<boolean>(false);

  // Filtro de looks
  const filteredLooks = useMemo(() => {
    if (selectedCategory === 'Todos') return savedLooks;
    if (selectedCategory === 'Favoritos') return savedLooks.filter(look => look.isFavorite);
    if (selectedCategory === 'Sin categoría') return savedLooks.filter(look => !look.category);
    
    return savedLooks.filter(
      (look) => (look.category || 'Elegante').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [savedLooks, selectedCategory]);

  // Manejo de creación de categoría
  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert('Categoría vacía', 'Por favor ingresa un nombre para la categoría.');
      return;
    }
    addLookCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCategoryName('');
    setCategoryModalVisible(false);
    setIsCategoryMenuOpen(false);
  };

  const handleOpenFittingRoomWithLook = (look: SavedLookItem) => {
    if (navigation) {
      navigation.navigate('FittingRoom', {
        model_3d_url: look.model3dUrl || avatar_3d_url || undefined,
        image_2d_url: look.image2dUrl,
      });
    }
  };

  const confirmDeleteLook = () => {
    if (lookToDelete) {
      removeLook(lookToDelete.id);
      setLookToDelete(null);
    } else if (isDeletingMainAvatar) {
      deleteAvatar();
      setIsDeletingMainAvatar(false);
    }
  };

  const categoryCount = useMemo(() => {
    if (selectedCategory === 'Todos') return savedLooks.length + 1;
    if (selectedCategory === 'Favoritos') return savedLooks.filter(l => l.isFavorite).length;
    if (selectedCategory === 'Sin categoría') return savedLooks.filter(l => !l.category).length;
    return savedLooks.filter((l) => (l.category || 'Elegante').toLowerCase() === selectedCategory.toLowerCase()).length;
  }, [savedLooks, selectedCategory]);

  // Lista de categorías para el modal principal
  const displayCategories = useMemo(() => {
    return ['Todos', 'Favoritos', 'Sin categoría', ...lookCategories.filter(c => c !== 'Todos' && c !== 'Favoritos')];
  }, [lookCategories]);

  // Lista de categorías para asignar
  const assignableCategories = useMemo(() => {
    return lookCategories.filter(c => c !== 'Todos' && c !== 'Favoritos');
  }, [lookCategories]);

  return (
    <View style={styles.container}>
      <VibrantBackground />

      <ScrollView
        ref={scrollViewRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        style={styles.mainScrollView}
        contentContainerStyle={[styles.mainScrollContent, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 95 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const shouldShow = e.nativeEvent.contentOffset.y > 260;
          if (shouldShow !== showScrollTop) setShowScrollTop(shouldShow);
        }}
      >
        {/* HEADER & MENÚ DESPLEGABLE */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesSectionHeader}>
            <Text style={[styles.sectionHeading, { color: colors.primaryText }]}>
              Avatares 3D ({categoryCount})
            </Text>
            
            <TouchableOpacity
              style={[styles.dropdownTrigger, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
              onPress={() => setIsCategoryMenuOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownTriggerText, { color: colors.primaryText }]}>
                {selectedCategory}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.primaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* FEED DE TARJETAS */}
        <View style={styles.cardsFeedContainer}>
          
          {/* 1. AVATAR PRINCIPAL */}
          {selectedCategory === 'Todos' && (
            <View style={[styles.model3DCard, { backgroundColor: '#FFFFFF', borderColor: colors.borderLight }]}>
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
                  onLoadError={(err) => console.warn('[HomeScreen] Error 3D base:', err)}
                />
                <View style={styles.card3DBadge}>
                  <Ionicons name="cube-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.card3DBadgeText}>AVATAR PRINCIPAL</Text>
                </View>
              </View>

              <View style={styles.cardInfoBody}>
                <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={1}>
                  {userProfile?.name ? `Avatar de ${userProfile.name}` : 'Silueta Vitra Atelier · 3D'}
                </Text>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primaryText }]}
                    onPress={() => navigation?.navigate('FittingRoom')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shirt-outline" size={16} color={colors.bg} />
                    <Text style={[styles.primaryActionText, { color: colors.bg }]} numberOfLines={1}>
                      Probar
                    </Text>
                  </TouchableOpacity>

                  {/* Botones de acción */}
                  <View style={styles.iconActionsGroup}>
                    <AnimatedFavoriteBtn 
                      isFavorite={isMainAvatarFavorite} 
                      colors={colors} 
                      onPress={() => setIsMainAvatarFavorite(!isMainAvatarFavorite)} 
                    />
                    
                    {/* Etiqueta: Negro si tiene categoría */}
                    <TouchableOpacity 
                      style={[
                        styles.iconBtn, 
                        { 
                          borderColor: mainAvatarCategory ? colors.primaryText : colors.borderLight,
                          backgroundColor: mainAvatarCategory ? colors.primaryText : 'transparent'
                        }
                      ]}
                      onPress={() => setIsMainAvatarTagModalOpen(true)}
                    >
                      <Ionicons 
                        name="pricetag-outline" 
                        size={20} 
                        color={mainAvatarCategory ? colors.bg : colors.primaryText} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.iconBtn, { borderColor: colors.borderLight }]}
                      onPress={() => setIsDeletingMainAvatar(true)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 2. LOOKS GUARDADOS */}
          {filteredLooks.map((look) => {
            const isFavorite = Boolean(look.isFavorite);
            const modelUrl = look.model3dUrl || avatar_3d_url;
            const lookCategory = look.category || 'Sin categoría';
            const hasCategory = Boolean(look.category);

            return (
              <View key={look.id} style={[styles.model3DCard, { backgroundColor: '#FFFFFF', borderColor: colors.borderLight }]}>
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
                    onLoadError={(err) => console.warn('[HomeScreen] Error 3D card:', err)}
                  />
                  <View style={styles.card3DBadge}>
                    <Ionicons name="cube-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.card3DBadgeText}>3D INTERACTIVO</Text>
                  </View>
                </View>

                <View style={styles.cardInfoBody}>
                  <View style={styles.cardCategoryRow}>
                    <Text style={[styles.cardCategoryPillText, { color: colors.secondaryText }]}>
                      {lookCategory}
                    </Text>
                    <Text style={[styles.cardDateText, { color: colors.secondaryText }]}>
                      {look.date}
                    </Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={1}>
                    {look.title}
                  </Text>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: colors.primaryText }]}
                      onPress={() => setSelectedSavedLookDetail(look)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={16} color={colors.bg} />
                      <Text style={[styles.primaryActionText, { color: colors.bg }]} numberOfLines={1}>
                        Detalles
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.iconActionsGroup}>
                      <AnimatedFavoriteBtn 
                        isFavorite={isFavorite} 
                        colors={colors} 
                        onPress={() => toggleFavoriteLook(look.id)} 
                      />
                      
                      {/* Etiqueta: Negro si tiene categoría */}
                      <TouchableOpacity 
                        style={[
                          styles.iconBtn, 
                          { 
                            borderColor: hasCategory ? colors.primaryText : colors.borderLight,
                            backgroundColor: hasCategory ? colors.primaryText : 'transparent'
                          }
                        ]}
                        onPress={() => setEditingLookCategory(look)}
                      >
                        <Ionicons 
                          name="pricetag-outline" 
                          size={20} 
                          color={hasCategory ? colors.bg : colors.primaryText} 
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.iconBtn, { borderColor: colors.borderLight }]}
                        onPress={() => setLookToDelete(look)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Empty State */}
          {selectedCategory !== 'Todos' && filteredLooks.length === 0 && (
            <GlassCard style={styles.emptyCategoryCard} intensity={25}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name={selectedCategory === 'Favoritos' ? "heart-dislike-outline" : "shirt-outline"} size={30} color={colors.primaryText} />
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
        </View>
      </ScrollView>

      {/* MODAL: FILTRO DE CATEGORÍAS */}
      <Modal visible={isCategoryMenuOpen} transparent animationType="fade" onRequestClose={() => setIsCategoryMenuOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsCategoryMenuOpen(false)}>
          <View style={[styles.dropdownMenuCard, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalHeading, { color: colors.primaryText, marginBottom: Spacing.md }]}>
              Filtrar por Categoría
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {displayCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryMenuRow,
                      { 
                        backgroundColor: isSelected ? colors.primaryText : 'transparent',
                        borderColor: isSelected ? colors.primaryText : colors.borderLight,
                      }
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setIsCategoryMenuOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.categoryMenuText, 
                      { color: isSelected ? colors.bg : colors.secondaryText },
                      isSelected && { fontWeight: '700' }
                    ]}>
                      {cat}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.bg} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.createCategoryBtn, { borderColor: colors.borderLight, marginTop: Spacing.md }]}
              onPress={() => {
                setIsCategoryMenuOpen(false);
                setCategoryModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primaryText} />
              <Text style={[styles.createCategoryBtnText, { color: colors.primaryText }]}>
                Crear nueva categoría
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: Crear Nueva Categoría */}
      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard} intensity={70}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.primaryText }]}>
                Nueva Categoría
              </Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[
                styles.modalTextInput, 
                { 
                  color: colors.primaryText, 
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surfaceSubtle 
                }
              ]}
              placeholder={`Ej: Elegante (Max ${MAX_CATEGORY_LENGTH} car.)`}
              placeholderTextColor={colors.secondaryText}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              maxLength={MAX_CATEGORY_LENGTH}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.borderLight }]}
                onPress={() => { setNewCategoryName(''); setCategoryModalVisible(false); }}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.secondaryText }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primaryText }]}
                onPress={handleCreateCategory}
              >
                <Text style={[styles.modalConfirmBtnText, { color: colors.bg }]}>Crear</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* MODAL: Asignar Categoría a Look */}
      <Modal visible={Boolean(editingLookCategory)} transparent animationType="fade" onRequestClose={() => setEditingLookCategory(null)}>
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard} intensity={70}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.primaryText }]}>Asignar Categoría</Text>
              <TouchableOpacity onPress={() => setEditingLookCategory(null)}>
                <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 250, marginVertical: Spacing.sm }}>
              
              {/* BOTÓN: QUITAR ETIQUETA */}
              <TouchableOpacity
                style={[
                  styles.categorySelectRow, 
                  { 
                    borderColor: '#EF4444',
                    backgroundColor: editingLookCategory && !editingLookCategory.category ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    marginBottom: 12
                  }
                ]}
                onPress={() => {
                  if (editingLookCategory) {
                    updateLookCategory(editingLookCategory.id, '');
                    setEditingLookCategory(null);
                  }
                }}
              >
                <Text style={[styles.categorySelectText, { color: '#EF4444' }, editingLookCategory && !editingLookCategory.category && { fontWeight: '700' }]}>
                  Quitar etiqueta
                </Text>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              </TouchableOpacity>

              {assignableCategories.map((cat) => {
                  const isCurrent = (editingLookCategory?.category || '') === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categorySelectRow, 
                        { 
                          borderColor: isCurrent ? colors.primaryText : colors.borderLight,
                          backgroundColor: isCurrent ? colors.primaryText : 'transparent'
                        }
                      ]}
                      onPress={() => {
                        if (editingLookCategory) {
                          updateLookCategory(editingLookCategory.id, cat);
                          setEditingLookCategory(null);
                        }
                      }}
                    >
                      <Text style={[styles.categorySelectText, { color: isCurrent ? colors.bg : colors.primaryText }, isCurrent && { fontWeight: '700' }]}>
                        {cat}
                      </Text>
                      {isCurrent && <Ionicons name="checkmark-circle" size={18} color={colors.bg} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      {/* MODAL: Asignar Categoría a Avatar Principal */}
      <Modal visible={isMainAvatarTagModalOpen} transparent animationType="fade" onRequestClose={() => setIsMainAvatarTagModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard} intensity={70}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, { color: colors.primaryText }]}>Etiquetar Avatar</Text>
              <TouchableOpacity onPress={() => setIsMainAvatarTagModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 250, marginVertical: Spacing.sm }}>
              
              {/* BOTÓN: QUITAR ETIQUETA */}
              <TouchableOpacity
                style={[
                  styles.categorySelectRow, 
                  { 
                    borderColor: '#EF4444',
                    backgroundColor: !mainAvatarCategory ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    marginBottom: 12
                  }
                ]}
                onPress={() => {
                  setMainAvatarCategory(null);
                  setIsMainAvatarTagModalOpen(false);
                }}
              >
                <Text style={[styles.categorySelectText, { color: '#EF4444' }, !mainAvatarCategory && { fontWeight: '700' }]}>
                  Quitar etiqueta
                </Text>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              </TouchableOpacity>

              {assignableCategories.map((cat) => {
                  const isCurrent = mainAvatarCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categorySelectRow, 
                        { 
                          borderColor: isCurrent ? colors.primaryText : colors.borderLight, 
                          backgroundColor: isCurrent ? colors.primaryText : 'transparent' 
                        }
                      ]}
                      onPress={() => {
                        setMainAvatarCategory(cat);
                        setIsMainAvatarTagModalOpen(false);
                      }}
                    >
                      <Text style={[styles.categorySelectText, { color: isCurrent ? colors.bg : colors.primaryText }, isCurrent && { fontWeight: '700' }]}>
                        {cat}
                      </Text>
                      {isCurrent && <Ionicons name="checkmark-circle" size={18} color={colors.bg} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      {/* MODAL: ELIMINAR */}
      <Modal visible={Boolean(lookToDelete) || isDeletingMainAvatar} transparent animationType="fade" onRequestClose={() => { setLookToDelete(null); setIsDeletingMainAvatar(false); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 40 }]}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash" size={32} color="#EF4444" />
            </View>
            
            <Text style={[styles.deleteSubtitle, { color: '#4B5563', fontSize: 16, marginVertical: 24, paddingHorizontal: 10 }]}>
              El modelo se eliminará de forma permanente. Esta acción no se puede deshacer.
            </Text>
            
            <View style={[styles.modalButtonsRow, { width: '100%', marginTop: 10, gap: 16 }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: '#F3F4F6', borderWidth: 0 }]}
                onPress={() => { setLookToDelete(null); setIsDeletingMainAvatar(false); }}
              >
                <Text style={[styles.modalCancelBtnText, { color: '#374151' }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#EF4444' }]}
                onPress={confirmDeleteLook}
              >
                <Text style={[styles.modalConfirmBtnText, { color: '#FFFFFF' }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalle Look */}
      <Modal visible={Boolean(selectedSavedLookDetail)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedSavedLookDetail(null)}>
        {selectedSavedLookDetail && (
          <SavedLookScreen
            look={selectedSavedLookDetail}
            onBack={() => setSelectedSavedLookDetail(null)}
            onTryAgain={(look) => { setSelectedSavedLookDetail(null); handleOpenFittingRoomWithLook(look); }}
            onRemoveLook={(id) => { setSelectedSavedLookDetail(null); removeLook(id); }}
            onSelectGarment={(g) => { setSelectedSavedLookDetail(null); setActiveGarmentDetail(g); }}
          />
        )}
      </Modal>

      {/* Modal Detalle Prenda */}
      <Modal visible={Boolean(activeGarmentDetail)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setActiveGarmentDetail(null)}>
        {activeGarmentDetail && (
          <GarmentViewScreen garment={activeGarmentDetail} onBack={() => setActiveGarmentDetail(null)} />
        )}
      </Modal>

      {/* Botón Volver Arriba */}
      <Animated.View
        pointerEvents={showScrollTop ? 'auto' : 'none'}
        style={[
          styles.scrollToTopFloatingWrapper,
          {
            bottom: insets.bottom + 85,
            opacity: scrollTopAnim,
            transform: [{ translateY: scrollTopAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: scrollTopAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.scrollToTopFloatingBtn, { backgroundColor: isDark ? 'rgba(26, 28, 35, 0.92)' : 'rgba(255, 255, 255, 0.95)', borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.10)' }]}
          onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
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
  container: { flex: 1 },
  mainScrollView: { flex: 1 },
  mainScrollContent: { paddingHorizontal: Spacing.lg },
  categoriesSection: { marginBottom: Spacing.lg },
  categoriesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { ...Typography.subhead, fontFamily: Typography.bodoni.bold, fontSize: 16 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  dropdownTriggerText: { fontSize: 13, fontWeight: '600' },
  
  // MODAL DE FILTROS
  dropdownMenuCard: {
    width: '85%', 
    maxWidth: 320, 
    borderRadius: 20,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  categoryMenuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  categoryMenuText: { fontSize: 14 },
  createCategoryBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6, 
    paddingVertical: 10,
    borderRadius: 12, 
    borderWidth: 1,
    borderStyle: 'dashed' 
  },
  createCategoryBtnText: { fontSize: 13, fontWeight: '600' },

  cardsFeedContainer: { gap: Spacing.xl },
  
  // TARJETA
  model3DCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  
  cardViewerWrapper: { 
    height: 260, 
    width: '100%', 
    position: 'relative', 
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  
  card3DBadge: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(20, 22, 28, 0.75)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full },
  card3DBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  cardInfoBody: { padding: Spacing.md },
  cardCategoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardCategoryPillText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardDateText: { fontSize: 11 },
  cardTitle: { ...Typography.subhead, fontFamily: Typography.bodoni.bold, fontSize: 18, marginBottom: Spacing.md },
  
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: 8,
  },
  primaryActionBtn: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
  },
  primaryActionText: { fontSize: 13, fontWeight: '700' },
  
  iconActionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  emptyCategoryCard: { padding: Spacing.xl, borderRadius: Radius.xl, alignItems: 'center', gap: Spacing.sm },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  emptyCategoryTitle: { ...Typography.headline, fontSize: 17, textAlign: 'center' },
  emptyCategorySubtitle: { ...Typography.caption, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
  emptyCategoryActions: { marginTop: Spacing.md, width: '100%' },
  emptyActionSecondaryBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1 },
  emptyActionSecondaryBtnText: { fontSize: 12, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modalCard: { width: '100%', padding: Spacing.xl, borderRadius: Radius.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  modalHeading: { ...Typography.headline, fontSize: 18 },
  
  modalTextInput: { 
    height: 46, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: Radius.md, 
    paddingHorizontal: 14, 
    fontSize: 14, 
    marginVertical: Spacing.md 
  },
  
  modalButtonsRow: { flexDirection: 'row', gap: Spacing.sm },
  modalCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Radius.full, borderWidth: 1 },
  modalCancelBtnText: { fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Radius.full },
  modalConfirmBtnText: { fontSize: 14, fontWeight: '700' },
  
  categorySelectRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1 
  },
  categorySelectText: { fontSize: 14 },

  deleteIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  deleteSubtitle: { ...Typography.body, textAlign: 'center', lineHeight: 22, fontSize: 15 },

  scrollToTopFloatingWrapper: { position: 'absolute', right: Spacing.lg, zIndex: 999, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  scrollToTopFloatingBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  scrollToTopIconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scrollToTopText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
});