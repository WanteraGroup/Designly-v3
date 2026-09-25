import { requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";

// A CORS origin-lista a DESIGNLY sajat domainjeire szukitve. Az `*` minden
// weboldalnak engedte volna a vegpont beagyazasat, ami a felhasznalo Supabase
// kvotajan generált volna. A Supabase edge function viszont mas origin-rol is
// hivhato (pl. lokalis fejlesztoi szerver, Vercel preview), ezert a lista
// bovitheto a DESIGNLY_ALLOWED_ORIGINS env valtozoval, vesszovel elvalasztva.
const DEFAULT_ORIGINS = [
  "https://designly-v3.vercel.app",
  "https://designly-v3-designlystudio36-1723.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function allowedOrigins(): string[] {
  const extra = (Deno.env.get("DESIGNLY_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

/**
 * A keres origin-je alapjan allitja be az Allow-Origin fejlecet. Ha az origin
 * nincs a listan, a fejlec elmarad — a bongeszo ekkor maga tiltja a valaszt,
 * tehat a szuro a bongeszoben ervenyesul, nem a szerveren.
 */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const isDesignlyVercelDeployment = /^https:\/\/designly-v3(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
  if (origin && (allowed.includes(origin) || isDesignlyVercelDeployment)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
