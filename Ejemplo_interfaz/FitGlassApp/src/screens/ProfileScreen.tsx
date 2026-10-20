import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { userProfile, colorProfile, avatarUrl, resetProfile } = useUser();

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
          <Text style={[styles.userBadge, { color: colors.secondaryText }]}>
            Identidad Biométrica · Fase 4
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
});
