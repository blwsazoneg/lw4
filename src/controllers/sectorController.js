// src/controllers/sectorController.js
import pool from "../config/db.js";

export const getAllSectors = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sectors ORDER BY name ASC");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching sectors:", error);
    res.status(500).json({ message: "Server error while fetching sectors." });
  }
};

// --- NEW: CREATE A NEW SECTOR (Admin Only) ---
export const createSector = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Sector name is required." });
  }

  try {
    const query = `INSERT INTO sectors (name) VALUES ($1) RETURNING *;`;
    const result = await pool.query(query, [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // unique_violation
      return res
        .status(409)
        .json({ message: "A sector with this name already exists." });
    }
    console.error("Error creating sector:", error);
    res.status(500).json({ message: "Server error while creating sector." });
  }
};

// src/controllers/sectorController.js
// ... (getAllSectors, createSector)

// DELETE a sector (Admin Only)
export const deleteSector = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM sectors WHERE id = $1 RETURNING *;",
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Sector not found." });
    res.status(200).json({ message: "Sector deleted." });
  } catch (error) {
    if (error.code === "23503")
      return res
        .status(409)
        .json({ message: "Cannot delete sector as it is in use by products." });
    res.status(500).json({ message: "Server error." });
  }
};
