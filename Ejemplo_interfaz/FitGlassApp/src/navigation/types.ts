import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { GarmentMetadata } from '../services/ai/types';

export type RootTabParamList = {
  Home: undefined;
  Wardrobe: undefined;
  FittingRoom: {
    model_3d_url?: string;
    image_2d_url?: string;
    metadata?: GarmentMetadata;
  } | undefined;
  ColorStudio: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  FittingRoom: {
    model_3d_url?: string;
    image_2d_url?: string;
    metadata?: GarmentMetadata;
  } | undefined;
  Welcome: undefined;
  BodyProfile: undefined;
  ColorStudio: undefined;
  AddGarment: undefined;
  GarmentProcessing: {
    imageBase64: string;
    imageUri: string;
    userPhotoUrl?: string;
  };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type WardrobeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Wardrobe'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type FittingRoomScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'FittingRoom'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ColorStudioScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'ColorStudio'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

