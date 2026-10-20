import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { Header } from '../components/Header';
import { GarmentCard } from '../components/GarmentCard';
import { BottomSheet } from '../components/BottomSheet';
import { PrimaryButton } from '../components/Buttons';
import { Garment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface WardrobeScreenProps {
  garments: Garment[];
  onSelectGarment: (garment: Garment) => void;
  onAddGarment: () => void;
  onOpenProfile: () => void;
}

const CATEGORY_KEYS: { key: string; i18nKey: string }[] = [
  { key: 'All', i18nKey: 'common.all' },
  { key: 'Tops', i18nKey: 'common.tops' },
  { key: 'Outerwear', i18nKey: 'common.outerwear' },
  { key: 'Pants', i18nKey: 'common.pants' },
  { key: 'Shoes', i18nKey: 'common.shoes' },
  { key: 'Accessories', i18nKey: 'common.accessories' },
];

export const WardrobeScreen: React.FC<WardrobeScreenProps> = ({
  garments,
  onSelectGarment,
  onAddGarment,
  onOpenProfile,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [filterFit, setFilterFit] = useState<string>('All');
  const [filterPaletteOnly, setFilterPaletteOnly] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    'g-1': true,
    'g-2': true,
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredGarments = useMemo(() => {
    return garments.filter((g) => {
      // Category filter
      if (selectedCategory !== 'All' && g.category !== selectedCategory) {
        return false;
      }
      // Fit filter
      if (filterFit !== 'All' && g.fit !== filterFit) {
        return false;
      }
      // Palette only filter
      if (filterPaletteOnly && !g.paletteHarmony) {
        return false;
      }
      // Search filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(query);
        const matchesCategory = g.category.toLowerCase().includes(query);
        const matchesBrand = g.brand.toLowerCase().includes(query);
        const matchesColor = g.colorName.toLowerCase().includes(query);
        return matchesName || matchesCategory || matchesBrand || matchesColor;
      }
      return true;
    });
  }, [garments, selectedCategory, filterFit, filterPaletteOnly, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        title={t('wardrobe.title')}
        subtitle={`${garments.length} ${t('wardrobe.curatedPieces')}`}
        showAvatar
        onAvatarPress={onOpenProfile}
        rightAction={{
          icon: 'add-outline',
          onPress: onAddGarment,
        }}
      />

      {/* Search & Filter Bar */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
          ]}
        >
          <Ionicons name="search" size={17} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.primaryText }]}
            placeholder={t('wardrobe.searchPlaceholder')}
            placeholderTextColor={colors.tertiaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.tertiaryText} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            (filterFit !== 'All' || filterPaletteOnly) && [
              styles.filterButtonActive,
              { backgroundColor: colors.cta, borderColor: colors.cta },
            ],
          ]}
          onPress={() => setFilterSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={
              filterFit !== 'All' || filterPaletteOnly
                ? colors.ctaText
                : colors.primaryText
            }
          />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={[styles.categoryTabsContainer, { borderBottomColor: colors.borderLight }]}>
        <FlatList
          data={CATEGORY_KEYS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.categoryTabsContent}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  isActive && [
                    styles.categoryTabActive,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ],
                ]}
                onPress={() => setSelectedCategory(item.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    { color: colors.secondaryText },
                    isActive && [styles.categoryTabTextActive, { color: colors.primaryText }],
                  ]}
                >
                  {t(item.i18nKey)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Garments 2-Column Grid or Empty State */}
      {filteredGarments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="shirt-outline" size={36} color={colors.tertiaryText} />
          </View>
          <Text style={[Typography.title2, styles.emptyTitle, { color: colors.primaryText }]}>
            {t('wardrobe.emptyTitle')}
          </Text>
          <Text style={[Typography.body, styles.emptySubtitle, { color: colors.secondaryText }]}>
            {t('wardrobe.emptyDesc')}
          </Text>
          <PrimaryButton
            label={t('addGarment.title')}
            onPress={onAddGarment}
            icon="camera-outline"
            style={{ marginTop: Spacing.xl, width: 220 }}
          />
        </View>
      ) : (
        <FlatList
          data={filteredGarments}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <GarmentCard
                garment={item}
                onPress={() => onSelectGarment(item)}
                onFavoriteToggle={() => toggleFavorite(item.id)}
                isFavorite={!!favorites[item.id]}
              />
            </View>
          )}
        />
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title={t('wardrobe.filterTitle')}
        subtitle={t('wardrobe.filterSubtitle')}
        rightAction={{
          label: t('wardrobe.reset'),
          onPress: () => {
            setFilterFit('All');
            setFilterPaletteOnly(false);
          },
        }}
      >
        <View style={styles.filterSheetContent}>
          <Text style={[styles.filterGroupTitle, { color: colors.tertiaryText }]}>
            {t('wardrobe.filterFit')}
          </Text>
          <View style={styles.filterPillsRow}>
            {['All', 'Slim', 'Regular', 'Relaxed', 'Oversized'].map((fit) => (
              <TouchableOpacity
                key={fit}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  filterFit === fit && [styles.filterPillActive, { backgroundColor: colors.cta, borderColor: colors.cta }],
                ]}
                onPress={() => setFilterFit(fit)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: colors.secondaryText },
                    filterFit === fit && [styles.filterPillTextActive, { color: colors.ctaText }],
                  ]}
                >
                  {fit === 'All' ? t('common.all') : fit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterGroupTitle, { marginTop: Spacing.lg, color: colors.tertiaryText }]}>
            {t('colorStudio.title')}
          </Text>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setFilterPaletteOnly(!filterPaletteOnly)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: colors.primaryText }]}>
                {t('wardrobe.filterPalette')}
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.secondaryText }]}>
                {t('wardrobe.filterPaletteDesc')}
              </Text>
            </View>
            <View
              style={[
                styles.checkboxBox,
                { borderColor: colors.border },
                filterPaletteOnly && [styles.checkboxBoxActive, { backgroundColor: colors.cta, borderColor: colors.cta }],
              ]}
            >
              {filterPaletteOnly && (
                <Ionicons name="checkmark" size={14} color={colors.ctaText} />
              )}
            </View>
          </TouchableOpacity>

          <PrimaryButton
            label={t('wardrobe.apply')}
            onPress={() => setFilterSheetVisible(false)}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 14,
    marginLeft: Spacing.xs,
    paddingVertical: 0,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {},
  categoryTabsContainer: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryTabsContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  categoryTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  categoryTabActive: {
    borderWidth: 1,
  },
  categoryTabText: {
    ...Typography.subhead,
    fontSize: 13,
  },
  categoryTabTextActive: {
    fontWeight: '600',
  },
  gridContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.huge,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardWrapper: {
    width: '48%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.huge,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  filterSheetContent: {
    paddingVertical: Spacing.sm,
  },
  filterGroupTitle: {
    ...Typography.micro,
    marginBottom: Spacing.sm,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterPillActive: {},
  filterPillText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  filterPillTextActive: {
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleTitle: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  toggleDesc: {
    ...Typography.caption,
    marginTop: 2,
    maxWidth: '90%',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {},
});
