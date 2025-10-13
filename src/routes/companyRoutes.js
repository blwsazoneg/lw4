// src/routes/companyRoutes.js
import { Router } from "express";
import {
  createCompany,
  getAllCompanies,
  updateCompany,
} from "../controllers/companyController.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// Admins can create companies
router.post("/", isAuthenticated, isAdmin, createCompany);

// Any authenticated user (especially admins) can get the list of companies
router.get("/", isAuthenticated, getAllCompanies);

// --- NEW: PUT route for updating a company ---
router.put("/:id", isAuthenticated, updateCompany);

export default router;
