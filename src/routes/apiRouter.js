import { Router } from "express";
import authRoutes from "./authRoutes.js";
import insightRoutes from "./insightRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import projectRoutes from "./projectRoutes.js";
import { authenticateFirebase } from "../middleware/authenticateFirebase.js";

const apiRouter = Router();

// Health check
apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "fundforge-api",
    timestamp: new Date().toISOString(),
  });
});

// Public routes
apiRouter.use("/projects", projectRoutes);
apiRouter.use("/payments", paymentRoutes);

// Protected routes
apiRouter.use(authenticateFirebase);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/", insightRoutes);

export default apiRouter;