// src/routes/authRoutes.js

import { Router } from 'express';
// Import our new controller function
import { verifyKingsChatToken, handleLogout } from '../controllers/authController.js';

const router = Router();

// @route   POST /api/auth/kingschat/verify
// @desc    Receives an accessToken from the frontend, verifies it by fetching the user profile,
// @desc    and creates a session for that user.
router.post('/kingschat/verify', verifyKingsChatToken);
router.get('/logout', handleLogout);

export default router;