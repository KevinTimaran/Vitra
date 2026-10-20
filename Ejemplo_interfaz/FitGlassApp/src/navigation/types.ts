import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootTabParamList = {
  Home: undefined;
  Wardrobe: undefined;
  FittingRoom: undefined;
  Profile: undefined;
};

export type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;
export type WardrobeScreenProps = BottomTabScreenProps<RootTabParamList, 'Wardrobe'>;
export type FittingRoomScreenProps = BottomTabScreenProps<RootTabParamList, 'FittingRoom'>;
export type ProfileScreenProps = BottomTabScreenProps<RootTabParamList, 'Profile'>;
