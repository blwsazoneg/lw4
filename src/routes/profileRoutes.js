// src/routes/profileRoutes.js
import { Router } from 'express';
import { getMyProfile, upsertProfile } from '../controllers/profileController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

// All profile routes must be protected
router.use(isAuthenticated);

// GET /api/profile/me - Get the logged-in user's profile
router.get('/me', getMyProfile);

// POST /api/profile - Create or update the logged-in user's profile
router.post('/', upsertProfile);

export default router;