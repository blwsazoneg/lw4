// src/routes/adminUserRoutes.js
import { Router } from "express";
import { getAllUsers, updateUserRole } from "../controllers/userController.js";

const router = Router();

// GET /api/admin/users - Get a list of all users
router.get("/", getAllUsers);

// --- NEW: Route for updating a user's role ---
router.put("/:userId/role", updateUserRole);
// In the future, we can add routes here to edit or delete users.

export default router;
