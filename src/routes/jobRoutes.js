// src/routes/jobRoutes.js
import { Router } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  getMyJobs,
  deleteJob,
  updateJob,
  updateJobStatus,
} from "../controllers/jobController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = Router();

// --- THE FIX: More specific routes go FIRST ---
// This is a specific string, so it must come before the wildcard ':id'.
router.get("/my-jobs", isAuthenticated, getMyJobs);

// --- Generic routes come AFTER ---
router.get("/", getAllJobs);
router.get("/:id", getJobById); // The wildcard route is now last for GET requests.

// --- Action routes ---
router.post("/", isAuthenticated, createJob);
router.delete("/:id", isAuthenticated, deleteJob);
// --- NEW: PUT route for updating a job ---
router.put("/:id", isAuthenticated, updateJob);
// --- NEW: PUT route for updating a job's status ---
router.put("/:id/status", isAuthenticated, updateJobStatus);

export default router;
