import { Router } from "express";
import {
  createMockIntentController,
  confirmMockPaymentController,
  createCashfreeOrderController,
  verifyCashfreePaymentController,
} from "../controllers/paymentController.js";
import { authenticateFirebase } from "../middleware/authenticateFirebase.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/cashfree/order", authenticateFirebase, asyncHandler(createCashfreeOrderController));
router.post("/cashfree/verify", authenticateFirebase, asyncHandler(verifyCashfreePaymentController));

router.post("/mock-intent", authenticateFirebase, asyncHandler(createMockIntentController));
router.post("/mock-confirm", authenticateFirebase, asyncHandler(confirmMockPaymentController));

export default router;
