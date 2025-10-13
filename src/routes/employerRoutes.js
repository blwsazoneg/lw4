import { Router } from "express";
import { registerCompany, checkCompanyProfile } from '../controllers/employerController.js';
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = Router();

router.get('/my-company', isAuthenticated, checkCompanyProfile);

router.post('/register', isAuthenticated, registerCompany);

export default router;
