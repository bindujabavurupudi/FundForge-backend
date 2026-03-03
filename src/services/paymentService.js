import { Cashfree, CFEnvironment } from "cashfree-pg";
import crypto from "crypto";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";

const cashfreeOrders = new Map();
let cashfreeClient = null;

const isProjectExpired = (deadline) => {
  const deadlineDate = String(deadline ?? "").slice(0, 10);
  if (!deadlineDate) {
    return true;
  }
  const todayDate = new Date().toISOString().slice(0, 10);
  return deadlineDate < todayDate;
};

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

const configureCashfree = () => {
  if (cashfreeClient) {
    return cashfreeClient;
  }

  if (!env.cashfreeAppId || !env.cashfreeSecretKey) {
    throw new Error("CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required.");
  }

  const environment = String(env.cashfreeEnvironment).toUpperCase() === "PRODUCTION"
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX;

  cashfreeClient = new Cashfree(environment, env.cashfreeAppId, env.cashfreeSecretKey);
  return cashfreeClient;
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
  if (project.creator_id === backerId) {
    const err = new Error("Project creators cannot contribute to their own projects.");
    err.statusCode = 403;
    throw err;
  }
  if (isProjectExpired(project.deadline)) {
    const err = new Error("Project is expired and no longer accepts contributions.");
    err.statusCode = 403;
    throw err;
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
    throw new Error(`Failed to create payment intent: ${error.message}`);
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
  if (isProjectExpired(project.deadline)) {
    return markContributionFailed(contribution.id);
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

const createDummyCashfreeOrderId = () => `order_${crypto.randomBytes(8).toString("hex")}`;

export const createCashfreeOrder = async ({ projectId, backerId, amount }) => {
  const contribution = await createMockPaymentIntent({ projectId, backerId, amount });
  if (!contribution) {
    return null;
  }

  const cashfree = configureCashfree();

  const orderId = createDummyCashfreeOrderId();
  const sanitizedCustomerId = `user_${String(backerId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "guest"}`;

  const request = {
    order_id: orderId,
    order_amount: Number(contribution.amount),
    order_currency: "INR",
    customer_details: {
      customer_id: sanitizedCustomerId,
      customer_phone: "9999999999",
    },
  };

  const response = await cashfree.PGCreateOrder(request);
  const data = response?.data ?? {};

  cashfreeOrders.set(orderId, { contributionId: contribution.id, backerId });
  if (data.cf_order_id && data.cf_order_id !== orderId) {
    cashfreeOrders.set(data.cf_order_id, { contributionId: contribution.id, backerId });
  }

  return {
    contributionId: contribution.id,
    cashfreeOrderId: data.order_id ?? orderId,
    paymentSessionId: data.payment_session_id,
    amount: Number(contribution.amount),
    currency: "INR",
  };
};

export const verifyCashfreePayment = async ({ cashfreeOrderId, backerId, simulate = "success" }) => {
  const order = cashfreeOrders.get(cashfreeOrderId);
  if (!order || order.backerId !== backerId) {
    return null;
  }

  if (simulate !== "success" && simulate !== "failed") {
    throw new Error("Invalid simulate value. Use 'success' or 'failed'.");
  }

  const result = await finalizeContribution({
    contributionId: order.contributionId,
    backerId,
    simulate,
  });

  if (result) {
    cashfreeOrders.delete(cashfreeOrderId);
  }

  return result;
};

export const confirmMockPayment = async ({ contributionId, backerId, simulate = "success" }) => {
  return finalizeContribution({ contributionId, backerId, simulate });
};
