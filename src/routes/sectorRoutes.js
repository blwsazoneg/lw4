// src/routes/sectorRoutes.js
import { Router } from "express";
import {
  getAllSectors,
  createSector, 
  deleteSector
} from "../controllers/sectorController.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// This is a public route, anyone can see the list of sectors
router.get("/", getAllSectors);

// --- NEW: Admin-only route to create a sector ---
router.post("/", isAuthenticated, isAdmin, createSector);

// --- NEW: Admin-only route to delete a sector ---
router.delete("/:id", isAuthenticated, isAdmin, deleteSector);

export default router;
