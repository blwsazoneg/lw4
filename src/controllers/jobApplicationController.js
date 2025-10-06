import pool from '../config/db.js';

export const applyForJob = async (req, res) => {
    // const { user_id, job_id} = req.body;
    const { job_id } = req.body;
    const user_id = req.session.user.id;

    if (!job_id) {
        return res.status(400).json({ message: 'job_id is required.' });
    }

    try {
        const query = `INSERT INTO job_applications (user_id, job_id) VALUES ($1, $2) RETURNING *;`;
        const values = [user_id, job_id];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Application submitted successfully!',
            application: result.rows[0]
        });
    } catch (error) {
            if (error.code === '23505') {
      return res.status(409).json({ message: 'You have already applied for this job.' });
    }

        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ message: 'Invalid user_id or job_id. User or Job does not exist.' });
        }

        console.error('Error submitting application:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        res.status(500).json({ message: 'Internal server error' });
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
        res.status(500).json({ message: 'Internal server error' });
    }
};