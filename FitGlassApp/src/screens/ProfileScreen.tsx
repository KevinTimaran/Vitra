// ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { GlassCard } from '../components/GlassCard';
import { useGameRecord } from '../services/game/useGameRecord';
import { openFreePlay } from '../navigation/jobNavigation';

// Habilitar LayoutAnimation en Android para transiciones suaves
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionKey = 'appearance' | 'language' | 'game' | 'account';

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, setTheme } = useTheme();
  
  const { userProfile, resetProfile } = useUser();
  const { userEmail, logout } = useAuth();
  const { language, setLanguage, t, formatNumber } = useLanguage();
  const recordText = (value: number) => (value > 0 ? formatNumber(value) : t('game.noRecord'));

  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const { best } = useGameRecord();

  const toggleSection = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const handleLogout = async () => {
    resetProfile();
    await logout();
  };

  const handleStartScan = () => {
    if (navigation) navigation.navigate('BodyProfile');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 95 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================================
            1) TARJETA DE IDENTIDAD (Estilo original)
           ===================================================== */}
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

        {/* =====================================================
            2) ACORDEÓN — Apariencia (Restaurado a tarjetas visuales)
           ===================================================== */}
        <Section
          icon="contrast-outline"
          title={t('profile.appearanceTitle')}
          summary={isDark ? t('profile.darkMode') : t('profile.lightMode')}
          isOpen={openSection === 'appearance'}
          onToggle={() => toggleSection('appearance')}
          colors={colors}
        >
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
              {!isDark && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>

            {/* Opción 2: Modo Oscuro */}
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
              {isDark && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Section>

        {/* =====================================================
            3) ACORDEÓN — Idioma (Restaurado a tarjetas visuales)
           ===================================================== */}
        <Section
          icon="language-outline"
          title={t('profile.languageTitle')}
          summary={language === 'es' ? t('profile.spanish') : t('profile.english')}
          isOpen={openSection === 'language'}
          onToggle={() => toggleSection('language')}
          colors={colors}
        >
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
              {language === 'en' && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primaryText }]}>
                  <Ionicons name="checkmark" size={12} color={colors.bg} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Section>

        {/* =====================================================
            4) ACORDEÓN — Cuenta (Estilo original de botones)
           ===================================================== */}
        <Section
          icon="game-controller-outline"
          title={t('profile.game.title')}
          summary={best > 0 ? t('profile.game.summaryRecord', { record: recordText(best) }) : t('profile.game.summaryEmpty')}
          isOpen={openSection === 'game'}
          onToggle={() => toggleSection('game')}
          colors={colors}
        >
          <View style={styles.actionsContainer}>
            <View style={[styles.recordCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}>
              <Text style={[styles.recordCardLabel, { color: colors.secondaryText }]}>{t('profile.game.recordLabel')}</Text>
              <Text style={[styles.recordCardValue, { color: colors.primaryText }]}>{recordText(best)}</Text>
            </View>
            <PrimaryButton
              label={best > 0 ? t('profile.game.beatRecord') : t('profile.game.playNow')}
              onPress={openFreePlay}
              icon="game-controller"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </Section>

        <Section
          icon="settings-outline"
          title={t('profile.account.title')}
          summary={t('profile.account.summary')}
          isOpen={openSection === 'account'}
          onToggle={() => toggleSection('account')}
          colors={colors}
        >
          <View style={styles.actionsContainer}>
            <PrimaryButton
              label={t('profile.scanAgain')}
              onPress={handleStartScan}
              icon="scan-outline"
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
          </View>
        </Section>
      </ScrollView>
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
      <View style={[styles.sectionIconWrap, { backgroundColor: colors.surfaceSubtle }]}>
        <Ionicons name={icon as any} size={18} color={colors.primaryText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
          {title}
        </Text>
        <Text
          style={[styles.sectionSummary, { color: colors.secondaryText }]}
          numberOfLines={1}
        >
          {summary}
        </Text>
      </View>
      <Ionicons
        name={isOpen ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.tertiaryText}
      />
    </TouchableOpacity>
    {isOpen && <View style={styles.sectionBody}>{children}</View>}
  </GlassCard>
);

// =============================================================
// Estilos (Fusión del código antiguo y el nuevo acordeón)
// =============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 768, // Límite para Web
    alignSelf: 'center',
  },

  // --- Tarjeta de Identidad (Antiguo) ---
  userCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
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
    fontFamily: Typography.bodoni.bold,
  },
  userBadge: {
    ...Typography.caption,
    marginTop: 2,
  },

  // --- Sección acordeón ---
  sectionCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...Typography.callout,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionSummary: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  sectionBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },

  // --- Opciones de Tema e Idioma (Antiguo) ---
  themeOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
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

  // --- Acciones de Cuenta (Antiguo) ---
  recordCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  recordCardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  recordCardValue: { fontSize: 26, fontWeight: '800' },
  actionsContainer: {
    marginTop: Spacing.xs,
  },
});