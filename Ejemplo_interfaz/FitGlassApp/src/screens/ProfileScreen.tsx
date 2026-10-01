// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { BodyProfile } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';

interface ProfileScreenProps {
  bodyProfile: BodyProfile;
  garmentCount: number;
  onBack: () => void;
  onEditBodyProfile: () => void;
  onOpenColorStudio: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  bodyProfile,
  garmentCount,
  onBack,
  onEditBodyProfile,
  onOpenColorStudio,
}) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const { t, i18n, toggleLanguage } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [metricUnit, setMetricUnit] = useState(bodyProfile.unit === 'cm');

  const isSpanish = i18n.language === 'es';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        onBack={onBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.avatarBox,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="person-outline" size={26} color={colors.primaryText} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[Typography.title2, { color: colors.primaryText }]}>Kevin T.</Text>
            <Text style={[Typography.caption, { color: colors.secondaryText, marginTop: 1 }]}>
              kevin.timaran@fitglass.atelier.com
            </Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.memberBadge,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[Typography.micro, { color: colors.secondaryText, fontSize: 9 }]}>
                  ATELIER MEMBER · 2026
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Group: Body & Measurements */}
        <Text style={[styles.groupHeader, { color: colors.tertiaryText }]}>
          {t('settings.body_measurements')}
        </Text>
        <View
          style={[
            styles.groupCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.groupItem}
            onPress={onEditBodyProfile}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="body-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.measurements_profile')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {bodyProfile.height} cm · Chest {bodyProfile.chest} · Waist {bodyProfile.waist}
              </Text>
            </View>
            <View style={styles.rightNav}>
              <Text style={[styles.editActionText, { color: colors.cta }]}>
                {t('settings.edit')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiaryText} />
            </View>
          </TouchableOpacity>

          <View style={[styles.groupDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.groupItem}>
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="resize-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.default_fit_cut')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {t('settings.regular_structured')}
              </Text>
            </View>
            <Text style={[styles.valueText, { color: colors.secondaryText }]}>
              {t('settings.nominal')}
            </Text>
          </View>
        </View>

        {/* Group: Appearance & Color Studio */}
        <Text style={[styles.groupHeader, { color: colors.tertiaryText }]}>
          {t('settings.appearance_color')}
        </Text>
        <View
          style={[
            styles.groupCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.groupItem}
            onPress={onOpenColorStudio}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="color-palette-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.personal_color_palette')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                Cool Mineral · Subtle Rose Undertone
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiaryText} />
          </TouchableOpacity>
        </View>

        {/* Group: Wardrobe Inventory */}
        <Text style={[styles.groupHeader, { color: colors.tertiaryText }]}>
          {t('settings.wardrobe_inventory')}
        </Text>
        <View
          style={[
            styles.groupCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View style={styles.groupItem}>
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="shirt-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.archived_garments')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {t('settings.tops_outerwear_pants_shoes')}
              </Text>
            </View>
            <Text style={[styles.valueText, { color: colors.secondaryText }]}>
              {garmentCount} pieces
            </Text>
          </View>
        </View>

        {/* Group: General & System Preferences */}
        <Text style={[styles.groupHeader, { color: colors.tertiaryText }]}>
          {t('settings.general_preferences')}
        </Text>
        <View
          style={[
            styles.groupCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          {/* Notifications */}
          <View style={styles.groupItem}>
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.atelier_notifications')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {t('settings.seasonal_recommendations')}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: isDark ? '#34C759' : colors.cta }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={[styles.groupDivider, { backgroundColor: colors.borderLight }]} />

          {/* Measurement Units */}
          <View style={styles.groupItem}>
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="speedometer-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.measurement_units')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {metricUnit ? t('settings.metric') : t('settings.imperial')}
              </Text>
            </View>
            <Switch
              value={metricUnit}
              onValueChange={setMetricUnit}
              trackColor={{ false: colors.border, true: isDark ? '#34C759' : colors.cta }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={[styles.groupDivider, { backgroundColor: colors.borderLight }]} />

          {/* Dark Mode Switch */}
          <View style={styles.groupItem}>
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons
                name={isDark ? 'moon' : 'moon-outline'}
                size={18}
                color={isDark ? '#F59E0B' : colors.primaryText}
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.dark_mode')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {isDark ? (isSpanish ? 'Activo (OLED)' : 'Active (OLED)') : (isSpanish ? 'Desactivado (Claro)' : 'Disabled (Light)')}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: '#34C759' }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={[styles.groupDivider, { backgroundColor: colors.borderLight }]} />

          {/* Language Switch */}
          <TouchableOpacity
            style={styles.groupItem}
            activeOpacity={0.7}
            onPress={toggleLanguage}
          >
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="language-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.language')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {isSpanish ? 'Español (ES)' : 'English (EN)'}
              </Text>
            </View>
            <View style={styles.rightNav}>
              <View
                style={[
                  styles.languageBadge,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.languageBadgeText, { color: colors.primaryText }]}>
                  {isSpanish ? 'ES' : 'EN'}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={16} color={colors.tertiaryText} />
            </View>
          </TouchableOpacity>

          <View style={[styles.groupDivider, { backgroundColor: colors.borderLight }]} />

          {/* Privacy & Body Data */}
          <TouchableOpacity style={styles.groupItem} activeOpacity={0.7}>
            <View
              style={[
                styles.itemIconBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.primaryText }]}>
                {t('settings.privacy_body_data')}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.secondaryText }]}>
                {t('settings.stored_locally')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiaryText} />
          </TouchableOpacity>
        </View>

        {/* Footer System Version */}
        <View style={styles.footerVersion}>
          <Text style={[styles.versionTitle, { color: colors.tertiaryText }]}>
            FITGLASS STUDIO · IOS NATIVE BUILD
          </Text>
          <Text style={[styles.versionSubtitle, { color: colors.tertiaryText }]}>
            Version 1.0.4 · Engine Rev 2026.9 · {isDark ? 'Dark Mode' : 'Light Mode'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.huge,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupHeader: {
    ...Typography.micro,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  groupCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  itemSubtitle: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  rightNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editActionText: {
    ...Typography.caption,
    fontWeight: '600',
    marginRight: 4,
  },
  valueText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  languageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 4,
  },
  languageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
  },
  footerVersion: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  versionTitle: {
    ...Typography.micro,
    letterSpacing: 1,
  },
  versionSubtitle: {
    ...Typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
});
