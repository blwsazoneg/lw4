// We use require() here because this is a .cjs (CommonJS) file.
const dotenv = require("dotenv");
const { Pool } = require("pg");

// Load environment variables from the .env file
dotenv.config();

// Create a new database pool connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// The main function to run the script
const promoteUser = async () => {
  // Get the email address from the command-line arguments
  // process.argv contains ['node', 'scripts/promote-user.cjs', 'user@example.com']
  const email = process.argv[2];

  // --- Validation ---
  if (!email) {
    console.error("ERROR: Please provide an email address as an argument.");
    console.log("Usage: node scripts/promote-user.cjs <user_email>");
    return; // Exit if no email is provided
  }

  console.log(`Attempting to promote user with email: ${email}`);

  try {
    // --- Database Operation ---
    const query = `
      UPDATE users
      SET role = 'admin'
      WHERE email = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [email]);

    // --- Check the Result ---
    if (result.rowCount === 0) {
      console.error(`ERROR: No user found with the email "${email}".`);
      console.log(
        "Please make sure the user has logged in at least once with KingsChat."
      );
    } else {
      const user = result.rows[0];
      console.log("✅ SUCCESS!");
      console.log(`   User: ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   New Role: ${user.role}`);
    }
  } catch (error) {
    console.error("An unexpected error occurred:", error);
  } finally {
    // --- Important: Close the connection pool ---
    await pool.end();
  }
};

// Run the function
promoteUser();
