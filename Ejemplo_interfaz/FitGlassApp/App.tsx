import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  useFonts,
  BodoniModa_400Regular,
  BodoniModa_500Medium,
  BodoniModa_600SemiBold,
  BodoniModa_700Bold,
} from '@expo-google-fonts/bodoni-moda';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider, useTranslation } from './src/contexts/LanguageContext';
import { UserProvider, useUser } from './src/contexts/UserContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { FittingRoomScreen } from './src/screens/FittingRoomScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ColorStudioScreen } from './src/screens/ColorStudioScreen';
import { AddGarmentScreen } from './src/screens/AddGarmentScreen';
import { GarmentProcessingScreen } from './src/screens/GarmentProcessingScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { BodyProfileScreen } from './src/screens/BodyProfileScreen';
import { ColorRecommendationsScreen } from './src/screens/ColorRecommendationsScreen';
import { FitResultScreen } from './src/screens/FitResultScreen';
import { Garment3DPreviewScreen } from './src/screens/Garment3DPreviewScreen';
import { GarmentDetailsScreen } from './src/screens/GarmentDetailsScreen';
import { GarmentViewScreen } from './src/screens/GarmentViewScreen';
import { OutfitBuilderScreen } from './src/screens/OutfitBuilderScreen';
import { SavedLookScreen } from './src/screens/SavedLookScreen';
import { RootTabParamList, RootStackParamList } from './src/navigation/types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function AppTabs() {
  const { colors } = useTheme();
  const { t } = useTranslation();

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
          fontFamily: 'BodoniModa_600SemiBold',
          fontSize: 18,
          color: colors.primaryText,
          letterSpacing: -0.2,
        },
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.cta,
        tabBarInactiveTintColor: colors.tertiaryText,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Outfit_500Medium',
          fontSize: 11,
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
          title: t('tabs.home'),
          headerTitle: `Vitra · ${t('tabs.home')}`,
        }}
      />
      <Tab.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{
          title: t('tabs.wardrobe'),
          headerTitle: `Vitra · ${t('tabs.wardrobe')}`,
        }}
      />
      <Tab.Screen
        name="FittingRoom"
        component={FittingRoomScreen}
        options={{
          title: t('tabs.fittingRoom'),
          headerTitle: `Vitra · ${t('tabs.fittingRoom')}`,
        }}
      />
      <Tab.Screen
        name="ColorStudio"
        component={ColorStudioScreen}
        options={{
          title: t('tabs.colorStudio'),
          headerTitle: `Vitra · ${t('tabs.colorStudio')}`,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('tabs.profile'),
          headerTitle: `Vitra · ${t('tabs.profile')}`,
        }}
      />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { colors, isDark } = useTheme();
  const { userToken, isLoadingToken } = useAuth();

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

  if (isLoadingToken) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.primaryText} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        key={userToken ? 'user-main' : 'guest-auth'}
        initialRouteName={!userToken ? 'Auth' : 'MainTabs'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!userToken ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <Stack.Group>
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
            <Stack.Screen
              name="ColorRecommendations"
              component={ColorRecommendationsScreen as any}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="FitResult"
              component={FitResultScreen as any}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="Garment3DPreview"
              component={Garment3DPreviewScreen as any}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="GarmentDetails"
              component={GarmentDetailsScreen as any}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="GarmentView"
              component={GarmentViewScreen as any}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="OutfitBuilder"
              component={OutfitBuilderScreen as any}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="SavedLook"
              component={SavedLookScreen as any}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BodoniModa_400Regular,
    BodoniModa_500Medium,
    BodoniModa_600SemiBold,
    BodoniModa_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F9F9F7',
        }}
      >
        <ActivityIndicator size="large" color="#3C6473" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <UserProvider>
              <NavigationRoot />
            </UserProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
