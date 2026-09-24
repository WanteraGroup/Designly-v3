import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service credentials are not configured.");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requestUser(req: Request): Promise<User | null> {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function ensureProfile(userId: string): Promise<void> {
  const admin = adminClient();
  const { data } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (data?.id) return;
  const { error } = await admin.from("profiles").insert({
    id: userId,
    plan_id: "free",
    credits: 10,
    unlimited_access: false,
  });
  if (error && !String(error.code).includes("23505")) throw new Error("Profile létrehozása sikertelen.");
}

export async function consumeCredits(userId: string, amount: number, description: string): Promise<boolean> {
  const admin = adminClient();
  const { data, error } = await admin.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function refundCredits(userId: string, amount: number, description: string): Promise<void> {
  if (amount <= 0) return;
  const admin = adminClient();
  const { error } = await admin.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
  });
  if (error) throw new Error(error.message);
}
