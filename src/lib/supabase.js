import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
  );
}

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
