import { Router } from 'express';
// Import the new controller
import { getAllInnovationsAdmin, getInnovationByIdAdmin } from '../controllers/innovationController.js';

const router = Router();

router.get('/', getAllInnovationsAdmin);

// --- NEW: Route for a single innovation's details ---
router.get('/:id', getInnovationByIdAdmin);

export default router;