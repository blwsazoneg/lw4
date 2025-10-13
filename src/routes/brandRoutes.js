import { Router } from 'express';
import { createBrand, getAllBrands, deleteBrand } from '../controllers/brandController.js';
import { isAuthenticated, isAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', isAuthenticated, isAdmin, createBrand);
router.delete('/:id', isAuthenticated, isAdmin, deleteBrand);
router.get('/', getAllBrands);

export default router;