import { supabase } from "../lib/supabase.js";
import crypto from "crypto";
import { env } from "../config/env.js";

const razorpayOrders = new Map();

const getProjectForFunding = async (projectId) => {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }
  if (!project) {
    return null;
  }
  return project;
};

export const createMockPaymentIntent = async ({ projectId, backerId, amount }) => {
  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const project = await getProjectForFunding(projectId);
  if (!project) {
    return null;
  }

  const remaining = Math.max(Number(project.goal_amount) - Number(project.raised_amount), 0);
  if (safeAmount > remaining) {
    throw new Error(`Amount exceeds remaining goal (${remaining}).`);
  }

  const { data: contribution, error } = await supabase
    .from("contributions")
    .insert({
      project_id: projectId,
      backer_id: backerId,
      amount: safeAmount,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create mock payment intent: ${error.message}`);
  }

  return contribution;
};

const markContributionFailed = async (contributionId) => {
  const { error: failError } = await supabase
    .from("contributions")
    .update({ status: "failed" })
    .eq("id", contributionId);

  if (failError) {
    throw new Error(`Failed to mark payment as failed: ${failError.message}`);
  }

  return { status: "failed", project: null };
};

const markContributionSucceeded = async ({ contribution, backerId }) => {
  const project = await getProjectForFunding(contribution.project_id);
  if (!project) {
    throw new Error("Project not found for contribution.");
  }

  const remaining = Math.max(Number(project.goal_amount) - Number(project.raised_amount), 0);
  if (Number(contribution.amount) > remaining) {
    throw new Error(`Amount exceeds remaining goal (${remaining}).`);
  }

  const { count: priorSuccessCount, error: priorError } = await supabase
    .from("contributions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", contribution.project_id)
    .eq("backer_id", backerId)
    .eq("status", "succeeded");

  if (priorError) {
    throw new Error(`Failed to verify prior successful contributions: ${priorError.message}`);
  }

  const { error: successError } = await supabase
    .from("contributions")
    .update({ status: "succeeded" })
    .eq("id", contribution.id);

  if (successError) {
    throw new Error(`Failed to mark payment as succeeded: ${successError.message}`);
  }

  const { data: updatedProject, error: projectUpdateError } = await supabase
    .from("projects")
    .update({
      raised_amount: Number(project.raised_amount) + Number(contribution.amount),
      backers_count: Number(project.backers_count) + ((priorSuccessCount ?? 0) > 0 ? 0 : 1),
    })
    .eq("id", contribution.project_id)
    .select("*")
    .single();

  if (projectUpdateError) {
    throw new Error(`Failed to update project totals: ${projectUpdateError.message}`);
  }

  return { status: "succeeded", project: updatedProject };
};

const finalizeContribution = async ({ contributionId, backerId, simulate = "success" }) => {
  const outcome = simulate === "failed" ? "failed" : "success";

  const { data: contribution, error: contributionError } = await supabase
    .from("contributions")
    .select("*")
    .eq("id", contributionId)
    .eq("backer_id", backerId)
    .maybeSingle();

  if (contributionError) {
    throw new Error(`Failed to load contribution intent: ${contributionError.message}`);
  }

  if (!contribution) {
    return null;
  }

  if (contribution.status !== "pending") {
    throw new Error("Contribution intent is already finalized.");
  }

  if (outcome === "failed") {
    return markContributionFailed(contribution.id);
  }

  return markContributionSucceeded({ contribution, backerId });
};

const createDummyRazorpayOrderId = () => `order_${crypto.randomBytes(8).toString("hex")}`;

export const createRazorpayOrder = async ({ projectId, backerId, amount }) => {
  const contribution = await createMockPaymentIntent({ projectId, backerId, amount });
  if (!contribution) {
    return null;
  }

  const orderId = createDummyRazorpayOrderId();
  razorpayOrders.set(orderId, { contributionId: contribution.id, backerId });

  return {
    contributionId: contribution.id,
    razorpayOrderId: orderId,
    keyId: env.razorpayKeyId ?? "rzp_test_dummy",
    amount: Number(contribution.amount),
    currency: "INR",
  };
};

export const verifyRazorpayPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  backerId,
  simulate = "success",
}) => {
  const order = razorpayOrders.get(razorpayOrderId);
  if (!order || order.backerId !== backerId) {
    return null;
  }

  if (simulate !== "success" && simulate !== "failed") {
    throw new Error("Invalid simulate value. Use 'success' or 'failed'.");
  }

  if (simulate === "success") {
    const hasLiveVerificationPayload = razorpayPaymentId && razorpaySignature;
    if (hasLiveVerificationPayload) {
      const keySecret = env.razorpayKeySecret;
      if (!keySecret) {
        throw new Error("RAZORPAY_KEY_SECRET is required for signature verification.");
      }

      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expected !== razorpaySignature) {
        throw new Error("Invalid Razorpay signature.");
      }
    }
  }

  const result = await finalizeContribution({
    contributionId: order.contributionId,
    backerId,
    simulate,
  });

  if (result) {
    razorpayOrders.delete(razorpayOrderId);
  }

  return result;
};

export const confirmMockPayment = async ({ contributionId, backerId, simulate = "success" }) => {
  return finalizeContribution({ contributionId, backerId, simulate });
};
