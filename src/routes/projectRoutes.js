import { Router } from "express";
import {
  addCommentController,
  addCommentReplyController,
  addContributionController,
  addProjectUpdateController,
  createProjectController,
  getProjectByIdController,
  listMyProjectsController,
  listProjectsController,
  trackProjectViewController,
} from "../controllers/projectController.js";
import { authenticateFirebase } from "../middleware/authenticateFirebase.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listProjectsController));
router.get("/my", authenticateFirebase, asyncHandler(listMyProjectsController));
router.get("/me", authenticateFirebase, asyncHandler(listMyProjectsController));
router.get("/:projectId", asyncHandler(getProjectByIdController));

router.post("/", authenticateFirebase, asyncHandler(createProjectController));
router.post("/:projectId/views", authenticateFirebase, asyncHandler(trackProjectViewController));
router.post("/:projectId/contributions", authenticateFirebase, asyncHandler(addContributionController));
router.post("/:projectId/comments", authenticateFirebase, asyncHandler(addCommentController));
router.post("/:projectId/comments/:commentId/replies", authenticateFirebase, asyncHandler(addCommentReplyController));
router.post("/:projectId/updates", authenticateFirebase, asyncHandler(addProjectUpdateController));

export default router;
