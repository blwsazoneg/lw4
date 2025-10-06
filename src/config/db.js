// src/config/db.js

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// --- PRODUCTION CONFIGURATION ---
// Check if the NODE_ENV is 'production' (Render will set this for us)
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If in production, add the SSL configuration.
  // Render requires SSL connections.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("Successfully connected to PostgreSQL database!");
  client.release();
});

export default pool;
