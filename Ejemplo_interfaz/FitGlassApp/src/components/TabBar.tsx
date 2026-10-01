import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabName } from '../types';
import { Colors as DefaultColors, Spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface TabBarProps {
  currentTab: TabName;
  onTabChange: (tab: TabName) => void;
  bottomInset?: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onTabChange,
  bottomInset = 16,
}) => {
  let colors = DefaultColors;
  try {
    const themeCtx = useTheme();
    if (themeCtx?.colors) {
      colors = themeCtx.colors;
    }
  } catch (e) {
    // Fallback to static colors if rendered outside ThemeProvider
  }

  let language = 'es';
  try {
    const langCtx = useLanguage();
    if (langCtx?.language) {
      language = langCtx.language;
    }
  } catch (e) {
    // Fallback
  }

  const isSpanish = language === 'es';

  const tabs: {
    key: TabName;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      key: 'HOME',
      label: isSpanish ? 'Inicio' : 'Home',
      icon: 'home-outline',
      activeIcon: 'home',
    },
    {
      key: 'WARDROBE',
      label: isSpanish ? 'Armario' : 'Wardrobe',
      icon: 'grid-outline',
      activeIcon: 'grid',
    },
    {
      key: 'FITTING_ROOM',
      label: isSpanish ? 'Probador' : 'Fitting',
      icon: 'cube-outline',
      activeIcon: 'cube',
    },
    {
      key: 'COLOR_STUDIO',
      label: isSpanish ? 'Color' : 'Studio',
      icon: 'color-palette-outline',
      activeIcon: 'color-palette',
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderLight,
          paddingBottom: Math.max(bottomInset, 12),
        },
      ]}
    >
      <View style={styles.tabBarInner}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={20}
                  color={isActive ? colors.primaryText : colors.tertiaryText}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.primaryText : colors.tertiaryText,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 32,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.1,
  },
});
