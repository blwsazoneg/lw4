import pool from "../config/db.js";

// --- CREATE A NEW COMPANY (CORRECTED) ---
export const createCompany = async (req, res) => {
  // Get the logged-in user's ID from the session
  const userId = req.session.user.id;
  const { name, description, website } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Company name is required." });
  }

  try {
    // THE FIX: Add the owner_id to the INSERT statement.
    const query = `
      INSERT INTO companies (name, description, website, owner_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, description, website, userId]; // Pass the user's ID
    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Company created successfully!",
      company: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "A company with this name already exists." });
    }
    console.error("Error creating company:", error);
    res.status(500).json({ message: "Server error while creating company." });
  }
};

// --- NEW: GET ALL COMPANIES ---
export const getAllCompanies = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM companies ORDER BY name ASC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching all companies:", error);
    res.status(500).json({ message: "Server error while fetching companies." });
  }
};

// --- NEW: UPDATE A COMPANY'S DETAILS (Protected) ---
export const updateCompany = async (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  const { id: companyId } = req.params;
  const { name, description, website } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Company name is required." });
  }

  try {
    // Security Check: Verify the user owns this company or is an admin
    const ownerCheck = await pool.query(
      "SELECT owner_id FROM companies WHERE id = $1",
      [companyId]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ message: "Company not found." });
    }

    if (ownerCheck.rows[0].owner_id !== userId && userRole !== "admin") {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this company." });
    }

    // Proceed with the update
    const query = `
            UPDATE companies SET
                name = $1,
                description = $2,
                website = $3
            WHERE id = $4
            RETURNING *;
        `;
    const values = [name, description, website, companyId];

    const result = await pool.query(query, values);

    res
      .status(200)
      .json({
        message: "Company details updated successfully!",
        company: result.rows[0],
      });
  } catch (error) {
    if (error.code === "23505") {
      // unique_violation
      return res
        .status(409)
        .json({ message: "A company with this name already exists." });
    }
    console.error("Error updating company:", error);
    res.status(500).json({ message: "Server error while updating company." });
  }
};
