import pool from "../config/db.js";
import axios from "axios"; // Call KC API

export const applyForJob = async (req, res) => {
  // const { user_id, job_id} = req.body;
  const { job_id } = req.body;
  const user_id = req.session.user.id;

  if (!job_id) {
    return res.status(400).json({ message: "job_id is required." });
  }

  try {
    const query = `INSERT INTO job_applications (user_id, job_id) VALUES ($1, $2) RETURNING *;`;
    const values = [user_id, job_id];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Application submitted successfully!",
      application: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "You have already applied for this job." });
    }

    if (error.code === "23503") {
      // Foreign key violation
      return res.status(400).json({
        message: "Invalid user_id or job_id. User or Job does not exist.",
      });
    }

    console.error("Error submitting application:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getApplicationsForJob = async (req, res) => {
  const { jobId } = req.params;

  try {
    const query = `SELECT ja.id AS application_id, 
        ja.application_date, ja.status, 
        u.id AS user_id, u.first_name, u.last_name, 
        u.email FROM job_applications ja 
        LEFT JOIN users u ON ja.user_id = u.id 
        WHERE ja.job_id = $1 ORDER BY 
        ja.application_date DESC;`;
    const result = await pool.query(query, [jobId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching applications for job ${jobId}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getApplicationsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const query = `SELECT ja.id AS application_id,
        ja.application_date, ja.status, 
        j.id AS job_id, j.title AS job_title, 
        c.name AS company_name 
        FROM job_applications ja 
        LEFT JOIN jobs j ON ja.job_id = j.id 
        LEFT JOIN companies c ON j.company_id = c.id 
        WHERE ja.user_id = $1 ORDER BY 
        ja.application_date DESC;`;

    const result = await pool.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching applications for user ${userId}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// --- GET APPLICANTS FOR A SPECIFIC JOB (FINAL, CORRECTED QUERY) ---
export const getApplicantsForJob = async (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  const { jobId } = req.params;
  const { page = 1 } = req.query;
  const limit = 1;

  try {
    // Security Check (remains the same)
    const jobOwnerQuery = `SELECT c.owner_id FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = $1;`;
    const jobOwnerResult = await pool.query(jobOwnerQuery, [jobId]);
    if (jobOwnerResult.rows.length === 0)
      return res.status(404).json({ message: "Job not found." });
    const ownerId = jobOwnerResult.rows[0].owner_id;
    if (ownerId !== userId && userRole !== "admin") {
      return res.status(403).json({ message: "Permission denied." });
    }

    // --- TOTAL COUNT LOGIC (remains the same) ---
    const totalCountQuery = `SELECT COUNT(*) FROM job_applications WHERE job_id = $1`;
    const totalResult = await pool.query(totalCountQuery, [jobId]);
    const totalApplicants = parseInt(totalResult.rows[0].count, 10);
    if (totalApplicants === 0) {
      return res
        .status(200)
        .json({
          applicants: [],
          pagination: { currentPage: 1, totalPages: 0, totalApplicants: 0 },
        });
    }

    // --- APPLICANT FETCH LOGIC (THE FIX IS HERE) ---
    const offset = (page - 1) * limit;
    const applicantsQuery = `
            SELECT
                -- From users table (aliased as u)
                u.id AS user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.avatar_url,
                u.phone_number,
                u.gender,
                u.kingschat_id,
                u.kingschat_username,
                
                -- From job_applications table (aliased as ja)
                ja.application_date,
                ja.status,
                
                -- From user_profiles table (aliased as up)
                up.headline,
                up.bio,
                up.skills,
                up.portfolio_url,
                up.linkedin_url,
                up.age,
                up.field_of_study,
                up.zone,
                up.church,
                up.ministry_position,
                up.appointment_year
            FROM job_applications ja
            JOIN users u ON ja.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE ja.job_id = $1
            ORDER BY ja.application_date ASC
            LIMIT $2 OFFSET $3;
        `;
    const applicantsResult = await pool.query(applicantsQuery, [
      jobId,
      limit,
      offset,
    ]);

    // Send back the data and pagination metadata
    res.status(200).json({
      applicants: applicantsResult.rows,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages: totalApplicants,
        totalApplicants,
      },
    });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching applicants." });
  }
};
