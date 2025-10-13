// src/routes/adminRoutes.js
import { Router } from "express";
import { getDashboardStats } from "../controllers/adminController.js";

const router = Router();

// GET /api/admin/stats - Get the main dashboard statistics
router.get("/stats", getDashboardStats);

export default router;
