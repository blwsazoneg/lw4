// src/routes/cartRoutes.js
import { Router } from "express";
// Import the new controller
import {
  getCart,
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
} from "../controllers/cartController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = Router();
router.use(isAuthenticated);


// All cart routes should be protected
router.use(isAuthenticated);

// GET /api/cart - Get the current user's cart
router.get("/", getCart);

// POST /api/cart/items - Add/update an item in the cart
router.post("/items", addItemToCart);

// DELETE /api/cart/items/:productId - Remove an item from the cart
router.delete("/items/:productId", removeItemFromCart);

// NEW: PUT route for updating quantity
router.put('/items/:productId', updateItemQuantity);


export default router;
