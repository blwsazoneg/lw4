// src/routes/adminOrderRoutes.js
import { Router } from "express";
import {
  getAllOrdersAdmin,
  updateOrderStatus,
  getOrderDetailsAdmin,
} from "../controllers/orderController.js";
// We don't need extra protection here because the main app.js will handle it.

const router = Router();

// GET /api/admin/orders - Get a list of all orders
router.get("/", getAllOrdersAdmin);

router.get("/:orderId", getOrderDetailsAdmin); // <-- ADD THIS

// --- NEW: Route for updating an order's status ---
router.put("/:orderId/status", updateOrderStatus);

export default router;
