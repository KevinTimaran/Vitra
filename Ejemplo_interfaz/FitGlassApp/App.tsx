import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  StatusBar as RNStatusBar,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius } from './src/theme';
import { ScreenName, TabName, Garment, BodyProfile, FitSettings, SavedLookItem } from './src/types';
import { GarmentAnalysis } from './src/services/ai/types';
import {
  INITIAL_BODY_PROFILE,
  MOCK_GARMENTS,
  MOCK_SAVED_LOOKS,
  COLOR_PALETTE_DATA,
} from './src/data/mockData';

// Screens
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { BodyProfileScreen } from './src/screens/BodyProfileScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { AddGarmentScreen } from './src/screens/AddGarmentScreen';
import { GarmentProcessingScreen } from './src/screens/GarmentProcessingScreen';
import { GarmentDetailsScreen } from './src/screens/GarmentDetailsScreen';
import { GarmentViewScreen } from './src/screens/GarmentViewScreen';
import { FittingRoomScreen } from './src/screens/FittingRoomScreen';
import { FitResultScreen } from './src/screens/FitResultScreen';
import { ColorStudioScreen } from './src/screens/ColorStudioScreen';
import { ColorRecommendationsScreen } from './src/screens/ColorRecommendationsScreen';
import { OutfitBuilderScreen } from './src/screens/OutfitBuilderScreen';
import { SavedLookScreen } from './src/screens/SavedLookScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { Garment3DPreviewScreen } from './src/screens/Garment3DPreviewScreen';

// Components
import { TabBar } from './src/components/TabBar';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider, useTranslation } from './src/contexts/LanguageContext';

