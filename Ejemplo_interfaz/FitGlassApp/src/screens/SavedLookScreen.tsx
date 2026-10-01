import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { SavedLookItem, Garment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface SavedLookScreenProps {
  look: SavedLookItem;
  onBack: () => void;
  onTryAgain: (look: SavedLookItem) => void;
  onEditLook: (look: SavedLookItem) => void;
  onRemoveLook: (id: string) => void;
  onSelectGarment: (garment: Garment) => void;
}

export const SavedLookScreen: React.FC<SavedLookScreenProps> = ({
  look,
  onBack,
  onTryAgain,
  onEditLook,
  onRemoveLook,
  onSelectGarment,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={look.title}
        subtitle={`${t('savedLook.composed')} · ${look.date}`}
        onBack={onBack}
        rightAction={{
          icon: 'share-outline',
          onPress: () => {},
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Outfit Preview Silhouette Visual */}
        <View
          style={[
            styles.previewCanvas,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          {/* Subtle architectural vertical axis */}
          <View style={[styles.centralAxis, { backgroundColor: colors.borderLight }]} />

          {/* Abstract stacked garments silhouette */}
          <View style={styles.stackedFigureContainer}>
            <View style={[styles.avatarHead, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]} />
            <View style={styles.avatarTorso}>
              <Ionicons name="shirt-outline" size={32} color={colors.primaryText} />
            </View>
            <View style={styles.avatarLegs}>
              <Ionicons name="reorder-two-outline" size={30} color={colors.secondaryText} />
            </View>
          </View>

          {/* Palette Swatches Bar */}
          <View
            style={[
              styles.paletteStamp,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
            ]}
          >
            {look.garments.map((g, idx) => (
              <View
                key={idx}
                style={[
                  styles.paletteDot,
                  { backgroundColor: g.colorHex },
                  g.colorHex === '#FFFFFF' && { borderWidth: 1, borderColor: colors.border },
                ]}
              />
            ))}
            <Text style={[styles.paletteThemeText, { color: colors.secondaryText }]}>{look.paletteTheme}</Text>
          </View>
        </View>

        {/* Outfit Metadata Details */}
        <View
          style={[
            styles.metaCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.metaRow}>
            <View>
              <Text style={[styles.metaPreheader, { color: colors.tertiaryText }]}>
                {t('savedLook.fitHarmony')}
              </Text>
              <Text style={[styles.metaValue, { color: colors.primaryText }]}>{look.fitScore}</Text>
            </View>
            <View style={[styles.dateBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}>
              <Text style={[styles.dateText, { color: colors.secondaryText }]}>{look.date}</Text>
            </View>
          </View>
        </View>

        {/* Garments in this Look */}
        <View style={styles.piecesSection}>
          <Text style={[styles.sectionHeader, { color: colors.tertiaryText }]}>
            {t('savedLook.piecesSection')} ({look.garments.length})
          </Text>

          {look.garments.map((garment) => (
            <TouchableOpacity
              key={garment.id}
              style={[
                styles.garmentRowItem,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
              onPress={() => onSelectGarment(garment)}
              activeOpacity={0.7}
            >
              <View style={[styles.garmentDot, { backgroundColor: garment.colorHex }]} />
              <View style={styles.garmentRowInfo}>
                <Text style={[styles.garmentRowName, { color: colors.primaryText }]}>{garment.name}</Text>
                <Text style={[styles.garmentRowMeta, { color: colors.secondaryText }]}>
                  {garment.category} · {garment.brand} · {garment.fit}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiaryText} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Controls */}
        <View style={styles.actionButtons}>
          <PrimaryButton
            label={t('savedLook.tryOnOutfit')}
            onPress={() => onTryAgain(look)}
            icon="cube-outline"
          />
          <SecondaryButton
            label={t('savedLook.editLayers')}
            onPress={() => onEditLook(look)}
            icon="create-outline"
            style={{ marginTop: Spacing.sm }}
          />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onRemoveLook(look.id)}
          >
            <Text style={styles.deleteText}>{t('savedLook.deleteLook')}</Text>
          </TouchableOpacity>
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
  previewCanvas: {
    height: 240,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  centralAxis: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  stackedFigureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  avatarTorso: {
    alignItems: 'center',
    marginVertical: 2,
  },
  avatarLegs: {
    alignItems: 'center',
    marginTop: 2,
  },
  paletteStamp: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  paletteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paletteThemeText: {
    ...Typography.micro,
    fontSize: 9,
  },
  metaCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaPreheader: {
    ...Typography.micro,
    letterSpacing: 1,
  },
  metaValue: {
    ...Typography.subhead,
    fontWeight: '700',
    marginTop: 2,
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  dateText: {
    ...Typography.micro,
    fontSize: 10,
  },
  piecesSection: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    ...Typography.micro,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  garmentRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
  },
  garmentDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: Spacing.md,
  },
  garmentRowInfo: {
    flex: 1,
  },
  garmentRowName: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  garmentRowMeta: {
    ...Typography.caption,
    marginTop: 1,
  },
  actionButtons: {
    marginTop: Spacing.xl,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  deleteText: {
    ...Typography.caption,
    color: '#EF4444',
    fontWeight: '500',
  },
});
