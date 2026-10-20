import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { UserProvider, useUser } from './src/contexts/UserContext';

import { HomeScreen } from './src/screens/HomeScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { FittingRoomScreen } from './src/screens/FittingRoomScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ColorStudioScreen } from './src/screens/ColorStudioScreen';
import { AddGarmentScreen } from './src/screens/AddGarmentScreen';
import { GarmentProcessingScreen } from './src/screens/GarmentProcessingScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { BodyProfileScreen } from './src/screens/BodyProfileScreen';
import { RootTabParamList, RootStackParamList } from './src/navigation/types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function AppTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: colors.primaryText,
          letterSpacing: -0.2,
        },
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.tertiaryText,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Wardrobe') {
            iconName = focused ? 'shirt' : 'shirt-outline';
          } else if (route.name === 'FittingRoom') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'ColorStudio') {
            iconName = focused ? 'color-palette' : 'color-palette-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size || 22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          headerTitle: 'Vitra · Inicio',
        }}
      />
      <Tab.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{
          title: 'Armario',
          headerTitle: 'Vitra · Armario',
        }}
      />
      <Tab.Screen
        name="FittingRoom"
        component={FittingRoomScreen}
        options={{
          title: 'Probador',
          headerTitle: 'Vitra · Probador',
        }}
      />
      <Tab.Screen
        name="ColorStudio"
        component={ColorStudioScreen}
        options={{
          title: 'Color',
          headerTitle: 'Vitra · Colorimetría',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          headerTitle: 'Vitra · Perfil',
        }}
      />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { colors, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.surface,
      text: colors.primaryText,
      border: colors.border,
      primary: colors.primaryText,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="MainTabs" component={AppTabs} />
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen as any}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="BodyProfile"
          component={BodyProfileScreen as any}
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ColorStudio"
          component={ColorStudioScreen as any}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="FittingRoom"
          component={FittingRoomScreen as any}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="AddGarment"
          component={AddGarmentScreen as any}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="GarmentProcessing"
          component={GarmentProcessingScreen as any}
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <UserProvider>
            <NavigationRoot />
          </UserProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
