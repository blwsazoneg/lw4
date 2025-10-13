import pool from "../config/db.js";

export const registerCompany = async (req, res) => {
  const userId = req.session.user.id;
  const currentRole = req.session.user.role; // Get the user's current role from the session
  // We need the KingsChat ID from the session.
  const kingsChatId = req.session.user.kingsChatId; // We need to add this to the session first!

  const { name, description, website } = req.body;

  if (!name ) {
    return res.status(400).json({
      message: "Company name and KingsChat handle are required.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check if the user already owns a company
    const existingCompany = await client.query(
      "SELECT * FROM companies WHERE owner_id = $1",
      [userId]
    );
    if (existingCompany.rows.length > 0) {
      throw new Error(
        "This user account is already associated with a company."
      );
    }

    // --- THE FIX IS HERE ---
    // 2. Update the user's role to 'employer' ONLY IF they are a 'user'.
    //    Do NOT change the role if they are already an 'admin'.
    if (currentRole === "user") {
      await client.query("UPDATE users SET role = 'employer' WHERE id = $1", [
        userId,
      ]);
    }
    // If the role is 'admin', we do nothing to the role.

    // 3. Create the new company and link it to the user
    const companyQuery = `
            INSERT INTO companies (name, description, website, owner_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
    const companyResult = await client.query(companyQuery, [
      name,
      description,
      website,
      userId,
    ]);

    await client.query("COMMIT");

    // 4. Update the session with the new role if it was changed
    if (currentRole === "user") {
      req.session.user.role = "employer";
    }

    res.status(201).json({
      message: "Company registered successfully!",
      company: companyResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "A company with this name already exists." });
    }
    console.error("Error registering company:", error);
    res.status(500).json({
      message: "Server error during registration.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// src/controllers/employerController.js

export const checkCompanyProfile = async (req, res) => {
  // Defensive check: Ensure session and user ID exist.
  if (!req.session || !req.session.user || !req.session.user.id) {
    // This should be caught by middleware, but this is an extra safeguard.
    return res
      .status(401)
      .json({ message: "Authentication error: User session not found." });
  }
  const userId = req.session.user.id;

  try {
    const result = await pool.query(
      "SELECT * FROM companies WHERE owner_id = $1",
      [userId]
    );
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(200).json(null);
    }
  } catch (error) {
    // This will now log the specific database error to your server console.
    console.error("DATABASE ERROR in checkCompanyProfile:", error);
    res
      .status(500)
      .json({ message: "Server error while checking company profile." });
  }
};
