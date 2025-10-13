import pool from "../config/db.js";

// --- CREATE A NEW JOB (ADVANCED, ROLE-AWARE VERSION) ---
export const createJob = async (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  // Admins will send a company_id; employers will not.
  const { title, description, location, tags, company_id } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ message: "Title and description are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let companyId;

    if (userRole === "admin") {
      // --- ADMIN LOGIC ---
      // Admin must provide a company_id. We trust it because they are an admin.
      if (!company_id) {
        throw new Error("Admin must select a company to post a job for.");
      }
      // We should still verify the company exists to be safe.
      const companyCheck = await client.query(
        "SELECT id FROM companies WHERE id = $1",
        [company_id]
      );
      if (companyCheck.rowCount === 0) {
        throw new Error("Selected company does not exist.");
      }
      companyId = company_id;
    } else if (userRole === "employer") {
      // --- EMPLOYER LOGIC ---
      // Find the company ID owned by this employer.
      const companyResult = await client.query(
        "SELECT id FROM companies WHERE owner_id = $1",
        [userId]
      );
      if (companyResult.rows.length === 0) {
        throw new Error("User does not own a company profile.");
      }
      companyId = companyResult.rows[0].id;
    } else {
      // A regular user should not be able to access this endpoint.
      return res.status(403).json({ message: "Permission denied." });
    }

    // Now, insert the job with the correctly determined companyId.
    const query = `
            INSERT INTO jobs (title, description, location, tags, company_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
    const tagsArray = Array.isArray(tags)
      ? tags
      : tags
      ? tags.split(",").map((t) => t.trim())
      : [];
    const values = [title, description, location, tagsArray, companyId];
    const result = await client.query(query, values);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Job created successfully!",
      job: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating job:", error);
    res.status(500).json({
      message: "Server error while creating job.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

export const getAllJobs = async (req, res) => {
  const { searchQuery } = req.query; // Only one search query now
  try {
    let query = `
            SELECT j.*, c.name AS company_name
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
        `;
    const queryParams = [];
    let whereClause = " WHERE j.status = 'open' "; // <-- THE FIX: Only select 'open' jobs

    if (searchQuery) {
      // Search in title, company name, AND tags array
      whereClause += ` AND (j.title ILIKE $1 OR c.name ILIKE $1 OR $1 ILIKE ANY(j.tags))`;
      queryParams.push(`%${searchQuery}%`);
    }

    query += whereClause + " ORDER BY j.posted_at DESC;";

    const result = await pool.query(query, queryParams);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    res.status(500).json({ message: "Server error while fetching jobs." });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `SELECT jobs.id, jobs.title, 
        jobs.description, jobs.location, jobs.tags, 
        jobs.posted_at, companies.name AS company_name, 
        companies.website AS company_website, 
        companies.description AS company_description
        FROM jobs LEFT JOIN companies ON jobs.company_id = companies.id
        WHERE jobs.id = $1;`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching job with id ${req.params.id}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// --- GET JOBS FOR THE DASHBOARD (Role-Aware and CORRECTED) ---
export const getMyJobs = async (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;

  try {
    let jobsResult;

    if (userRole === "admin") {
      // --- ADMIN LOGIC (CORRECTED) ---
      console.log("Fetching all jobs for admin user...");

      // THE FIX: Explicitly select j.* AND c.name AS company_name
      const query = `
                SELECT 
                    j.*, 
                    c.name AS company_name 
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                ORDER BY j.posted_at DESC;
            `;
      jobsResult = await pool.query(query);
    } else if (userRole === "employer") {
      // --- EMPLOYER LOGIC (This part is already correct) ---
      console.log("Fetching jobs for employer user...");
      const companyResult = await pool.query(
        "SELECT id FROM companies WHERE owner_id = $1",
        [userId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(200).json([]);
      }
      const companyIds = companyResult.rows.map((row) => row.id);

      // This query is also correct, but let's add the company name for consistency,
      // even though an employer only has one company.
      const employerQuery = `
                SELECT j.*, c.name AS company_name
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                WHERE j.company_id = ANY($1::int[]) 
                ORDER BY j.posted_at DESC
            `;
      jobsResult = await pool.query(employerQuery, [companyIds]);
    } else {
      return res.status(200).json([]);
    }

    res.status(200).json(jobsResult.rows);
  } catch (error) {
    console.error("Error fetching employer/admin jobs:", error);
    res.status(500).json({ message: "Server error while fetching your jobs." });
  }
};

// --- NEW: DELETE A JOB (Protected) ---
export const deleteJob = async (req, res) => {
  const userId = req.session.user.id;
  const { id: jobId } = req.params;

  try {
    // Security check: Verify that the user owns the company that owns the job
    const { rows } = await pool.query(
      `SELECT j.id FROM jobs j JOIN companies c ON j.company_id = c.id
             WHERE j.id = $1 AND c.owner_id = $2`,
      [jobId, userId]
    );

    if (rows.length === 0 && req.session.user.role !== "admin") {
      // If not an admin and don't own the job, deny access
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this job." });
    }

    // Proceed with deletion
    await pool.query("DELETE FROM jobs WHERE id = $1", [jobId]);
    res.status(200).json({ message: "Job deleted successfully." });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ message: "Server error while deleting job." });
  }
};

// --- NEW: UPDATE A JOB (Protected) ---
export const updateJob = async (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  const { id: jobId } = req.params;
  const { title, description, location, tags } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ message: "Title and description are required." });
  }

  try {
    // Security Check: Verify that the user owns the job or is an admin
    const ownerCheck = await pool.query(
      `SELECT c.owner_id FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = $1`,
      [jobId]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (ownerCheck.rows[0].owner_id !== userId && userRole !== "admin") {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this job." });
    }

    // Proceed with the update
    const query = `
            UPDATE jobs SET
                title = $1,
                description = $2,
                location = $3,
                tags = $4
            WHERE id = $5
            RETURNING *;
        `;
    const tagsArray = Array.isArray(tags)
      ? tags
      : tags
      ? tags.split(",").map((t) => t.trim())
      : [];
    const values = [title, description, location, tagsArray, jobId];

    const result = await pool.query(query, values);

    res
      .status(200)
      .json({ message: "Job updated successfully!", job: result.rows[0] });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Server error while updating job." });
  }
};

// --- NEW: UPDATE A JOB'S STATUS (Protected) ---
export const updateJobStatus = async (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  const { id: jobId } = req.params;
  const { status } = req.body;

  const validStatuses = ["open", "closed"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: "A valid status is required." });
  }

  try {
    // Security Check (same as in updateJob)
    const ownerCheck = await pool.query(
      `SELECT c.owner_id FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = $1`,
      [jobId]
    );
    if (ownerCheck.rowCount === 0)
      return res.status(404).json({ message: "Job not found." });
    if (ownerCheck.rows[0].owner_id !== userId && userRole !== "admin") {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this job." });
    }

    // Proceed with the status update
    const query = "UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *;";
    const result = await pool.query(query, [status, jobId]);

    res.status(200).json({
      message: "Job status updated successfully!",
      job: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    res
      .status(500)
      .json({ message: "Server error while updating job status." });
  }
};
