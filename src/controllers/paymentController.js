import {
  createCashfreeOrder,
  confirmMockPayment,
  createMockPaymentIntent,
  verifyCashfreePayment,
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

export const createCashfreeOrderController = async (req, res) => {
  await upsertProfile(req.user);

  const order = await createCashfreeOrder({
    projectId: req.body?.projectId,
    backerId: req.user.uid,
    amount: req.body?.amount,
  });

  if (!order) {
    return res.status(404).json({ ok: false, error: "Project not found." });
  }

  return res.status(201).json({ ok: true, data: order });
};

export const verifyCashfreePaymentController = async (req, res) => {
  await upsertProfile(req.user);

  const result = await verifyCashfreePayment({
    cashfreeOrderId: req.body?.cashfreeOrderId,
    simulate: req.body?.simulate,
    backerId: req.user.uid,
  });

  if (!result) {
    return res.status(404).json({ ok: false, error: "Cashfree order not found." });
  }

  return res.status(200).json({ ok: true, data: result });
};
