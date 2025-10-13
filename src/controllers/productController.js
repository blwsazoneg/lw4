import pool from "../config/db.js";
import { upload } from "./innovationController.js";

// --- FINAL, GUARANTEED FIX for createProduct ---
export const createProduct = async (req, res) => {
  // Create a new Multer instance specifically for a single 'image' upload.
  const multerUpload = upload.single("image");

  // Manually run the Multer middleware. We wrap it in a Promise
  // to handle its asynchronous nature and potential errors.
  new Promise((resolve, reject) => {
    multerUpload(req, res, (err) => {
      if (err) {
        // This will catch Multer-specific errors (e.g., file too large)
        return reject(new Error("Image upload error: " + err.message));
      }
      // If Multer runs successfully, resolve the promise.
      resolve();
    });
  })
    .then(async () => {
      // --- THIS CODE RUNS ONLY AFTER MULTER HAS SUCCESSFULLY PARSED THE FORM ---
      // At this point, req.body and req.file are GUARANTEED to be populated.

      const {
        name,
        description,
        price,
        stock_quantity,
        brand_id,
        sector_id,
        original_price,
        discount_price,
        discount_start_date,
        discount_end_date,
        contact_details,
      } = req.body;

      const imageUrl = req.file
        ? `/${req.file.path.replace(/\\/g, "/")}`
        : null;

      if (!name || !price || !brand_id || !sector_id) {
        return res.status(400).json({
          message: "Name, price, brand_id, and sector_id are required.",
        });
      }

      try {
        const query = `
                INSERT INTO products (
                    name, description, price, stock_quantity, image_url, brand_id, sector_id,
                    original_price, discount_price, discount_start_date, discount_end_date, contact_details
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *;
            `;
        const values = [
          name,
          description,
          price,
          stock_quantity,
          imageUrl,
          brand_id,
          sector_id,
          original_price,
          discount_price,
          discount_start_date,
          discount_end_date,
          contact_details,
        ];

        const result = await pool.query(query, values);
        res.status(201).json({
          message: "Product created successfully!",
          product: result.rows[0],
        });
      } catch (dbError) {
        console.error("Database error after upload:", dbError);
        res
          .status(500)
          .json({ message: "Database error while creating product." });
      }
    })
    .catch((err) => {
      // This will catch errors from the Multer promise or any other synchronous error.
      console.error("Error in createProduct promise chain:", err);
      res.status(500).json({
        message: err.message || "Server error while creating product.",
      });
    });
};

// --- REVERTED TO SIMPLE "FETCH ALL" VERSION ---
export const getAllProducts = async (req, res) => {
  try {
    // This simple query gets ALL products and joins the brand name.
    // It is clean and has no complex logic.
    const query = `
            SELECT
                p.id, p.name, p.description, p.price, p.stock_quantity, p.image_url, 
                b.name AS brand_name, p.original_price, p.discount_price, p.created_at
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            ORDER BY p.created_at DESC;
        `;
    const result = await pool.query(query);

    // We now send the entire list of products. No pagination object.
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching all products:", error);
    res.status(500).json({ message: "Server error while fetching products." });
  }
};

// GET SINGLE PRODUCT BY ID (Public with Brand Info
export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
    SELECT
        p.id, p.name, p.description, p.price,
        p.stock_quantity, p.image_url, b.name AS brand_name,
        -- ADD THESE FIELDS:
        p.original_price, p.discount_price, p.discount_start_date, p.discount_end_date
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = $1;
`;
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

// --- NEW: GET FEATURED PRODUCTS ---
export const getFeaturedProducts = async (req, res) => {
  try {
    // For now, "featured" means the 10 newest products.
    const query = `
    SELECT
        p.id, p.name, p.description, p.price,
        p.stock_quantity, p.image_url, b.name AS brand_name,
        -- ADD THESE FIELDS:
        p.original_price, p.discount_price, p.discount_start_date, p.discount_end_date
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    ORDER BY p.created_at DESC
    LIMIT 10;
`;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching featured products." });
  }
};

// --- UPDATE A PRODUCT (Admin Only) ---
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  // Destructure all the fields that can be updated
  const {
    name,
    description,
    price,
    stock_quantity,
    image_url,
    brand_id,
    sector_id,
    original_price,
    discount_price,
    discount_start_date,
    discount_end_date,
    contact_details,
  } = req.body;

  if (!name || !price || !brand_id || !sector_id) {
    return res
      .status(400)
      .json({ message: "Name, price, brand_id, and sector_id are required." });
  }

  try {
    const query = `
            UPDATE products SET
                name = $1, description = $2, price = $3, stock_quantity = $4, image_url = $5,
                brand_id = $6, sector_id = $7, original_price = $8, discount_price = $9,
                discount_start_date = $10, discount_end_date = $11, contact_details = $12
            WHERE id = $13
            RETURNING *;
        `;
    const values = [
      name,
      description,
      price,
      stock_quantity,
      image_url,
      brand_id,
      sector_id,
      original_price,
      discount_price,
      discount_start_date,
      discount_end_date,
      contact_details,
      id,
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json({
      message: "Product updated successfully!",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error while updating product." });
  }
};

// --- DELETE A PRODUCT (Admin Only) ---
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *;",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error("Error deleting product:", error);
    // Handle cases where the product might be referenced in an order
    if (error.code === "23503") {
      // foreign_key_violation
      return res.status(409).json({
        message:
          "Cannot delete this product as it is part of an existing order.",
      });
    }
    res.status(500).json({ message: "Server error while deleting product." });
  }
};
