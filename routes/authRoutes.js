import { Router } from "express";
import { signIn, signUp } from "../controllers/authController.js";

const authRoutes = Router();

authRoutes.post("/signup", signUp);
authRoutes.post("/signin", signIn);

export default authRoutes;
