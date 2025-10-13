import { Router } from "express";
import {
  applyForJob,
  getApplicationsForJob,
  getApplicationsByUser, 
  getApplicantsForJob
} from "../controllers/jobApplicationController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", isAuthenticated, applyForJob);
router.post("/", applyForJob);
router.get("/job/:jobId", getApplicationsForJob);
router.get("/user/:userId", getApplicationsByUser);

// --- NEW: Route for employers to get applicants for a job ---
router.get("/job/:jobId/applicants", isAuthenticated, getApplicantsForJob);

export default router;
