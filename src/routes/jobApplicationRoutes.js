import { Router } from 'express';
import {
    applyForJob,
    getApplicationsForJob,
    getApplicationsByUser
} from '../controllers/jobApplicationController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', isAuthenticated, applyForJob);
router.post('/', applyForJob);
router.get('/job/:jobId', getApplicationsForJob);
router.get('/user/:userId', getApplicationsByUser);

export default router;
