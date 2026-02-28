import {
  confirmMockPayment,
  createMockPaymentIntent,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../services/paymentService.js";
import { upsertProfile } from "../services/profileService.js";

export const createMockIntentController = async (req, res) => {
  await upsertProfile(req.user);

  const intent = await createMockPaymentIntent({
    projectId: req.body?.projectId,
    backerId: req.user.uid,
    amount: req.body?.amount,
  });

  if (!intent) {
    return res.status(404).json({ ok: false, error: "Project not found." });
  }

  return res.status(201).json({
    ok: true,
    data: {
      contributionId: intent.id,
      status: intent.status,
      amount: intent.amount,
    },
  });
};

export const confirmMockPaymentController = async (req, res) => {
  await upsertProfile(req.user);

  const result = await confirmMockPayment({
    contributionId: req.body?.contributionId,
    backerId: req.user.uid,
    simulate: req.body?.simulate,
  });

  if (!result) {
    return res.status(404).json({ ok: false, error: "Contribution intent not found." });
  }

  return res.status(200).json({ ok: true, data: result });
};

export const createRazorpayOrderController = async (req, res) => {
  await upsertProfile(req.user);

  const order = await createRazorpayOrder({
    projectId: req.body?.projectId,
    backerId: req.user.uid,
    amount: req.body?.amount,
  });

  if (!order) {
    return res.status(404).json({ ok: false, error: "Project not found." });
  }

  return res.status(201).json({ ok: true, data: order });
};

export const verifyRazorpayPaymentController = async (req, res) => {
  await upsertProfile(req.user);

  const result = await verifyRazorpayPayment({
    razorpayOrderId: req.body?.razorpayOrderId,
    razorpayPaymentId: req.body?.razorpayPaymentId,
    razorpaySignature: req.body?.razorpaySignature,
    simulate: req.body?.simulate,
    backerId: req.user.uid,
  });

  if (!result) {
    return res.status(404).json({ ok: false, error: "Razorpay order not found." });
  }

  return res.status(200).json({ ok: true, data: result });
};
