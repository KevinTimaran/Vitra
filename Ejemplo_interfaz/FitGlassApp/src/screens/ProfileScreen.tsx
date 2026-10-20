import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme, setTheme } = useTheme();
  const { userProfile, colorProfile, avatarUrl, resetProfile } = useUser();
  const { userEmail, logout } = useAuth();

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
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
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
            Identidad Biométrica · Sesión Activa (JWT)
          </Text>
        </View>

        {/* 3D Digital Twin Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Ionicons name="cube-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
              Avatar Base 3D (.glb)
            </Text>
            <View style={styles.statusPillActive}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>Activo</Text>
            </View>
          </View>
          <Text style={[styles.cardDetail, { color: colors.secondaryText }]}>
            Generado con Tripo3D a partir de tu fotografía de cuerpo entero. Listo para simulación en el Probador Virtual.
          </Text>
          <TouchableOpacity
            style={[
              styles.inlineBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
            onPress={() => navigation?.navigate('FittingRoom')}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles-outline" size={16} color={colors.primaryText} />
            <Text style={[styles.inlineBtnText, { color: colors.primaryText }]}>
              Visualizar en Probador 3D
            </Text>
          </TouchableOpacity>
        </View>

        {/* Seasonal Colorimetry Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
              Colorimetría Estacional
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
              Piel: {colorProfile.skin_tone}
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
              Abrir Estudio de Color Completo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ajustes de Apariencia: Modo Claro vs Fondo Negro */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
              Ajustes de Apariencia
            </Text>
            <View
              style={[
                styles.themeBadgePill,
                { backgroundColor: isDark ? '#27272A' : '#F4F4F6' },
              ]}
            >
              <Text style={[styles.themeBadgeText, { color: colors.primaryText }]}>
                {isDark ? 'Fondo Negro' : 'Modo Claro'}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDetail, { color: colors.secondaryText }]}>
            Personaliza el tema visual del atelier. Puedes activar el fondo negro de alto contraste OLED o mantener el estilo editorial claro.
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
              <View style={[styles.themeIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="sunny" size={20} color="#D97706" />
              </View>
              <Text style={[styles.themeOptionTitle, { color: colors.primaryText }]}>
                Modo Claro
              </Text>
              <Text style={[styles.themeOptionDesc, { color: colors.secondaryText }]}>
                Blanco Editorial
              </Text>
              {!isDark && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>

            {/* Opción 2: Fondo Negro */}
            <TouchableOpacity
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: isDark ? '#27272A' : 'transparent',
                  borderColor: isDark ? colors.primaryText : colors.borderLight,
                  borderWidth: isDark ? 2 : 1,
                },
              ]}
              onPress={() => setTheme('dark')}
              activeOpacity={0.8}
            >
              <View style={[styles.themeIconCircle, { backgroundColor: '#312E81' }]}>
                <Ionicons name="moon" size={20} color="#A5B4FC" />
              </View>
              <Text style={[styles.themeOptionTitle, { color: colors.primaryText }]}>
                Fondo Negro
              </Text>
              <Text style={[styles.themeOptionDesc, { color: colors.secondaryText }]}>
                Negro OLED
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
                Fondo Negro (Modo Oscuro)
              </Text>
              <Text style={[styles.switchSubtitle, { color: colors.secondaryText }]}>
                Pantalla negra OLED para reducir fatiga visual
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E5E5EA', true: '#111113' }}
              thumbColor={isDark ? '#F4F4F5' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Acciones de Cuenta */}
        <View style={styles.actionsContainer}>
          <PrimaryButton
            label="Escanear de Nuevo (Cámara / Galería)"
            onPress={handleStartScan}
            icon="scan-outline"
          />
          <SecondaryButton
            label="Restablecer Valores Iniciales"
            onPress={resetProfile}
            style={{ marginTop: Spacing.sm }}
          />
          <SecondaryButton
            label="Cerrar Sesión (Sign Out)"
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.huge,
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
    borderRadius: Radius.md,
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
});
