// src/controllers/authController.js

import pool from "../config/db.js";
import axios from "axios";

// --- HELPER FUNCTIONS ---

/**
 * Fetches the user's profile from KingsChat using an access token.
 * This is our method for verifying the token is valid.
 * @param {string} accessToken - The user's access token.
 * @returns {Promise<object>} The user's profile object from KingsChat.
 */
const getKingsChatUserProfile = async (accessToken) => {
  const url = "https://connect.kingsch.at/developer/api/profile";
  const headers = { authorization: `Bearer ${accessToken}` };
  const response = await axios.get(url, { headers });
  return response.data.profile;
};

/**
 * Finds a user in our local database by their KingsChat ID, or creates a new one if not found.
 * @param {object} kcProfile - The user profile object from KingsChat.
 * @returns {Promise<object>} The user record from our local database.
 */
const findOrCreateUser = async (kcProfile) => {
  const findUserQuery = "SELECT * FROM users WHERE kingschat_id = $1";
  let userResult = await pool.query(findUserQuery, [kcProfile.id]);

  if (userResult.rows.length > 0) {
    // User exists, potentially update their info from KC
    const updateUserQuery = `
            UPDATE users SET 
                email = $1, 
                first_name = $2, 
                last_name = $3, 
                avatar_url = $4,
                phone_number = $5,
                gender = $6,
                birth_date_millis = $7
            WHERE kingschat_id = $8 RETURNING *`;

    const [firstName, ...lastNameParts] = kcProfile.name.split(" ");
    const lastName = lastNameParts.join(" ") || "";

    const updatedResult = await 
    pool.query(updateUserQuery, [
      kcProfile.email,
      firstName,
      lastName,
      kcProfile.avatar,
      kcProfile.phone_number,
      kcProfile.gender,
      kcProfile.birth_date_millis,
      kcProfile.id,
    ]);
    return updatedResult.rows[0];
  } else {
    // User does not exist, create them with all available info
    const [firstName, ...lastNameParts] = kcProfile.name.split(" ");
    const lastName = lastNameParts.join(" ") || "";

    const createUserQuery = `
            INSERT INTO users (kingschat_id, email, first_name, last_name, avatar_url, phone_number, gender, birth_date_millis)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
    const values = [
      kcProfile.id,
      kcProfile.email,
      firstName,
      lastName,
      kcProfile.avatar,
      kcProfile.phone_number,
      kcProfile.gender,
      kcProfile.birth_date_millis,
    ];

    const newUserResult = await pool.query(createUserQuery, values);
    return newUserResult.rows[0];
  }
};

// --- EXPORTED CONTROLLER FOR VERIFYING THE TOKEN ---

export const verifyKingsChatToken = async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res
      .status(400)
      .json({ message: "KingsChat access token is required." });
  }

  try {
    // 1. VERIFY the token by using it to get the user's profile
    const kingsChatProfile = await getKingsChatUserProfile(accessToken);

    // 2. Find or create the user in our database
    const user = await findOrCreateUser(kingsChatProfile);

    // 3. Create a persistent session for the user
    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      avatar: user.avatar_url,
      role: user.role,
      phoneNumber: user.phone_number,
      gender: user.gender,
      birthDateMillis: user.birth_date_millis
    };

    // 4. Send a success response
    res.status(200).json({
      message: "Authentication successful!",
      user: req.session.user,
    });
  } catch (error) {
    console.error(
      "Error during KingsChat token verification:",
      error.response ? error.response.data : error.message
    );
    // If the token is invalid, the API call will fail, often with a 401 Unauthorized error.
    res
      .status(401)
      .json({ message: "Authentication failed. Invalid or expired token." });
  }
};

export const handleLogout = (req, res) => {
  // The req.session.destroy() method is provided by express-session.
  // It removes the session from our PostgreSQL session store.
  req.session.destroy((err) => {
    if (err) {
      // If there's an error destroying the session, log it and send an error response.
      console.error("Error destroying session:", err);
      return res
        .status(500)
        .json({ message: "Could not log out, please try again." });
    }

    // This tells the browser to clear the connect.sid cookie.
    res.clearCookie("connect.sid");

    res.redirect("/"); // Redirect to homepage or login page after logout
    // Alternatively, for an API response:
    // res.status(200).json({ message: 'Logout successful.' });
  });
};
