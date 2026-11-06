// ProfileScreen.tsx
//
// Rediseño con jerarquía clara (ISO 9241-110 §7.5 + Nielsen H8):
//   1. Header de identidad compacto (1 línea)
//   2. Hero del Gemelo Digital 3D (protagonista visual)
//   3. Acordeones colapsables: Colorimetría · Apariencia · Idioma · Cuenta
//
// Sin cambios en: tema, colores, i18n, auth, cámara/cropper, lógica de negocio.

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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser, PRESET_AVATARS } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { CameraSilhouetteModal, ImageCropperModal } from '../components/camera';

type SectionKey = 'color' | 'appearance' | 'language' | 'account';

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme, setTheme } = useTheme();
  const {
    userProfile,
    colorProfile,
    avatarUrl,
    avatarType,
    avatarCreatedAt,
    gender,
    avatar_2d_image,
    setPresetAvatar,
    replaceAvatar,
    deleteAvatar,
    resetProfile,
  } = useUser();
  const { userEmail, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [showCameraSilhouette, setShowCameraSilhouette] = useState<boolean>(false);
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [galleryImageUri, setGalleryImageUri] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const toggleSection = (key: SectionKey) =>
    setOpenSection((prev) => (prev === key ? null : key));

  // ---------- Handlers (misma lógica que ya tenías) ----------

  const handleLogout = async () => {
    resetProfile();
    await logout();
  };

  const handleUploadAvatarPhoto = async (imagePayload: string) => {
    try {
      setAvatarLoading(true);
      await replaceAvatar(imagePayload);
      Alert.alert(
        'Gemelo Digital Actualizado',
        'Tu avatar 3D ha sido generado y vinculado a tu probador.'
      );
    } catch (e: any) {
      console.error('[ProfileScreen] Error al actualizar avatar:', e);
      Alert.alert('Error', e?.message || 'No se pudo generar el gemelo digital.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePickAndUploadAvatar = async (source: 'camera' | 'gallery' | 'demo') => {
    try {
      if (source === 'demo') {
        const demoImg =
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';
        await handleUploadAvatarPhoto(demoImg);
        return;
      }

      if (source === 'camera') {
        setShowCameraSilhouette(true);
        return;
      }

      if (source === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso Requerido', 'Se requiere acceso a la galería.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.9,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          setGalleryImageUri(res.assets[0].uri);
          setShowCropper(true);
        }
      }
    } catch (e: any) {
      console.error('[ProfileScreen] Error al seleccionar imagen:', e);
      Alert.alert('Error', e?.message || 'No se pudo abrir el selector.');
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
    if (navigation) navigation.navigate('BodyProfile');
  };

  const handleOpenColorStudio = () => {
    if (navigation) navigation.navigate('ColorStudio');
  };

  // ---------- Derivados de UI ----------

  const isCustom = avatarType === 'custom_3d';
  const previewUri = avatar_2d_image || PRESET_AVATARS[gender]?.image_2d || '';
  const recommendedColors = Array.isArray(colorProfile?.recommended_colors)
    ? colorProfile.recommended_colors
    : [];
  const skinColor =
    typeof colorProfile?.skin_tone === 'string' && colorProfile.skin_tone.trim()
      ? colorProfile.skin_tone.split(' ')[0]
      : '#E8BEAC';

  const presetLabel = PRESET_AVATARS[gender]?.label || 'Silueta Atelier';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================================
            1) HEADER DE IDENTIDAD — compacto, 1 línea
           ===================================================== */}
        <View style={styles.identityRow}>
          <View
            style={[
              styles.identityAvatar,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Ionicons name="person" size={22} color={colors.primaryText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.identityName, { color: colors.primaryText }]}
              numberOfLines={1}
            >
              {userProfile.name}
            </Text>
            <Text
              style={[styles.identitySub, { color: colors.secondaryText }]}
              numberOfLines={1}
            >
              {userEmail || t('profile.biometricIdentity')}
            </Text>
          </View>
        </View>

        {/* =====================================================
            2) HERO — Gemelo Digital 3D (protagonista)
           ===================================================== */}
        <GlassCard style={styles.heroCard}>
          {/* Preview + overlay de estado */}
          <View style={styles.heroImageWrap}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.heroImage, styles.heroImageEmpty]}>
                <Ionicons name="cube-outline" size={48} color={colors.secondaryText} />
              </View>
            )}

            {/* Pill de estado sobre la imagen */}
            <View
              style={[
                styles.statusPill,
                isCustom
                  ? { backgroundColor: 'rgba(59, 130, 246, 0.15)' }
                  : { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isCustom ? '#3B82F6' : '#22C55E' },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: isCustom ? '#2563EB' : '#15803D' },
                ]}
              >
                {isCustom ? '3D Personalizado' : 'Silueta Preset'}
              </Text>
            </View>

            {/* Overlay de carga */}
            {avatarLoading && (
              <View style={styles.heroOverlay}>
                <ActivityIndicator size="large" color={colors.bg} />
                <Text style={[styles.heroOverlayText, { color: colors.bg }]}>
                  Procesando gemelo digital…
                </Text>
              </View>
            )}
          </View>

          {/* Meta descriptiva (1–2 líneas) */}
          <Text
            style={[styles.heroMeta, { color: colors.secondaryText }]}
            numberOfLines={2}
          >
            {isCustom
              ? `Avatar 3D activo${avatarCreatedAt ? ` desde ${avatarCreatedAt}` : ''}.`
              : `Usando ${presetLabel}.`}
          </Text>

          {/* Selector de silueta base — pills compactas */}
          <Text style={[styles.microLabel, { color: colors.tertiaryText }]}>
            SILUETA BASE
          </Text>
          <View style={styles.presetRow}>
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
                    styles.presetPill,
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
                    size={13}
                    color={isActive ? colors.bg : colors.primaryText}
                  />
                  <Text
                    style={[
                      styles.presetPillText,
                      {
                        color: isActive ? colors.bg : colors.primaryText,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA primario único */}
          <TouchableOpacity
            style={[
              styles.primaryCta,
              { backgroundColor: colors.primaryText },
              avatarLoading && { opacity: 0.5 },
            ]}
            onPress={handlePromptAvatarUpload}
            disabled={avatarLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={17} color={colors.bg} />
            <Text style={[styles.primaryCtaText, { color: colors.bg }]}>
              {isCustom ? 'Reemplazar Gemelo 3D' : 'Crear Gemelo 3D con Foto'}
            </Text>
          </TouchableOpacity>

          {/* Acciones secundarias — sutiles */}
          <TouchableOpacity
            style={styles.subtleLink}
            onPress={() => navigation?.navigate('FittingRoom')}
            activeOpacity={0.7}
          >
            <Ionicons name="cube-outline" size={14} color={colors.primaryText} />
            <Text style={[styles.subtleLinkText, { color: colors.primaryText }]}>
              Ver en Probador Virtual 3D
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
          </TouchableOpacity>

          {isCustom && (
            <TouchableOpacity
              style={styles.deleteAvatarLink}
              onPress={handleDeleteAvatar}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteAvatarText}>Eliminar gemelo digital</Text>
            </TouchableOpacity>
          )}
        </GlassCard>

        {/* =====================================================
            3) ACORDEÓN — Colorimetría
           ===================================================== */}
        <Section
          icon="color-palette-outline"
          title={t('profile.colorimetryTitle')}
          summary={colorProfile?.season || 'Otoño Cálido'}
          isOpen={openSection === 'color'}
          onToggle={() => toggleSection('color')}
          colors={colors}
        >
          {/* Skin tone + swatches resumidos */}
          <View style={styles.colorRow}>
            <View style={[styles.skinDot, { backgroundColor: skinColor }]} />
            <Text style={[styles.caption, { color: colors.secondaryText }]}>
              {t('profile.skinLabel')}: {colorProfile?.skin_tone || skinColor}
            </Text>
          </View>

          <View style={[styles.swatchesRow, { marginTop: Spacing.sm }]}>
            {recommendedColors.slice(0, 8).map((hex, i) => (
              <View
                key={`${hex}-${i}`}
                style={[
                  styles.swatch,
                  { backgroundColor: hex, borderColor: colors.borderLight },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.inlineButton,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderLight,
                marginTop: Spacing.md,
              },
            ]}
            onPress={handleOpenColorStudio}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={15} color={colors.primaryText} />
            <Text style={[styles.inlineButtonText, { color: colors.primaryText }]}>
              {t('profile.openColorStudio')}
            </Text>
          </TouchableOpacity>
        </Section>

        {/* =====================================================
            4) ACORDEÓN — Apariencia (solo Switch, sin redundancia)
           ===================================================== */}
        <Section
          icon="contrast-outline"
          title={t('profile.appearanceTitle')}
          summary={isDark ? t('profile.darkMode') : t('profile.lightMode')}
          isOpen={openSection === 'appearance'}
          onToggle={() => toggleSection('appearance')}
          colors={colors}
        >
          <Text style={[styles.bodyText, { color: colors.secondaryText }]}>
            {t('profile.appearanceDesc')}
          </Text>

          <View
            style={[styles.switchRow, { borderTopColor: colors.borderLight }]}
          >
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
        </Section>

        {/* =====================================================
            5) ACORDEÓN — Idioma
           ===================================================== */}
        <Section
          icon="language-outline"
          title={t('profile.languageTitle')}
          summary={language === 'es' ? 'Español' : 'English'}
          isOpen={openSection === 'language'}
          onToggle={() => toggleSection('language')}
          colors={colors}
        >
          <Text style={[styles.bodyText, { color: colors.secondaryText }]}>
            {t('profile.languageDesc')}
          </Text>

          <View style={styles.segmentedRow}>
            {[
              { key: 'es', label: 'Español', icon: 'globe-outline' },
              { key: 'en', label: 'English', icon: 'planet-outline' },
            ].map((opt) => {
              const active = language === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? colors.primaryText : colors.surfaceSubtle,
                      borderColor: active ? colors.primaryText : colors.borderLight,
                    },
                  ]}
                  onPress={() => setLanguage(opt.key as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={14}
                    color={active ? colors.bg : colors.primaryText}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: active ? colors.bg : colors.primaryText,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* =====================================================
            6) ACORDEÓN — Cuenta (acciones avanzadas/destructivas)
           ===================================================== */}
        <Section
          icon="settings-outline"
          title="Cuenta"
          summary="Escanear · Restablecer · Salir"
          isOpen={openSection === 'account'}
          onToggle={() => toggleSection('account')}
          colors={colors}
        >
          <PrimaryButton
            label={t('profile.scanAgain')}
            onPress={handleStartScan}
            icon="scan-outline"
          />
          <SecondaryButton
            label={t('profile.resetDefaults')}
            onPress={() =>
              Alert.alert(
                'Restablecer perfil',
                'Se borrarán tus datos personales, avatar y preferencias. ¿Continuar?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Restablecer', style: 'destructive', onPress: resetProfile },
                ]
              )
            }
            style={{ marginTop: Spacing.sm }}
          />
          <SecondaryButton
            label={t('profile.signOut')}
            onPress={handleLogout}
            icon="log-out-outline"
            style={{
              marginTop: Spacing.sm,
              borderColor: 'rgba(239, 68, 68, 0.4)',
            }}
          />
        </Section>
      </ScrollView>

      {/* Modales — sin cambios */}
      <CameraSilhouetteModal
        visible={showCameraSilhouette}
        onClose={() => setShowCameraSilhouette(false)}
        gender={gender}
        onPhotoSelected={(croppedUri, b64) => {
          handleUploadAvatarPhoto(b64 || croppedUri);
        }}
      />
      <ImageCropperModal
        visible={showCropper}
        imageUri={galleryImageUri}
        onConfirm={(croppedUri, b64) => {
          setShowCropper(false);
          setGalleryImageUri(null);
          handleUploadAvatarPhoto(b64 || croppedUri);
        }}
        onCancel={() => {
          setShowCropper(false);
          setGalleryImageUri(null);
        }}
      />
    </View>
  );
};