function MainApp() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // App Global State
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('HOME');
  const [currentTab, setCurrentTab] = useState<TabName>('HOME');
  const [garments, setGarments] = useState<Garment[]>(MOCK_GARMENTS);
  const [savedLooks, setSavedLooks] = useState<SavedLookItem[]>(MOCK_SAVED_LOOKS);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(INITIAL_BODY_PROFILE);

  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [garmentAnalysis, setGarmentAnalysis] = useState<GarmentAnalysis | null>(null);

  // Active Selections for Detail / Fitting / Flow
  const [activeGarment, setActiveGarment] = useState<Garment>(MOCK_GARMENTS[0]);
  const [activeSavedLook, setActiveSavedLook] = useState<SavedLookItem>(MOCK_SAVED_LOOKS[0]);
  const [activeFitSettings, setActiveFitSettings] = useState<FitSettings>({
    size: 'M',
    tightness: 0,
    chest: INITIAL_BODY_PROFILE.chest,
    waist: INITIAL_BODY_PROFILE.waist,
    hips: INITIAL_BODY_PROFILE.hips,
    shoulders: INITIAL_BODY_PROFILE.shoulderWidth,
  });


  // Tab Navigation Handler
  const handleTabChange = (tab: TabName) => {
    setCurrentTab(tab);
    if (tab === 'HOME') setCurrentScreen('HOME');
    if (tab === 'WARDROBE') setCurrentScreen('WARDROBE');
    if (tab === 'COLOR_STUDIO') setCurrentScreen('COLOR_STUDIO');
    if (tab === 'PROFILE') setCurrentScreen('PROFILE');
  };

  // Determine if Bottom Tab Bar should be visible
  const isTabBarVisible =
    currentScreen === 'HOME' ||
    currentScreen === 'WARDROBE' ||
    currentScreen === 'COLOR_STUDIO' ||
    currentScreen === 'PROFILE';

  // Navigation Actions
  const handleSelectGarment = (garment: Garment) => {
    setActiveGarment(garment);
    setCurrentScreen('GARMENT_VIEW');
  };

  const handleTryOnGarment = (garment: Garment) => {
    setActiveGarment(garment);
    setCurrentScreen('FITTING_ROOM');
  };

  const handleAddGarmentSaved = (newGarment: Garment) => {
    setGarments((prev) => [newGarment, ...prev]);
    setActiveGarment(newGarment);
    setCurrentTab('WARDROBE');
    setCurrentScreen('WARDROBE');
  };

  const handleSaveLook = (newLook: SavedLookItem) => {
    setSavedLooks((prev) => [newLook, ...prev]);
    setActiveSavedLook(newLook);
    setCurrentScreen('SAVED_LOOK');
  };

  const handleRemoveLook = (lookId: string) => {
    setSavedLooks((prev) => prev.filter((l) => l.id !== lookId));
    setCurrentTab('HOME');
    setCurrentScreen('HOME');
  };

  // Screen Catalog for Reviewer Menu
  const ALL_SCREENS: { id: ScreenName; name: string; category: string }[] = [
    { id: 'WELCOME', name: '01 · Welcome / Onboarding', category: 'Onboarding' },
    { id: 'BODY_PROFILE', name: '02 · Body Profile Setup', category: 'Onboarding' },
    { id: 'HOME', name: '03 · Home Atelier', category: 'Core Tabs' },
    { id: 'WARDROBE', name: '04 · Wardrobe Catalog', category: 'Core Tabs' },
    { id: 'ADD_GARMENT', name: '05 · Add Garment (Camera UI)', category: 'Wardrobe' },
    { id: 'GARMENT_PROCESSING', name: '06 · Garment Processing', category: 'Wardrobe' },
    { id: 'GARMENT_DETAILS', name: '07 · Extracted Attributes Form', category: 'Wardrobe' },
    { id: 'GARMENT_VIEW', name: '08 · Garment Detail Page', category: 'Wardrobe' },
    { id: 'FITTING_ROOM', name: '09 · Fitting Room & Controls', category: 'Fitting' },
    { id: 'FIT_RESULT', name: '11 · Fit Result & Tension', category: 'Fitting' },
    { id: 'COLOR_STUDIO', name: '12 · Color Studio & Spectrum', category: 'Color' },
    { id: 'COLOR_RECOMMENDATIONS', name: '13 · Color Recommendations', category: 'Color' },
    { id: 'OUTFIT_BUILDER', name: '14 · Outfit Builder', category: 'Outfits' },
    { id: 'SAVED_LOOK', name: '15 · Saved Look Detail', category: 'Outfits' },
    { id: 'PROFILE', name: '16 · Profile & Settings', category: 'Settings' },
    { id: 'GARMENT_3D_PREVIEW', name: '17 · 3D Garment Preview', category: 'Wardrobe' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Main Screen Router */}
      <View style={styles.screenContainer}>
        {currentScreen === 'WELCOME' && (
          <WelcomeScreen
            onGetStarted={() => setCurrentScreen('BODY_PROFILE')}
            onSignIn={() => {
              setCurrentTab('HOME');
              setCurrentScreen('HOME');
            }}
          />
        )}

        {currentScreen === 'BODY_PROFILE' && (
          <BodyProfileScreen
            initialProfile={bodyProfile}
            onSave={(profile) => {
              setBodyProfile(profile);
              setCurrentTab('HOME');
              setCurrentScreen('HOME');
            }}
            onSkip={() => {
              setCurrentTab('HOME');
              setCurrentScreen('HOME');
            }}
          />
        )}

        {currentScreen === 'HOME' && (
          <HomeScreen
            garments={garments}
            savedLooks={savedLooks}
            paletteSwatches={COLOR_PALETTE_DATA.complementary}
            onOpenFittingRoom={() => {
              setCurrentScreen('FITTING_ROOM');
            }}
            onAddGarment={() => setCurrentScreen('ADD_GARMENT')}
            onOpenColorStudio={() => {
              setCurrentTab('COLOR_STUDIO');
              setCurrentScreen('COLOR_STUDIO');
            }}
            onOpenWardrobe={() => {
              setCurrentTab('WARDROBE');
              setCurrentScreen('WARDROBE');
            }}
            onSelectGarment={handleSelectGarment}
            onSelectLook={(look) => {
              setActiveSavedLook(look);
              setCurrentScreen('SAVED_LOOK');
            }}
            onOpenProfile={() => setCurrentScreen('PROFILE')}
          />
        )}

        {currentScreen === 'WARDROBE' && (
          <WardrobeScreen
            garments={garments}
            onSelectGarment={handleSelectGarment}
            onAddGarment={() => setCurrentScreen('ADD_GARMENT')}
            onOpenProfile={() => setCurrentScreen('PROFILE')}
          />
        )}

        {currentScreen === 'ADD_GARMENT' && (
          <AddGarmentScreen
            onPhotoConfirmed={(uri) => {
              setCapturedImageUri(uri);
              setCurrentScreen('GARMENT_PROCESSING');
            }}
            onClose={() => setCurrentScreen('WARDROBE')}
          />
        )}

        {currentScreen === 'GARMENT_PROCESSING' && (
          <GarmentProcessingScreen
            imageUri={capturedImageUri}
            onComplete={(analysis) => {
              setGarmentAnalysis(analysis);
              setCurrentScreen('GARMENT_DETAILS');
            }}
          />
        )}

        {currentScreen === 'GARMENT_DETAILS' && (
          <GarmentDetailsScreen
            imageUri={capturedImageUri}
            initialAnalysis={garmentAnalysis}
            onSaveToWardrobe={handleAddGarmentSaved}
            onCancel={() => setCurrentScreen('WARDROBE')}
          />
        )}

        {currentScreen === 'GARMENT_VIEW' && (
          <GarmentViewScreen
            garment={activeGarment}
            onBack={() => setCurrentScreen(currentTab)}
            onTryOn={handleTryOnGarment}
            onEdit={() => setCurrentScreen('GARMENT_DETAILS')}
            onView3D={(garment) => {
              setActiveGarment(garment);
              setCurrentScreen('GARMENT_3D_PREVIEW');
            }}
          />
        )}

        {currentScreen === 'GARMENT_3D_PREVIEW' && (
          <Garment3DPreviewScreen
            garment={activeGarment}
            onBack={() => setCurrentScreen('GARMENT_VIEW')}
          />
        )}

        {currentScreen === 'FITTING_ROOM' && (
          <FittingRoomScreen
            garment={activeGarment}
            garmentsList={garments}
            onSelectGarment={(g) => setActiveGarment(g)}
            onSeeFitResult={(settings) => {
              setActiveFitSettings(settings);
              setCurrentScreen('FIT_RESULT');
            }}
            onBuildOutfit={() => setCurrentScreen('OUTFIT_BUILDER')}
            onBack={() => setCurrentScreen(currentTab)}
          />
        )}

        {currentScreen === 'FIT_RESULT' && (
          <FitResultScreen
            garment={activeGarment}
            fitSettings={activeFitSettings}
            onBack={() => setCurrentScreen('FITTING_ROOM')}
            onFineTune={() => setCurrentScreen('FITTING_ROOM')}
            onBuildOutfit={() => setCurrentScreen('OUTFIT_BUILDER')}
          />
        )}

        {currentScreen === 'COLOR_STUDIO' && (
          <ColorStudioScreen
            onViewRecommendations={() => setCurrentScreen('COLOR_RECOMMENDATIONS')}
            onOpenProfile={() => setCurrentScreen('PROFILE')}
          />
        )}

        {currentScreen === 'COLOR_RECOMMENDATIONS' && (
          <ColorRecommendationsScreen
            garments={garments}
            onBack={() => setCurrentScreen('COLOR_STUDIO')}
            onSelectGarment={handleSelectGarment}
            onTryOn={handleTryOnGarment}
          />
        )}

        {currentScreen === 'OUTFIT_BUILDER' && (
          <OutfitBuilderScreen
            allGarments={garments}
            onBack={() => setCurrentScreen('FITTING_ROOM')}
            onSaveLook={handleSaveLook}
          />
        )}

        {currentScreen === 'SAVED_LOOK' && (
          <SavedLookScreen
            look={activeSavedLook}
            onBack={() => setCurrentScreen('HOME')}
            onTryAgain={() => {
              if (activeSavedLook.garments[0]) {
                setActiveGarment(activeSavedLook.garments[0]);
              }
              setCurrentScreen('FITTING_ROOM');
            }}
            onEditLook={() => setCurrentScreen('OUTFIT_BUILDER')}
            onRemoveLook={handleRemoveLook}
            onSelectGarment={handleSelectGarment}
          />
        )}

        {currentScreen === 'PROFILE' && (
          <ProfileScreen
            bodyProfile={bodyProfile}
            garmentCount={garments.length}
            onBack={() => setCurrentScreen(currentTab)}
            onEditBodyProfile={() => setCurrentScreen('BODY_PROFILE')}
            onOpenColorStudio={() => {
              setCurrentTab('COLOR_STUDIO');
              setCurrentScreen('COLOR_STUDIO');
            }}
          />
        )}
      </View>

      {/* Primary iOS Bottom Tab Navigation Bar */}
      {isTabBarVisible && (
        <TabBar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          bottomInset={insets.bottom}
        />
      )}

    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <MainApp />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  screenContainer: {
    flex: 1,
  },
  quickScreenFloatingBtn: {
    position: 'absolute',
    right: Spacing.lg,
    backgroundColor: 'rgba(17, 17, 19, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  quickScreenBtnText: {
    ...Typography.micro,
    color: Colors.ctaText,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  switcherModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  switcherDismissArea: {
    flex: 1,
  },
  switcherModalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '75%',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  switcherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  switcherCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screensList: {
    marginTop: Spacing.sm,
  },
  screenOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  screenOptionItemActive: {
    backgroundColor: Colors.surfaceSubtle,
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  screenItemLeft: {
    flex: 1,
  },
  screenItemName: {
    ...Typography.subhead,
    color: Colors.primaryText,
    fontWeight: '500',
  },
  screenItemNameActive: {
    fontWeight: '700',
  },
  screenItemCategory: {
    ...Typography.micro,
    color: Colors.tertiaryText,
    fontSize: 9,
    marginTop: 2,
  },
});
