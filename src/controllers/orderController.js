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

  // THE FIX: Use the same CASE statement here.
  const itemsQuery = `
        SELECT 
            ci.product_id,
            ci.quantity,
            p.stock_quantity,
            CASE
                WHEN p.discount_price IS NOT NULL AND p.discount_price < p.price THEN p.discount_price
                ELSE p.price
            END AS price -- This is the price we will use for calculation
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.cart_id = $1
    `;
  const itemsResult = await client.query(itemsQuery, [cartId]);
  if (itemsResult.rows.length === 0) throw new Error("Cart is empty.");

  const cartItems = itemsResult.rows;

  // The rest of the function works as before, but now uses the correct price.
  let totalInCents = 0;
  for (const item of cartItems) {
    if (item.quantity > item.stock_quantity) {
      throw new Error(`Not enough stock for product ID ${item.product_id}.`);
    }
    totalInCents += item.price * 100 * item.quantity;
  }

  return { totalAmount: totalInCents / 100, totalInCents, cartItems };
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
        // THE FIX: Use item.price, which is now the correct (potentially discounted) price.
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

// --- GET USER'S ORDER HISTORY (with Pagination and Search) ---
export const getOrderHistory = async (req, res) => {
  const userId = req.session.user.id;
  const { page = 1, limit = 10, searchQuery } = req.query; // Default to 10 orders per page

  try {
    let baseQuery = "FROM orders WHERE user_id = $1";
    const queryParams = [userId];
    let paramIndex = 2;

    if (searchQuery) {
      baseQuery += ` AND order_number::text ILIKE $${paramIndex}`;
      queryParams.push(`%${searchQuery}%`);
    }

    // Get total count for pagination
    const totalResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery}`,
      queryParams
    );
    const totalOrders = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalOrders / limit);

    // Fetch orders for the current page
    const offset = (page - 1) * limit;
    const ordersQuery = `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    const ordersResult = await pool.query(ordersQuery, [
      ...queryParams,
      limit,
      offset,
    ]);

    res.status(200).json({
      orders: ordersResult.rows,
      pagination: { currentPage: parseInt(page, 10), totalPages, totalOrders },
    });
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// --- NEW: GET A SINGLE ORDER'S DETAILS ---
export const getOrderDetails = async (req, res) => {
  const userId = req.session.user.id;
  const { orderId } = req.params;

  try {
    const orderQuery = "SELECT * FROM orders WHERE id = $1 AND user_id = $2";
    const orderResult = await pool.query(orderQuery, [orderId, userId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found or you do not have permission to view it.",
      });
    }
    const order = orderResult.rows[0];

    // THE FIX: The original query was missing p.name and p.image_url.
    // We must explicitly select them from the products table 'p'.
    const itemsQuery = `
            SELECT 
                oi.quantity, 
                oi.price_at_purchase,
                p.name,         -- <-- ADD THIS
                p.image_url     -- <-- ADD THIS
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1;
        `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    const items = itemsResult.rows;

    res.status(200).json({ ...order, items });
  } catch (error) {
    console.error(`Error fetching details for order ${orderId}:`, error);
    res
      .status(500)
      .json({ message: "Server error while fetching order details." });
  }
};

// --- GET ALL ORDERS (Admin Only - ADVANCED with Search, Filter, Pagination) ---
export const getAllOrdersAdmin = async (req, res) => {
  // Destructure query parameters for filtering, searching, and pagination
  const {
    status,
    startDate,
    endDate,
    searchQuery,
    page = 1,
    limit = 10,
  } = req.query;

  let baseQuery = `
        SELECT 
            o.id, o.order_number, o.total_amount, o.status, o.created_at,
            u.first_name, u.last_name, u.email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
    `;

  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  // Build WHERE clauses dynamically
  if (status) {
    whereClauses.push(`o.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }
  if (startDate) {
    whereClauses.push(`o.created_at >= $${paramIndex}`);
    queryParams.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    whereClauses.push(`o.created_at <= $${paramIndex}`);
    queryParams.push(endDate);
    paramIndex++;
  }
  if (searchQuery) {
    // Search by order number (UUID) or user's name/email
    whereClauses.push(
      `(o.order_number::text ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
    );
    queryParams.push(`%${searchQuery}%`);
    paramIndex++;
  }

  if (whereClauses.length > 0) {
    baseQuery += " WHERE " + whereClauses.join(" AND ");
  }

  // --- Pagination and Total Count ---
  try {
    // First, get the total count of orders that match the filters (without pagination)
    const totalCountQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS filtered_orders`;
    const totalResult = await pool.query(totalCountQuery, queryParams);
    const totalOrders = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalOrders / limit);

    // Now, add sorting and pagination to the main query
    const offset = (page - 1) * limit;
    const finalQuery =
      baseQuery +
      ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${
        paramIndex + 1
      }`;
    queryParams.push(limit, offset);

    const ordersResult = await pool.query(finalQuery, queryParams);

    // Send back both the orders for the current page and the pagination metadata
    res.status(200).json({
      orders: ordersResult.rows,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages,
        totalOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching all orders for admin:", error);
    res.status(500).json({ message: "Server error while fetching orders." });
  }
};

// --- NEW: UPDATE AN ORDER'S STATUS (Admin Only) ---
export const updateOrderStatus = async (req, res) => {
  // The 'isAdminRoute' middleware has already confirmed the user is an admin.
  const { orderId } = req.params;
  const { status } = req.body;

  // Basic validation
  const validStatuses = [
    "Processing",
    "Paid",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: "A valid status is required." });
  }

  try {
    const query = "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *;";
    const result = await pool.query(query, [status, orderId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json({
      message: "Order status updated successfully.",
      order: result.rows[0],
    });
  } catch (error) {
    console.error(`Error updating status for order ${orderId}:`, error);
    res
      .status(500)
      .json({ message: "Server error while updating order status." });
  }
};

export const getOrderDetailsAdmin = async (req, res) => {
  const { orderId } = req.params;
  try {
    const orderQuery =
      "SELECT o.*, u.first_name, u.last_name, u.email, u.phone_number, u.kingschat_username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = $1";
    const orderResult = await pool.query(orderQuery, [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }
    const order = orderResult.rows[0];
    const itemsQuery = `SELECT oi.quantity, oi.price_at_purchase, p.name, p.image_url FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1;`;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    res.status(200).json({ ...order, items: itemsResult.rows });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};
