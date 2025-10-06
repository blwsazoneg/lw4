// src/controllers/orderController.js
import pool from "../config/db.js";
// Import the stripe library
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Calculates the total order amount from the user's cart.
 * @param {pg.Client} client - The database client.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<{totalAmount: number, cartItems: object[]}>}
 */
const calculateOrderAmount = async (client, userId) => {
  const cartResult = await client.query(
    "SELECT id FROM carts WHERE user_id = $1",
    [userId]
  );
  if (cartResult.rows.length === 0) throw new Error("User cart not found.");
  const cartId = cartResult.rows[0].id;

  const itemsResult = await client.query(
    "SELECT ci.quantity, p.price FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = $1",
    [cartId]
  );
  if (itemsResult.rows.length === 0) throw new Error("Cart is empty.");

  // Stripe requires the amount in the smallest currency unit (e.g., cents)
  const totalInCents = itemsResult.rows.reduce(
    (total, item) => total + item.price * 100 * item.quantity,
    0
  );

  return {
    totalAmount: totalInCents / 100,
    totalInCents,
    cartItems: itemsResult.rows,
  };
};

// --- NEW CHECKOUT CONTROLLER - Creates a Payment Intent ---
export const createPaymentIntent = async (req, res) => {
  const userId = req.session.user.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { totalInCents } = await calculateOrderAmount(client, userId);
    await client.query("COMMIT");

    if (totalInCents <= 0) {
      return res
        .status(400)
        .json({ message: "Cart total must be greater than zero." });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalInCents), // Must be an integer
      currency: "zar", // Use South African Rand
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating payment intent:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  } finally {
    client.release();
  }
};

// This is the function that runs AFTER a successful Stripe payment
export const finalizeOrder = async (req, res) => {
  const userId = req.session.user.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get the cart ID first, we'll need it later
    const cartResult = await client.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );
    if (cartResult.rows.length === 0) throw new Error("Cart not found.");
    const cartId = cartResult.rows[0].id;

    // Use the existing helper to get cart items and total
    const { totalAmount, cartItems } = await calculateOrderAmount(
      client,
      userId
    );

    // 1. Create the order
    const orderQuery =
      "INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id";
    const orderResult = await client.query(orderQuery, [
      userId,
      totalAmount,
      "Paid",
    ]);
    const orderId = orderResult.rows[0].id;

    // 2. Create order_items and update product stock
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                 VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );
      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
    }

    // --- THE FIX: Add this step to the transaction ---
    // 3. Clear the user's cart
    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

    // 4. Commit the transaction
    await client.query("COMMIT");

    res.status(201).json({ message: "Order created successfully!", orderId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error finalizing order:", error); // Add more detailed logging
    res.status(500).json({ message: "Failed to finalize order." });
  } finally {
    client.release();
  }
};

// --- GET USER'S ORDER HISTORY ---
export const getOrderHistory = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({ message: "Server error." });
  }
};
