import pool from "../config/db.js";

export const createJob = async (req, res) => {
    const { title, description, location, tags, company_id} = req.body;

    if (!title || !description || !company_id) {
        return res.status(400).json({ message: 'Title, description, and company_id are required.' });
    }

    try {
        const query = `INSERT INTO jobs (title, description, location, tags, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const values = [title, description, location, tags, company_id];
        const result = await pool.query(query, values);
        res.status(201).json({
            message: 'Job created successfully!',
            job: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ message: 'Invalid company_id. Company does not exist.' });
        }
        console.error('Error creating job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
};

export const getAllJobs = async (req, res) => {
    try {
        const query = `SELECT jobs.id, jobs.title, jobs.description, jobs.location, jobs.tags, jobs.posted_at, companies.name AS company_name, companies.website AS company_website
        FROM jobs LEFT JOIN companies ON jobs.company_id = companies.id
        ORDER BY jobs.posted_at DESC;`;
        const result = await pool.query(query);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
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
            return res.status(404).json({ message: 'Job not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`Error fetching job with id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
