import { adminClient } from "./auth.ts";

export async function consumeRateLimit(
  req: Request,
  subject: string | null,
  limit: number,
  scope: string,
  windowSeconds = 60,
): Promise<boolean> {
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown")
    .split(",")[0].trim().slice(0, 100);
  const key = scope + ":" + (subject || "ip:" + ip);
  const { data, error } = await adminClient().rpc("consume_designly_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate-limit rpc error", error);
    return true;
  }
  return data === true;
}
