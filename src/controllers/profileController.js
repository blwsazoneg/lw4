// src/controllers/profileController.js
import pool from "../config/db.js";

// --- GET CURRENT USER'S PROFILE ---
export const getMyProfile = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const query = "SELECT * FROM user_profiles WHERE user_id = $1";
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      // It's not an error to not have a profile yet.
      // Send a specific status or an empty object so the frontend knows to show a "create" form.
      return res.status(200).json(null);
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error while fetching profile." });
  }
};

// --- CREATE OR UPDATE PROFILE (CORRECTED) ---
export const upsertProfile = async (req, res) => {
  const userId = req.session.user.id;
  const {
    headline,
    bio,
    skills,
    portfolio_url,
    linkedin_url,
    age,
    field_of_study,
    zone,
    church,
    ministry_position,
    appointment_year,
  } = req.body;

  try {
    const query = `
            INSERT INTO user_profiles (user_id, headline, bio, skills, portfolio_url, linkedin_url, age, field_of_study, zone, church, ministry_position, appointment_year)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (user_id)
            DO UPDATE SET
                headline = EXCLUDED.headline,
                bio = EXCLUDED.bio,
                skills = EXCLUDED.skills,
                portfolio_url = EXCLUDED.portfolio_url,
                linkedin_url = EXCLUDED.linkedin_url,
                age = EXCLUDED.age,
                field_of_study = EXCLUDED.field_of_study,
                zone = EXCLUDED.zone,
                church = EXCLUDED.church,
                ministry_position = EXCLUDED.ministry_position,
                appointment_year = EXCLUDED.appointment_year,
                updated_at = NOW()
            RETURNING *;
        `;
    const values = [
      userId,
      headline,
      bio,
      skills,
      portfolio_url,
      linkedin_url,
      age,
      field_of_study,
      zone,
      church,
      ministry_position,
      appointment_year,
    ];

    // THE FIX: Assign the result of the query to a constant.
    const result = await pool.query(query, values);

    res.status(200).json({
      message: "Profile saved successfully!",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Error saving user profile:", error);
    res.status(500).json({ message: "Server error while saving profile." });
  }
};
