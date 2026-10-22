import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser, PRESET_AVATARS } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme, setTheme } = useTheme();
  const {
    userProfile,
    colorProfile,
    avatarUrl,
    avatarType,
    avatarCreatedAt,
    gender,
    setPresetAvatar,
    replaceAvatar,
    deleteAvatar,
    resetProfile,
  } = useUser();
  const { userEmail, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);

  const handlePickAndUploadAvatar = async (source: 'camera' | 'gallery' | 'demo') => {
    try {
      if (source === 'demo') {
        setAvatarLoading(true);
        const demoImg = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';
        await replaceAvatar(demoImg);
        Alert.alert('Éxito', 'Gemelo digital 3D generado a partir de la silueta demo.');
        return;
      }

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso Requerido', 'Se requiere acceso a la cámara.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso Requerido', 'Se requiere acceso a la galería.');
          return;
        }
      }

      const res = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setAvatarLoading(true);
        const asset = res.assets[0];

        // Redimensionar y comprimir la fotografía para reducir el payload y evitar caídas de red
        let imagePayload = asset.uri;
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (manipulated.base64) {
            imagePayload = `data:image/jpeg;base64,${manipulated.base64}`;
          } else if (manipulated.uri) {
            imagePayload = manipulated.uri;
          }
        } catch (manipErr) {
          console.warn('[ProfileScreen] Aviso optimizando imagen:', manipErr);
        }

        await replaceAvatar(imagePayload);
        Alert.alert('Gemelo Digital Actualizado', 'Tu avatar 3D ha sido generado y vinculado a tu probador.');
      }
    } catch (e: any) {
      console.error('[ProfileScreen] Error al actualizar avatar:', e);
      Alert.alert('Error', e?.message || 'No se pudo generar el gemelo digital.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePromptAvatarUpload = () => {
    Alert.alert(
      'Gemelo Digital 3D',
      'Elige el origen de la fotografía de cuerpo completo para reconstruir tu avatar 3D:',
      [
        { text: 'Cámara', onPress: () => handlePickAndUploadAvatar('camera') },
        { text: 'Galería', onPress: () => handlePickAndUploadAvatar('gallery') },
        { text: 'Muestra Demo', onPress: () => handlePickAndUploadAvatar('demo') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleDeleteAvatar = () => {
    Alert.alert(
      '¿Eliminar Gemelo Digital?',
      'Se restablecerá la silueta predeterminada del atelier según tu género.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setAvatarLoading(true);
              await deleteAvatar();
              Alert.alert('Eliminado', 'Se ha restablecido la silueta base.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Error al eliminar el avatar.');
            } finally {
              setAvatarLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleStartScan = () => {
    if (navigation) {
      navigation.navigate('BodyProfile');
    }
  };

  const handleOpenColorStudio = () => {
    if (navigation) {
      navigation.navigate('ColorStudio');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <GlassCard style={styles.userCard}>
          <View
            style={[
              styles.avatarIconBox,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
          >
            <Ionicons name="person" size={36} color={colors.primaryText} />
          </View>
          <Text style={[styles.userName, { color: colors.primaryText }]}>
            {userProfile.name}
          </Text>
          {userEmail ? (
            <Text style={[styles.userBadge, { color: colors.primaryText, fontWeight: '600', marginBottom: 2 }]}>
              {userEmail}
            </Text>
          ) : null}
          <Text style={[styles.userBadge, { color: colors.secondaryText }]}>
            {t('profile.biometricIdentity')}
          </Text>
        </GlassCard>

        {/* 3D Digital Twin Management Card (Fase 2) */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="cube-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
              Gestión de Gemelo Digital 3D
            </Text>
            <View
              style={[
                styles.statusPillActive,
                avatarType === 'custom_3d' && { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  avatarType === 'custom_3d' && { backgroundColor: '#3B82F6' },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  avatarType === 'custom_3d' && { color: '#2563EB' },
                ]}
              >
                {avatarType === 'custom_3d' ? '3D Personalizado' : 'Silueta Preset'}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDetail, { color: colors.secondaryText }]}>
            {avatarType === 'custom_3d'
              ? `Tu avatar tridimensional generado por Tripo3D está activo${avatarCreatedAt ? ` desde el ${avatarCreatedAt}` : ''}. Puedes reemplazarlo con una nueva captura o restablecer la silueta base.`
              : `Estás utilizando la ${PRESET_AVATARS[gender]?.label || 'Silueta Atelier'}. Puedes alternar la silueta o crear tu gemelo digital 3D a partir de una foto de cuerpo completo.`}
          </Text>

          {/* Selector de Siluetas Base Preset */}
          <View style={styles.presetSelectorSection}>
            <Text style={[styles.sectionMiniLabel, { color: colors.tertiaryText }]}>
              SILUETAS ATELIER DISPONIBLES
            </Text>
            <View style={styles.presetButtonsRow}>
              {[
                { key: 'female', label: 'Femenina', icon: 'woman-outline' },
                { key: 'male', label: 'Masculina', icon: 'man-outline' },
                { key: 'non-binary', label: 'Fluida', icon: 'people-outline' },
              ].map((p) => {
                const isActive = gender === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      styles.presetPillBtn,
                      {
                        backgroundColor: isActive ? colors.primaryText : colors.surfaceSubtle,
                        borderColor: isActive ? colors.primaryText : colors.borderLight,
                      },
                    ]}
                    onPress={() => setPresetAvatar(p.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={p.icon as any}
                      size={14}
                      color={isActive ? colors.bg : colors.primaryText}
                    />
                    <Text
                      style={[
                        styles.presetPillBtnText,
                        { color: isActive ? colors.bg : colors.primaryText, fontWeight: isActive ? '700' : '500' },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Acciones del Gemelo Digital */}
          <View style={styles.avatarActionsCol}>
            {avatarLoading ? (
              <View style={[styles.avatarLoadingBox, { backgroundColor: colors.surfaceSubtle }]}>
                <ActivityIndicator size="small" color={colors.primaryText} />
                <Text style={[styles.avatarLoadingText, { color: colors.primaryText }]}>
                  Procesando gemelo digital con Tripo3D...
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryAvatarBtn,
                    { backgroundColor: colors.primaryText },
                  ]}
                  onPress={handlePromptAvatarUpload}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={17} color={colors.bg} />
                  <Text style={[styles.primaryAvatarBtnText, { color: colors.bg }]}>
                    {avatarType === 'custom_3d' ? 'Reemplazar Gemelo 3D' : 'Crear Gemelo 3D con Foto'}
                  </Text>
                </TouchableOpacity>

                {avatarType === 'custom_3d' && (
                  <TouchableOpacity
                    style={[
                      styles.deleteAvatarBtn,
                      { borderColor: 'rgba(239, 68, 68, 0.4)' },
                    ]}
                    onPress={handleDeleteAvatar}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    <Text style={styles.deleteAvatarBtnText}>
                      Restablecer Silueta Predeterminada
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.inlineBtn,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight, marginTop: 4 },
                  ]}
                  onPress={() => navigation?.navigate('FittingRoom')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cube-outline" size={16} color={colors.primaryText} />
                  <Text style={[styles.inlineBtnText, { color: colors.primaryText }]}>
                    Ver en Probador Virtual 3D
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </GlassCard>

        {/* Seasonal Colorimetry Card */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
              {t('profile.colorimetryTitle')}
            </Text>
            <View
              style={[
                styles.seasonPill,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.seasonPillText, { color: colors.primaryText }]}>
                {colorProfile.season}
              </Text>
            </View>
          </View>

          <View style={styles.miniSwatchesRow}>
            <View
              style={[
                styles.miniToneCircle,
                { backgroundColor: colorProfile.skin_tone.split(' ')[0] },
              ]}
            />
            <Text style={[styles.miniToneLabel, { color: colors.secondaryText }]}>
              {t('profile.skinLabel')}: {colorProfile.skin_tone}
            </Text>
          </View>

          <View style={styles.chipsRow}>
            {colorProfile.recommended_colors.slice(0, 6).map((hex, i) => (
              <View
                key={i}
                style={[
                  styles.miniSwatch,
                  { backgroundColor: hex, borderColor: colors.borderLight },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.inlineBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight, marginTop: Spacing.md },
            ]}
            onPress={handleOpenColorStudio}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={16} color={colors.primaryText} />
            <Text style={[styles.inlineBtnText, { color: colors.primaryText }]}>
              {t('profile.openColorStudio')}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Ajustes de Apariencia: Modo Claro vs Fondo Negro */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
              {t('profile.appearanceTitle')}
            </Text>
            <View
              style={[
                styles.themeBadgePill,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(60, 100, 115, 0.08)' },
              ]}
            >
              <Text style={[styles.themeBadgeText, { color: colors.primaryText }]}>
                {isDark ? t('profile.darkMode') : t('profile.lightMode')}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDetail, { color: colors.secondaryText }]}>
            {t('profile.appearanceDesc')}
          </Text>

          {/* Selector de Dos Tarjetas */}
          <View style={styles.themeOptionsRow}>
            {/* Opción 1: Modo Claro */}
            <TouchableOpacity
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: !isDark ? colors.surfaceSubtle : 'transparent',
                  borderColor: !isDark ? colors.primaryText : colors.borderLight,
                  borderWidth: !isDark ? 2 : 1,
                },
              ]}
              onPress={() => setTheme('light')}
              activeOpacity={0.8}
            >
              <View style={[styles.themeIconCircle, { backgroundColor: 'rgba(142, 182, 199, 0.2)' }]}>
                <Ionicons name="sunny" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.themeOptionTitle, { color: colors.primaryText }]}>
                {t('profile.lightMode')}
              </Text>
              <Text style={[styles.themeOptionDesc, { color: colors.secondaryText }]}>
                {t('profile.lightEditorial')}
              </Text>
              {!isDark && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>

            {/* Opción 2: Fondo Negro / Dark Atelier */}
            <TouchableOpacity
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : 'transparent',
                  borderColor: isDark ? colors.primaryText : colors.borderLight,
                  borderWidth: isDark ? 2 : 1,
                },
              ]}
              onPress={() => setTheme('dark')}
              activeOpacity={0.8}
            >
              <View style={[styles.themeIconCircle, { backgroundColor: 'rgba(60, 100, 115, 0.35)' }]}>
                <Ionicons name="moon" size={20} color={colors.tiffany} />
              </View>
              <Text style={[styles.themeOptionTitle, { color: colors.primaryText }]}>
                {t('profile.darkMode')}
              </Text>
              <Text style={[styles.themeOptionDesc, { color: colors.secondaryText }]}>
                {t('profile.darkOled')}
              </Text>
              {isDark && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Interruptor Switch */}
          <View style={[styles.switchRow, { borderTopColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, { color: colors.primaryText }]}>
                {t('profile.darkMode')}
              </Text>
              <Text style={[styles.switchSubtitle, { color: colors.secondaryText }]}>
                {t('profile.darkOled')}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.borderLight, true: colors.tiffany }}
              thumbColor={isDark ? colors.surface : '#FFFFFF'}
            />
          </View>
        </GlassCard>

        {/* Ajustes de Idioma (i18n): Español vs English */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="language-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
              {t('profile.languageTitle')}
            </Text>
            <View
              style={[
                styles.themeBadgePill,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.themeBadgeText, { color: colors.primaryText }]}>
                {language === 'es' ? 'Español' : 'English'}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDetail, { color: colors.secondaryText }]}>
            {t('profile.languageDesc')}
          </Text>

          <View style={styles.themeOptionsRow}>
            {/* Opción Español */}
            <TouchableOpacity
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: language === 'es' ? colors.surfaceSubtle : 'transparent',
                  borderColor: language === 'es' ? colors.primaryText : colors.borderLight,
                  borderWidth: language === 'es' ? 2 : 1,
                },
              ]}
              onPress={() => setLanguage('es')}
              activeOpacity={0.8}
            >
              <View style={[styles.themeIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="globe-outline" size={20} color="#DC2626" />
              </View>
              <Text style={[styles.themeOptionTitle, { color: colors.primaryText }]}>
                Español
              </Text>
              <Text style={[styles.themeOptionDesc, { color: colors.secondaryText }]}>
                Castellano
              </Text>
              {language === 'es' && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>

            {/* Opción English */}
            <TouchableOpacity
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: language === 'en' ? colors.surfaceSubtle : 'transparent',
                  borderColor: language === 'en' ? colors.primaryText : colors.borderLight,
                  borderWidth: language === 'en' ? 2 : 1,
                },
              ]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.8}
            >
              <View style={[styles.themeIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="planet-outline" size={20} color="#2563EB" />
              </View>
              <Text style={[styles.themeOptionTitle, { color: colors.primaryText }]}>
                English
              </Text>
              <Text style={[styles.themeOptionDesc, { color: colors.secondaryText }]}>
                International
              </Text>
              {language === 'en' && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Acciones de Cuenta */}
        <View style={styles.actionsContainer}>
          <PrimaryButton
            label={t('profile.scanAgain')}
            onPress={handleStartScan}
            icon="scan-outline"
          />
          <SecondaryButton
            label={t('profile.resetDefaults')}
            onPress={resetProfile}
            style={{ marginTop: Spacing.sm }}
          />
          <SecondaryButton
            label={t('profile.signOut')}
            onPress={logout}
            icon="log-out-outline"
            style={{ marginTop: Spacing.sm, borderColor: 'rgba(239, 68, 68, 0.4)' }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: Spacing.md,
    paddingBottom: 95,
  },
  userCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  avatarIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  userName: {
    ...Typography.title2,
    fontWeight: '700',
  },
  userBadge: {
    ...Typography.caption,
    marginTop: 2,
  },
  infoCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.callout,
    fontWeight: '700',
    flex: 1,
  },
  statusPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  statusPillText: {
    ...Typography.micro,
    color: '#15803D',
    fontWeight: '600',
    fontSize: 10,
  },
  seasonPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  seasonPillText: {
    ...Typography.micro,
    fontWeight: '700',
    fontSize: 10,
  },
  cardDetail: {
    ...Typography.caption,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  miniSwatchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  miniToneCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  miniToneLabel: {
    ...Typography.caption,
    fontSize: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  inlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  inlineBtnText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: Spacing.md,
  },
  themeBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  themeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  themeOptionCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  themeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  themeOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  themeOptionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  presetSelectorSection: {
    marginBottom: Spacing.md,
  },
  sectionMiniLabel: {
    ...Typography.micro,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 5,
  },
  presetPillBtnText: {
    ...Typography.micro,
    fontSize: 11,
  },
  avatarActionsCol: {
    gap: 8,
    marginTop: Spacing.xs,
  },
  primaryAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.pill,
    gap: 8,
  },
  primaryAvatarBtnText: {
    ...Typography.callout,
    fontWeight: '700',
    fontSize: 13,
  },
  deleteAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  deleteAvatarBtnText: {
    ...Typography.caption,
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 12,
  },
  avatarLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: 10,
  },
  avatarLoadingText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
});
