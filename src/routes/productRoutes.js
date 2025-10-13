// src/routes/productRoutes.js
import { Router } from "express";
// Import the new controllers
import {
  createProduct,
  getAllProducts,
  getProductById,
  getFeaturedProducts,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { upload } from "../controllers/innovationController.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.get("/featured", getFeaturedProducts);
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin-only routes
router.post("/", isAuthenticated, isAdmin, createProduct);
// THE FIX: Add the Multer middleware to handle a single file upload named 'image'
router.post(
  "/",
  isAuthenticated,
  isAdmin,
  upload.single("image"),
  createProduct
);

// THE FIX: Apply Multer middleware FIRST, then auth guards.
// Multer needs to parse the multipart form before other middleware can access req.body.
router.post('/', isAuthenticated, isAdmin, createProduct);


// NEW: Update route
router.put("/:id", isAuthenticated, isAdmin, updateProduct);
// NEW: Delete route
router.delete("/:id", isAuthenticated, isAdmin, deleteProduct);

export default router;
