import { Router } from "express";
import { bootstrapProfile, getAuthMe } from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const authRoutes = Router();

// Get current user profile
authRoutes.get("/me", asyncHandler(getAuthMe));

// Bootstrap profile (create profile if not exists)
authRoutes.post("/bootstrap", asyncHandler(bootstrapProfile));

export default authRoutes;