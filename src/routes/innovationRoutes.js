import { Router } from "express";
import {
  submitInnovation,
  getAllInnovations,
  getInnovationById,
  upload,
} from "../controllers/innovationController.js"; // Import upload
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = Router();

// router.post("/", submitInnovation);
router.get("/", getAllInnovations);
router.get("/:id", getInnovationById);

router.post('/', isAuthenticated, upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'photos', maxCount: 5 } // Allow up to 5 photos
]), submitInnovation);

export default router;
