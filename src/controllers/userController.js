// src/controllers/userController.js
import pool from "../config/db.js";

// --- GET ALL USERS (Admin Only - with Search, Pagination, and Counts) ---
export const getAllUsers = async (req, res) => {
  const { page = 1, limit = 15, searchQuery } = req.query;

  try {
    // --- 1. Get Role Counts (this is always based on the total user base) ---
    const countsQuery = `
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE role = 'admin') AS admins,
                COUNT(*) FILTER (WHERE role = 'employer') AS employers,
                COUNT(*) FILTER (WHERE role = 'user') AS users
            FROM users;
        `;
    const countsResult = await pool.query(countsQuery);
    const counts = {
      total: parseInt(countsResult.rows[0].total, 10),
      admins: parseInt(countsResult.rows[0].admins, 10),
      employers: parseInt(countsResult.rows[0].employers, 10),
      users: parseInt(countsResult.rows[0].users, 10),
    };

    // --- 2. Fetch Paginated/Filtered Users ---
    let baseQuery = "FROM users";
    const queryParams = [];
    let paramIndex = 1;

    if (searchQuery) {
      baseQuery += ` WHERE (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      queryParams.push(`%${searchQuery}%`);
      paramIndex++;
    }

    // Get the total count that matches the search filter for pagination
    const totalFilteredResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery}`,
      queryParams
    );
    const totalUsers = parseInt(totalFilteredResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalUsers / limit);

    // Fetch the users for the current page
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);
    const usersQuery = `SELECT id, first_name, last_name, email, role, created_at ${baseQuery} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    const usersResult = await pool.query(usersQuery, queryParams);

    res.status(200).json({
      users: usersResult.rows,
      pagination: { currentPage: parseInt(page, 10), totalPages, totalUsers },
      counts, // Send the role counts
    });
  } catch (error) {
    console.error("Error fetching all users for admin:", error);
    res.status(500).json({ message: "Server error while fetching users." });
  }
};

// --- UPDATE A USER'S ROLE (Admin Only) ---
export const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  // A list of valid roles to prevent arbitrary roles from being set
  const validRoles = ["user", "employer", "admin"];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ message: "A valid role is required." });
  }

  // Prevent an admin from accidentally demoting themselves if they are the only admin
  if (
    req.session.user.id == userId &&
    req.session.user.role === "admin" &&
    role !== "admin"
  ) {
    const adminCountResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'admin'"
    );
    if (parseInt(adminCountResult.rows[0].count, 10) <= 1) {
      return res
        .status(403)
        .json({ message: "Cannot demote the only administrator." });
    }
  }

  try {
    const query =
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role;";
    const result = await pool.query(query, [role, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "User role updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(`Error updating role for user ${userId}:`, error);
    res.status(500).json({ message: "Server error while updating user role." });
  }
};
