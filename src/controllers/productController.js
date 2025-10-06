import pool from "../config/db.js";

// --- CREATE A NEW PRODUCT (Admin Only) ---
export const createProduct = async (req, res) => {
  const { name, description, price, stock_quantity, image_url, brand_id } =
    req.body;
  if (!name || !price || !stock_quantity || !brand_id) {
    return res.status(400).json({
      message: "Name, price, stock quantity, and brand ID are required.",
    });
  }

  try {
    const query = `
        INSERT INTO products (name, description, price, stock_quantity, image_url, brand_id)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
    const values = [
      name,
      description,
      price,
      stock_quantity,
      image_url,
      brand_id,
    ];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error while creating product." });
  }
};

// --- REVERTED: GET ALL PRODUCTS (Simple Version) ---
export const getAllProducts = async (req, res) => {
  try {
    // This simple query gets all products and joins the brand name.
    const query = `
      SELECT
        p.id, p.name, p.description, p.price,
        p.stock_quantity, p.image_url, p.created_at, b.name AS brand_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      ORDER BY p.created_at DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error while fetching products." });
  }
};

// GET SINGLE PRODUCT BY ID (Public with Brand Info
export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
        SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock_quantity,
        p.image_url,
        b.name AS brand_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = $1;`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ message: "Server error while fetching product." });
  }
};