// =============================================================
// Sub-componente: Sección colapsable (acordeón)
// =============================================================
const Section: React.FC<{
  icon: string;
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  colors: any;
  children: React.ReactNode;
}> = ({ icon, title, summary, isOpen, onToggle, colors, children }) => (
  <GlassCard style={styles.sectionCard}>
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={styles.sectionHeader}
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
    >
      <Ionicons name={icon as any} size={18} color={colors.primaryText} />
      <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
        {title}
      </Text>
      <Text
        style={[styles.sectionSummary, { color: colors.secondaryText }]}
        numberOfLines={1}
      >
        {summary}
      </Text>
      <Ionicons
        name={isOpen ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={colors.secondaryText}
      />
    </TouchableOpacity>
    {isOpen && <View style={styles.sectionBody}>{children}</View>}
  </GlassCard>
);

// =============================================================
// Estilos
// =============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: Spacing.md,
    paddingBottom: 95,
  },

  // --- Header identidad ---
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  identityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  identityName: {
    ...Typography.callout,
    fontWeight: '700',
  },
  identitySub: {
    ...Typography.caption,
    marginTop: 1,
  },

  // --- Hero 3D ---
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  heroImageWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#00000010',
  },
  heroImage: { width: '100%', height: '100%' },
  heroImageEmpty: { alignItems: 'center', justifyContent: 'center' },
  statusPill: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: {
    ...Typography.micro,
    fontWeight: '700',
    fontSize: 10,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroOverlayText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  heroMeta: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    lineHeight: 17,
  },
  microLabel: {
    ...Typography.micro,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.md,
  },
  presetPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 4,
  },
  presetPillText: { ...Typography.micro, fontSize: 11 },

  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.pill,
    gap: 8,
  },
  primaryCtaText: {
    ...Typography.callout,
    fontWeight: '700',
    fontSize: 13,
  },
  subtleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  subtleLinkText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  deleteAvatarLink: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteAvatarText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
    textDecorationLine: 'underline',
  },

  // --- Sección acordeón ---
  sectionCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    ...Typography.callout,
    fontWeight: '700',
    flex: 1,
  },
  sectionSummary: {
    ...Typography.caption,
    fontSize: 12,
    maxWidth: '45%',
    textAlign: 'right',
  },
  sectionBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: 0,
  },

  // --- Contenido interno de secciones ---
  bodyText: {
    ...Typography.caption,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  caption: { ...Typography.caption, fontSize: 12 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  swatchesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  inlineButtonText: { ...Typography.caption, fontWeight: '600' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  switchTitle: { fontSize: 13, fontWeight: '600' },
  switchSubtitle: { fontSize: 11, marginTop: 2 },

  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.xs,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  segmentText: { ...Typography.caption, fontSize: 12 },
});