// src/controllers/brandController.js
import pool from '../config/db.js';

// --- CREATE A NEW BRAND (Admin Only) ---
export const createBrand = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Brand name is required.' });
  }

  try {
    const query = `INSERT INTO brands (name) VALUES ($1) RETURNING *;`;
    const result = await pool.query(query, [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      return res.status(409).json({ message: 'A brand with this name already exists.' });
    }
    console.error('Error creating brand:', error);
    res.status(500).json({ message: 'Server error while creating brand.' });
  }
};

// --- GET ALL BRANDS (Public) ---
export const getAllBrands = async (req, res) => {
  try {
    const query = 'SELECT * FROM brands ORDER BY name ASC;';
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ message: 'Server error while fetching brands.' });
  }
};

// DELETE a brand (Admin Only)
export const deleteBrand = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM brands WHERE id = $1 RETURNING *;', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Brand not found.' });
        res.status(200).json({ message: 'Brand deleted.' });
    } catch (error) {
        // Handle case where brand is in use by a product
        if (error.code === '23503') return res.status(409).json({ message: 'Cannot delete brand as it is in use by products.' });
        res.status(500).json({ message: 'Server error.' });
    }
};