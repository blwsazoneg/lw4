import pool from "../config/db.js";
import multer from "multer";
import path from "path";

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save files to the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname-timestamp.extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
export const upload = multer({ storage: storage });

// --- SUBMIT INNOVATION (NOW HANDLES FILES) ---
export const submitInnovation = async (req, res) => {
  const userId = req.session.user.id;
  const { title, submission_text, ministry_position } = req.body; // Text fields from FormData

  if (!title || !submission_text) {
    return res
      .status(400)
      .json({ message: "Title and submission text are required." });
  }

  // Multer puts file info into req.files and req.file
  // We will just store the path to the file in our database
  const documentPath = req.files?.document?.[0].path;
  const videoPath = req.files?.video?.[0].path;
  // req.files.photos is an array of photo files
  const photoPaths = req.files?.photos?.map((file) => file.path);

  try {
    // We will store file paths in the DB.
    // For simplicity, we can adapt the existing `document_path` or add new columns.
    // Let's adapt `document_path` to store a JSON object of all paths.
    const allFilePaths = {
      document: documentPath,
      video: videoPath,
      photos: photoPaths,
    };

    const query = `
            INSERT INTO innovations (user_id, title, submission_text, ministry_position, document_path)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
    // We save the JSON object as a string.
    const values = [
      userId,
      title,
      submission_text,
      ministry_position,
      JSON.stringify(allFilePaths),
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Innovation submitted successfully!",
      innovation: result.rows[0],
    });
  } catch (error) {
    console.error("Error submitting innovation:", error);
    res
      .status(500)
      .json({ message: "Server error while submitting innovation." });
  }
};

export const getAllInnovations = async (req, res) => {
  try {
    const query = "SELECT * FROM innovations ORDER BY submitted_at DESC;";
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching innovations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getInnovationById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = "SELECT * FROM innovations WHERE id = $1;";
    const values = [id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Innovation not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching innovation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const submitInnovation = async (req, res) => {
//   // const {  title, submission_text, user_id } = req.body;
//   const { title, submission_text } = req.body;
//   const user_id = req.session.user.id;

//   if (!title || !submission_text) {
//     return res
//       .status(400)
//       .json({ message: "Title and submission text are required." });
//   }

//   try {
//     const query = `INSERT INTO innovations (title, submission_text, user_id) VALUES ($1, $2, $3) RETURNING *;`;
//     const values = [title, submission_text, user_id];
//     const result = await pool.query(query, values);

//     res.status(201).json({
//       message: "Innovation submitted successfully!",
//       innovation: result.rows[0],
//     });
//   } catch (error) {
//     console.error("Error submitting innovation:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
