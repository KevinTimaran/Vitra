import type { ColorProfile } from '../../types';
import { INITIAL_BODY_PROFILE } from '../../data/mockData';

export const DEFAULT_LOOK_CATEGORIES = ['Todos', 'Elegante', 'Fiesta', 'Casual', 'Formal', 'Deportivo'];

export const PRESET_AVATARS: Record<string, { image_2d: string; model_3d: string; label: string }> = {
  female: {
    image_2d: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    model_3d: '',
    label: 'Silueta Femenina Atelier',
  },
  male: {
    image_2d: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
    model_3d: '',
    label: 'Silueta Masculina Atelier',
  },
  'non-binary': {
    image_2d: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    model_3d: '',
    label: 'Silueta Fluida / Neutra',
  },
};

export const DEFAULT_COLOR_PROFILE: ColorProfile = {
  skin_tone: '#E2D3C4',
  hair_color: '#1C1917',
  eye_color: '#292524',
  season: 'Invierno Brillante',
  palette_name: 'Invierno Brillante',
  description:
    'Contraste elevado entre el subtono frío de la tez y la profundidad del cabello. Los tonos fríos saturados, el carbón mineral y los acentos zafiro y magenta maximizan la luminosidad y presencia estética.',
  recommended_colors: ['#1C1C1E', '#1E3A8A', '#0284C7', '#7C3AED', '#E11D48', '#10B981', '#0F172A', '#F8FAFC'],
  colors_to_avoid: ['#D97706', '#84CC16', '#B45309', '#CA8A04'],
};

export const DEFAULT_USER_NAME = 'Atelier User';
export const DEFAULT_GENDER = 'female';
export const DEFAULT_SAMPLE_MODEL_URL = '';
export const DEFAULT_BODY_PROFILE = INITIAL_BODY_PROFILE;

export const USER_STORAGE_KEYS = {
  onboarding: 'vitra_user_onboarding_v2',
  name: 'vitra_user_name',
  email: 'vitra_user_email',
  age: 'vitra_user_age',
  gender: 'vitra_gender',
  avatarType: 'vitra_avatar_type',
  avatarUrl: 'vitra_avatar_url',
  avatarCreatedAt: 'vitra_avatar_created_at',
  facePhotoUri: 'vitra_face_photo_uri',
  bodyPhotoUri: 'vitra_body_photo_uri',
  userPhotoUri: 'vitra_user_photo_uri',
  colorProfile: 'vitra_color_profile',
  bodyProfile: 'vitra_body_profile',
} as const;

export const USER_COLLECTIONS = {
  wardrobe: { fileName: 'vitra_wardrobe_v1.json', webKey: 'vitra_wardrobe_v1' },
  savedLooks: { fileName: 'vitra_saved_looks_v1.json', webKey: 'vitra_saved_looks_v1' },
  lookCategories: { fileName: 'vitra_look_categories_v1.json', webKey: 'vitra_look_categories_v1' },
  syncState: { fileName: 'vitra_sync_state_v1.json', webKey: 'vitra_sync_state_v1' },
  gameRecord: { fileName: 'vitra_game_record_v1.json', webKey: 'vitra_game_record_v1' },
} as const;
