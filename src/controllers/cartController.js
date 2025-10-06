// src/controllers/cartController.js
import pool from "../config/db.js";

// Helper function to get or create a cart for a user
const getOrCreateCart = async (userId) => {
  let cartResult = await pool.query("SELECT * FROM carts WHERE user_id = $1", [
    userId,
  ]);
  if (cartResult.rows.length === 0) {
    cartResult = await pool.query(
      "INSERT INTO carts (user_id) VALUES ($1) RETURNING *",
      [userId]
    );
  }
  return cartResult.rows[0];
};

// --- GET CURRENT USER'S CART (SIMPLIFIED) ---
export const getCart = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const cart = await getOrCreateCart(userId);
    // We no longer need GROUP BY because our addItemToCart logic is now correct.
    const query = `
            SELECT ci.product_id, p.name, p.price, ci.quantity, p.image_url
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1;
        `;
    const itemsResult = await pool.query(query, [cart.id]);
    res.status(200).json({ cart, items: itemsResult.rows });
  } catch (error) {
    console.error("Error getting cart:", error);
    res.status(500).json({ message: "Server error while fetching cart." });
  }
};

// --- ADD OR UPDATE ITEM IN CART (CORRECTED LOGIC) ---
export const addItemToCart = async (req, res) => {
  const userId = req.session.user.id;
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ message: "Valid productId and quantity are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cart = await getOrCreateCart(userId);

    // First, try to UPDATE the quantity if the item already exists.
    const updateQuery = `
            UPDATE cart_items SET quantity = quantity + $1
            WHERE cart_id = $2 AND product_id = $3
            RETURNING *;
        `;
    const updateResult = await client.query(updateQuery, [
      quantity,
      cart.id,
      productId,
    ]);

    // If no rows were updated, it means the item is not in the cart yet. So, INSERT it.
    if (updateResult.rowCount === 0) {
      const insertQuery = `
                INSERT INTO cart_items (cart_id, product_id, quantity)
                VALUES ($1, $2, $3)
                RETURNING *;
            `;
      await client.query(insertQuery, [cart.id, productId, quantity]);
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Item added to cart." });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23503") {
      return res.status(404).json({ message: "Product not found." });
    }
    console.error("Error adding item to cart:", error);
    res
      .status(500)
      .json({ message: "Server error while adding item to cart." });
  } finally {
    client.release();
  }
};

// --- REMOVE ITEM FROM CART ---
export const removeItemFromCart = async (req, res) => {
  const userId = req.session.user.id;
  const { productId } = req.params;

  try {
    const cart = await getOrCreateCart(userId); // Ensure cart exists
    const result = await pool.query(
      "DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 RETURNING *",
      [cart.id, productId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Item not found in cart." });
    }
    res.status(200).json({ message: "Item removed from cart." });
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ message: "Server error while removing item." });
  }
};

// --- NEW: UPDATE ITEM QUANTITY ---
export const updateItemQuantity = async (req, res) => {
  const userId = req.session.user.id;
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ message: "A valid quantity greater than 0 is required." });
  }

  try {
    const cartResult = await pool.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );
    if (cartResult.rows.length === 0) {
      return res.status(404).json({ message: "Cart not found." });
    }
    const cartId = cartResult.rows[0].id;

    const query = `
            UPDATE cart_items SET quantity = $1
            WHERE cart_id = $2 AND product_id = $3
            RETURNING *;
        `;
    const result = await pool.query(query, [quantity, cartId, productId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Item not found in cart." });
    }
    res
      .status(200)
      .json({ message: "Quantity updated.", item: result.rows[0] });
  } catch (error) {
    console.error("Error updating quantity:", error);
    res.status(500).json({ message: "Server error while updating quantity." });
  }
};
