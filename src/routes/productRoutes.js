import { Router } from 'express';
import { createProduct, getAllProducts, getProductById } from '../controllers/productController.js';
import { isAuthenticated, isAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', isAuthenticated, isAdmin, createProduct);
router.get('/', getAllProducts);
router.get('/:id', getProductById);

export default router;