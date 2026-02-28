import { Router } from "express";
import {
  getCreatorDashboardController,
  getRecommendationsController,
} from "../controllers/insightsController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/recommendations", asyncHandler(getRecommendationsController));
router.get("/dashboard/creator", asyncHandler(getCreatorDashboardController));

export default router;

