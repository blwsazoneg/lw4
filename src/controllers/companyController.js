import pool from "../config/db.js";

export const createCompany = async (req, res) => {
    const { name, description, website} = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Company name is required.' });
    }

    try {
        const query = `INSERT INTO companies (name, description, website) VALUES ($1, $2, $3) RETURNING *;`;
        const values = [name, description, website];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Company created successfully!',
            company: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Company with this name already exists.' });
        }
        console.error('Error creating company:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllCompanies = async (req, res) => {
    try {
        const query = 'SELECT * FROM companies ORDER BY name ASC;';
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};