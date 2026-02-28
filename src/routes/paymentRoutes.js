import { Router } from "express";
import {
  createMockIntentController,
  confirmMockPaymentController,
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
} from "../controllers/paymentController.js";
import { authenticateFirebase } from "../middleware/authenticateFirebase.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/razorpay/order", authenticateFirebase, asyncHandler(createRazorpayOrderController));
router.post("/razorpay/verify", authenticateFirebase, asyncHandler(verifyRazorpayPaymentController));

router.post("/mock-intent", authenticateFirebase, asyncHandler(createMockIntentController));
router.post("/mock-confirm", authenticateFirebase, asyncHandler(confirmMockPaymentController));

export default router;
