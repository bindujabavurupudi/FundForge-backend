import dotenv from "dotenv";

dotenv.config();

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "*",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  cashfreeAppId: process.env.CASHFREE_APP_ID ?? "",
  cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY ?? "",
  cashfreeEnvironment: process.env.CASHFREE_ENVIRONMENT ?? "SANDBOX",
};

export const assertEnv = () => {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};
