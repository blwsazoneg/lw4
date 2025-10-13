// src/routes/orderRoutes.js
import { Router } from "express";
// Import the new controllers
import {
  createPaymentIntent,
  finalizeOrder,
  getOrderHistory, 
  getOrderDetails,
} from "../controllers/orderController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = Router();
router.use(isAuthenticated);

// STEP 1: Frontend calls this to get a client secret from Stripe
router.post("/create-payment-intent", createPaymentIntent);

// STEP 2: Frontend calls this AFTER successful payment to save the order
router.post("/finalize", finalizeOrder);

// This route remains the same
router.get("/", getOrderHistory);

router.get('/:orderId', getOrderDetails);


export default router;
