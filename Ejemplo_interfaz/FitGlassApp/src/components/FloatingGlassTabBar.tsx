// src/components/FloatingGlassTabBar.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabItemProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  isDark: boolean;
  colors: any;
  label: string;
}

const getTabIconName = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Wardrobe':
      return focused ? 'shirt' : 'shirt-outline';
    case 'FittingRoom':
      return focused ? 'sparkles' : 'sparkles-outline';
    case 'ColorStudio':
      return focused ? 'color-palette' : 'color-palette-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return focused ? 'apps' : 'apps-outline';
  }
};

const TabItem: React.FC<TabItemProps> = ({
  routeName,
  isFocused,
  onPress,
  onLongPress,
  isDark,
  colors,
  label,
}) => {
  const isFittingRoom = routeName === 'FittingRoom';
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(isFocused ? -2 : 0)).current;

  useEffect(() => {
    Animated.spring(translateYAnim, {
      toValue: isFocused ? -2 : 0,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.0,
        friction: 4,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: isFocused ? -2 : 0,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const iconName = getTabIconName(routeName, isFocused);

  // Colores activos e inactivos basados en el diseño Uiverse
  const activeIconColor = isFittingRoom
    ? '#D946EF'
    : isDark
    ? '#FFFFFF'
    : colors.primaryText;

  const inactiveIconColor = isDark
    ? 'rgba(255, 255, 255, 0.45)'
    : 'rgba(0, 0, 0, 0.40)';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButtonWrapper}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.tabContentContainer,
          isFocused && styles.tabContentFocused,
          isFocused && isFittingRoom && styles.fittingRoomFocused,
          isFocused && {
            backgroundColor: isFittingRoom
              ? 'rgba(149, 0, 255, 0.25)'
              : isDark
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(0, 0, 0, 0.06)',
            borderColor: isFittingRoom
              ? 'rgba(217, 70, 239, 0.45)'
              : isDark
              ? 'rgba(255, 255, 255, 0.18)'
              : 'rgba(0, 0, 0, 0.08)',
          },
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <Ionicons
          name={iconName}
          size={isFittingRoom ? 23 : 21}
          color={isFocused ? activeIconColor : inactiveIconColor}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeIconColor : inactiveIconColor,
              fontWeight: isFocused ? '600' : '400',
            },
          ]}
        >
          {label}
        </Text>

        {/* Micro-indicador de punto activo para mayor feedback visual */}
        {isFocused && (
          <View
            style={[
              styles.activeDot,
              {
                backgroundColor: isFittingRoom ? '#D946EF' : activeIconColor,
              },
            ]}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const FloatingGlassTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();

  // Posicionamiento más bajo para no estorbar ni tapar contenido inferior
  const bottomOffset = insets.bottom > 0 ? Math.max(insets.bottom - 14, 6) : 6;

  const getLabelForRoute = (name: string): string => {
    switch (name) {
      case 'Home':
        return t('tabs.home') || 'Inicio';
      case 'Wardrobe':
        return t('tabs.wardrobe') || 'Armario';
      case 'FittingRoom':
        return t('tabs.fittingRoom') || 'Probador';
      case 'ColorStudio':
        return t('tabs.colorStudio') || 'Color';
      case 'Profile':
        return t('tabs.profile') || 'Perfil';
      default:
        return name;
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerContainer,
        {
          bottom: bottomOffset,
        },
      ]}
    >
      {/* Sombra ambiental flotante inspirada en #0d2626 del diseño Uiverse */}
      <View
        style={[
          styles.glassCardShadow,
          Platform.OS === 'web' && ({
            boxShadow: '0 8px 32px 0 #0d2626',
          } as any),
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'web' ? 25 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.blurSurface,
            {
              backgroundColor: isDark
                ? 'rgba(18, 20, 26, 0.72)'
                : 'rgba(255, 255, 255, 0.85)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(255, 255, 255, 0.70)',
            },
          ]}
        >
          {/* Línea de brillo especular superior característica de cristal */}
          <View
            style={[
              styles.specularSheen,
              {
                borderTopColor: isDark
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(255, 255, 255, 0.90)',
              },
            ]}
          />

          <View style={styles.buttonsRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const label =
                options.tabBarLabel !== undefined
                  ? String(options.tabBarLabel)
                  : options.title !== undefined
                  ? options.title
                  : getLabelForRoute(route.name);

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <TabItem
                  key={route.key}
                  routeName={route.name}
                  isFocused={isFocused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  isDark={isDark}
                  colors={colors}
                  label={label}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 8,
    right: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  glassCardShadow: {
    width: '100%',
    borderRadius: 30,
    shadowColor: '#0d2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: 'transparent',
  },
  blurSurface: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  specularSheen: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    borderTopWidth: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tabButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  tabContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 46,
    minHeight: 40,
  },
  tabContentFocused: {
    shadowColor: '#0d2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  fittingRoomFocused: {
    shadowColor: '#9500FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  tabLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
