import { Router } from 'express';
import { createBrand, getAllBrands } from '../controllers/brandController.js';
import { isAuthenticated, isAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', isAuthenticated, isAdmin, createBrand);
router.get('/', getAllBrands);

export default router;