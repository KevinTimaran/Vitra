import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Viewport3DPlaceholder } from '../components/Viewport3DPlaceholder';
import { BottomSheet } from '../components/BottomSheet';
import { SliderControl } from '../components/SliderControl';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Garment, FitSettings } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface FittingRoomScreenProps {
  garment: Garment;
  garmentsList: Garment[];
  onSelectGarment: (g: Garment) => void;
  onSeeFitResult: (fitSettings: FitSettings) => void;
  onBuildOutfit: () => void;
  onBack?: () => void;
}

export const FittingRoomScreen: React.FC<FittingRoomScreenProps> = ({
  garment,
  garmentsList,
  onSelectGarment,
  onSeeFitResult,
  onBuildOutfit,
  onBack,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [fitSheetVisible, setFitSheetVisible] = useState(false);
  const [switchSheetVisible, setSwitchSheetVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(garment.paletteHarmony);

  // Fit Adjustment Parameters
  const [size, setSize] = useState<'S' | 'M' | 'L' | 'XL'>('M');
  const [tightness, setTightness] = useState(0); // -50 to 50
  const [chest, setChest] = useState(96);
  const [waist, setWaist] = useState(82);
  const [hips, setHips] = useState(98);
  const [shoulders, setShoulders] = useState(44);

  const handleApplyFit = () => {
    setFitSheetVisible(false);
    onSeeFitResult({
      size,
      tightness,
      chest,
      waist,
      hips,
      shoulders,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Overlay Controls Bar */}
      <View
        style={[
          styles.topOverlayBar,
          { backgroundColor: colors.bg, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.topLeft}>
          {onBack ? (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.atelierBadge,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.atelierBadgeText, { color: colors.secondaryText }]}>
                {t('fittingRoom.badge')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.garmentHeaderSelector}
            onPress={() => setSwitchSheetVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.garmentHeaderName, { color: colors.primaryText }]} numberOfLines={1}>
              {garment.name}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? colors.primaryText : colors.secondaryText}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setSwitchSheetVisible(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main ~70% 3D Viewport Placeholder */}
      <View style={styles.viewportArea}>
        <Viewport3DPlaceholder
          currentGarmentName={`${garment.name} · Size ${size}`}
          heightRatio={0.62}
        />
      </View>

      {/* Bottom Floating Control Bar */}
      <View
        style={[
          styles.bottomControlPanel,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.panelHeaderRow}>
          <View>
            <Text style={[styles.panelTitle, { color: colors.primaryText }]}>
              {t('fittingRoom.studioTitle')}
            </Text>
            <Text style={[styles.panelSubtitle, { color: colors.secondaryText }]}>
              {garment.brand} · {garment.material}
            </Text>
          </View>
          <View
            style={[
              styles.activeSizeTag,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.activeSizeText, { color: colors.primaryText }]}>
              {t('fittingRoom.fitTag')}: {garment.fit.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: colors.cta, flex: 1 }]}
            onPress={() => setFitSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="options" size={20} color={colors.ctaText} />
            <Text style={[styles.primaryActionText, { color: colors.ctaText }]}>
              {t('fittingRoom.adjustFit')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconAction, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
            onPress={() => setSwitchSheetVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={22} color={colors.primaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconAction, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}
            onPress={onBuildOutfit}
            activeOpacity={0.7}
          >
            <Ionicons name="layers-outline" size={22} color={colors.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FITTING ROOM CONTROLS BOTTOM SHEET */}
      <BottomSheet
        visible={fitSheetVisible}
        onClose={() => setFitSheetVisible(false)}
        title={t('fittingRoom.sheetTitle')}
        subtitle={t('fittingRoom.sheetSubtitle')}
        rightAction={{
          label: t('common.reset'),
          onPress: () => {
            setSize('M');
            setTightness(0);
            setChest(96);
            setWaist(82);
            setHips(98);
            setShoulders(44);
          },
        }}
      >
        <View style={styles.fitSheetBody}>
          {/* Size Selector */}
          <Text style={[styles.controlHeader, { color: colors.tertiaryText }]}>
            {t('fittingRoom.targetSize')}
          </Text>
          <View style={[styles.sizeSegment, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight }]}>
            {(['S', 'M', 'L', 'XL'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sizeOption,
                  size === s && [styles.sizeOptionActive, { backgroundColor: colors.cta }],
                ]}
                onPress={() => setSize(s)}
              >
                <Text
                  style={[
                    styles.sizeOptionText,
                    { color: colors.secondaryText },
                    size === s && [styles.sizeOptionTextActive, { color: colors.ctaText }],
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Garment Tightness */}
          <View style={{ marginTop: Spacing.md }}>
            <SliderControl
              label={t('fittingRoom.tensionLabel')}
              value={tightness}
              unit="%"
              min={-50}
              max={50}
              step={5}
              onChange={setTightness}
              leftLabel={t('fittingRoom.tensionEased')}
              rightLabel={t('fittingRoom.tensionSnug')}
            />
          </View>

          {/* Body Morph Proportions */}
          <Text style={[styles.controlHeader, { marginTop: Spacing.md, color: colors.tertiaryText }]}>
            {t('bodyProfile.calibrationBadge')}
          </Text>

          <SliderControl
            label={t('fittingRoom.chestLabel')}
            value={chest}
            unit="cm"
            min={80}
            max={120}
            step={1}
            onChange={setChest}
            leftLabel="80 cm"
            rightLabel="120 cm"
          />

          <SliderControl
            label={t('fittingRoom.waistLabel')}
            value={waist}
            unit="cm"
            min={65}
            max={110}
            step={1}
            onChange={setWaist}
            leftLabel="65 cm"
            rightLabel="110 cm"
          />

          <SliderControl
            label={t('fittingRoom.hipsLabel')}
            value={hips}
            unit="cm"
            min={80}
            max={125}
            step={1}
            onChange={setHips}
            leftLabel="80 cm"
            rightLabel="125 cm"
          />

          <SliderControl
            label={t('fittingRoom.shouldersLabel')}
            value={shoulders}
            unit="cm"
            min={38}
            max={56}
            step={1}
            onChange={setShoulders}
            leftLabel="38 cm"
            rightLabel="56 cm"
          />

          <PrimaryButton
            label={t('fittingRoom.seeResult')}
            onPress={handleApplyFit}
            icon="checkmark-outline"
            style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
          />
        </View>
      </BottomSheet>

      {/* Switch Garment Bottom Sheet */}
      <BottomSheet
        visible={switchSheetVisible}
        onClose={() => setSwitchSheetVisible(false)}
        title={t('fittingRoom.switchSheetTitle')}
        subtitle={t('fittingRoom.switchSheetSubtitle')}
      >
        <View style={styles.switchList}>
          {garmentsList.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.switchItem,
                { borderBottomColor: colors.borderLight },
                item.id === garment.id && [styles.switchItemActive, { backgroundColor: colors.surfaceSubtle }],
              ]}
              onPress={() => {
                onSelectGarment(item);
                setSwitchSheetVisible(false);
              }}
            >
              <View style={[styles.switchDot, { backgroundColor: item.colorHex }]} />
              <View style={styles.switchInfo}>
                <Text style={[styles.switchName, { color: colors.primaryText }]}>{item.name}</Text>
                <Text style={[styles.switchMeta, { color: colors.secondaryText }]}>
                  {item.category} · {item.colorName} · Size {item.size}
                </Text>
              </View>
              {item.id === garment.id && (
                <Ionicons name="checkmark" size={18} color={colors.primaryText} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topOverlayBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atelierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  atelierBadgeText: {
    ...Typography.micro,
    fontSize: 9,
  },
  garmentHeaderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    flex: 1,
    marginLeft: 4,
  },
  garmentHeaderName: {
    ...Typography.subhead,
    fontWeight: '600',
    marginRight: 4,
  },
  viewportArea: {
    flex: 1,
  },
  bottomControlPanel: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  panelTitle: {
    ...Typography.headline,
  },
  panelSubtitle: {
    ...Typography.caption,
    marginTop: 1,
  },
  activeSizeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  activeSizeText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryAction: {
    height: 52,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    ...Typography.subhead,
    fontWeight: '700',
  },
  iconAction: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitSheetBody: {
    paddingVertical: Spacing.sm,
  },
  controlHeader: {
    ...Typography.micro,
    marginBottom: Spacing.xs,
  },
  sizeSegment: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
  },
  sizeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  sizeOptionActive: {},
  sizeOptionText: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  sizeOptionTextActive: {
    fontWeight: '700',
  },
  switchList: {
    paddingVertical: Spacing.sm,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  switchItemActive: {
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  switchDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: Spacing.md,
  },
  switchInfo: {
    flex: 1,
  },
  switchName: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  switchMeta: {
    ...Typography.caption,
    marginTop: 2,
  },
});
