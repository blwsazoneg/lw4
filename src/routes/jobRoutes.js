import { Router } from 'express';
import { createJob, getAllJobs, getJobById } from '../controllers/jobController.js';

const router = Router();

router.post('/', createJob);
router.get('/', getAllJobs);
router.get('/:id', getJobById);

export default router;