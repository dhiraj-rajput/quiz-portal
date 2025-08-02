import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updatePassword,
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.post('/logout', logout);
router.get('/me', getMe);
router.patch('/update-password', updatePassword);

export default router;
