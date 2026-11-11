import {
  checkEmailExists,
  loginUser,
  registerUser,
  resetPassword,
  setupUserProfile,
} from '../../../services/auth/authClient';
import { getLatestAvatarModel } from '../../../services/ai/garmentAnalyzer';

export {
  loginUser,
  checkEmailExists,
  registerUser,
  setupUserProfile,
  resetPassword,
  getLatestAvatarModel,
};
