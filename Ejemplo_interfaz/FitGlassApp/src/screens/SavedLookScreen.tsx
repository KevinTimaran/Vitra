import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { SavedLookItem, Garment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
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
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { removeLook } = useUser();

  const look = props.look || props.route?.params?.look;

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
        model_3d_url: look.model3dUrl,
        image_2d_url: look.image2dUrl,
      });
    }
  };

  const handleEditLook = () => {
    if (!look) return;
    if (props.onEditLook) {
      props.onEditLook(look);
    } else if (props.navigation) {
      props.navigation.navigate('OutfitBuilder', { look });
    }
  };

  const handleRemove = () => {
    if (!look) return;
    if (props.onRemoveLook) {
      props.onRemoveLook(look.id);
    } else {
      removeLook(look.id);
      if (props.navigation?.canGoBack()) {
        props.navigation.goBack();
      }
    }
  };

  const handleSelectGarment = (garment: Garment) => {
    if (props.onSelectGarment) {
      props.onSelectGarment(garment);
    } else if (props.navigation) {
      props.navigation.navigate('GarmentDetail', { garment });
    }
  };

  if (!look) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Header title="Detalle de Look" onBack={handleBack} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.secondaryText} />
          <Text style={{ ...Typography.headline, color: colors.primaryText, marginTop: Spacing.md }}>
            No se encontró el look
          </Text>
          <PrimaryButton label="Volver" onPress={handleBack} style={{ marginTop: Spacing.lg }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={look.title}
        subtitle={`${t('savedLook.composed')} · ${look.date}`}
        onBack={handleBack}
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
        {/* Large Outfit Preview Silhouette Visual in GlassCard */}
        <GlassCard
          variant="subtle"
          intensity={20}
          style={styles.previewCanvas}
        >
          {look.image2dUrl ? (
            <Image
              source={{ uri: look.image2dUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <>
              {/* Subtle architectural vertical axis */}
              <View style={[styles.centralAxis, { backgroundColor: colors.borderLight }]} />

              {/* Abstract stacked garments silhouette */}
              <View style={styles.stackedFigureContainer}>
                <View style={[styles.avatarHead, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]} />
                <View style={styles.avatarTorso}>
                  <Ionicons name="shirt-outline" size={32} color={colors.primary} />
                </View>
                <View style={styles.avatarLegs}>
                  <Ionicons name="reorder-two-outline" size={30} color={colors.secondaryText} />
                </View>
              </View>
            </>
          )}

          {/* Palette Swatches Bar */}
          <View
            style={[
              styles.paletteStamp,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            {look.garments?.map((g, idx) => (
              <View
                key={idx}
                style={[
                  styles.paletteDot,
                  { backgroundColor: g.colorHex || '#8B5CF6' },
                  g.colorHex === '#FFFFFF' && { borderWidth: 1, borderColor: colors.border },
                ]}
              />
            ))}
            <Text style={[styles.paletteThemeText, { color: colors.secondaryText }]}>{look.paletteTheme}</Text>
          </View>
        </GlassCard>

        {/* Outfit Metadata Details */}
        <GlassCard
          variant="subtle"
          intensity={15}
          style={styles.metaCard}
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
        </GlassCard>

        {/* Garments in this Look */}
        <View style={styles.piecesSection}>
          <Text style={[styles.sectionHeader, { color: colors.tertiaryText }]}>
            {t('savedLook.piecesSection')} ({look.garments?.length || 0})
          </Text>

          {look.garments?.map((garment) => (
            <TouchableOpacity
              key={garment.id}
              onPress={() => handleSelectGarment(garment)}
              activeOpacity={0.7}
            >
              <GlassCard
                variant="subtle"
                intensity={12}
                style={styles.garmentRowItem}
              >
                <View style={[styles.garmentDot, { backgroundColor: garment.colorHex || '#8B5CF6' }]} />
                <View style={styles.garmentRowInfo}>
                  <Text style={[styles.garmentRowName, { color: colors.primaryText }]}>{garment.name}</Text>
                  <Text style={[styles.garmentRowMeta, { color: colors.secondaryText }]}>
                    {garment.category} · {garment.brand} · {garment.fit}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.tertiaryText} />
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Controls */}
        <View style={styles.actionButtons}>
          <PrimaryButton
            label={t('savedLook.tryOnOutfit')}
            onPress={handleTryAgain}
            icon="cube-outline"
          />
          <SecondaryButton
            label={t('savedLook.editLayers')}
            onPress={handleEditLook}
            icon="create-outline"
            style={{ marginTop: Spacing.sm }}
          />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleRemove}
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
    paddingHorizontal: 12,
    paddingTop: Spacing.md,
    paddingBottom: 85,
  },
  previewCanvas: {
    height: 240,
    borderRadius: Radius.lg,
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
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  paletteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paletteThemeText: {
    ...Typography.micro,
    fontSize: 9,
    fontFamily: 'Outfit-Medium',
  },
  metaCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaPreheader: {
    ...Typography.micro,
    letterSpacing: 1.2,
    fontFamily: 'Outfit-Bold',
  },
  metaValue: {
    ...Typography.subhead,
    fontFamily: 'Outfit-SemiBold',
    marginTop: 2,
  },
  dateBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dateText: {
    ...Typography.micro,
    fontSize: 10,
    fontFamily: 'Outfit-Medium',
  },
  piecesSection: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    ...Typography.micro,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    fontFamily: 'Outfit-Bold',
  },
  garmentRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xs,
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
    fontFamily: 'Outfit-SemiBold',
  },
  garmentRowMeta: {
    ...Typography.caption,
    marginTop: 1,
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Medium',
  },
});
