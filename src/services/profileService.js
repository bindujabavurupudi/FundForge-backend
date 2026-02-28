import { supabase } from "../lib/supabase.js";

export const upsertProfile = async ({ uid, email, name }) => {
  const payload = {
    id: uid,
    email: email ?? null,
    name,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }

  return data;
};

export const getProfileById = async (uid) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
};

