import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
export const cookieName = "arcade_admin";
const encoder = new TextEncoder();
export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const aa = new Uint8Array(x),
    bb = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
export async function createSession(secret: string) {
  if (secret.length < 32)
    throw new Error("Session secret must be at least 32 characters");
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("8090-admin")
    .setIssuer("8090")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(encoder.encode(secret));
}
export async function verifySession(
  token: string | undefined,
  secret: string | undefined,
) {
  if (!token || !secret || secret.length < 32) return false;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      algorithms: ["HS256"],
      audience: "8090-admin",
      issuer: "8090",
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
export async function isAdmin(request: Request, env: CloudflareEnv) {
  if (env.ACCESS_TEAM_DOMAIN || env.ACCESS_AUD) {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
    try {
      const domain = new URL(`https://${env.ACCESS_TEAM_DOMAIN}`);
      if (!domain.hostname.endsWith(".cloudflareaccess.com")) return false;
      const token = request.headers.get("Cf-Access-Jwt-Assertion");
      if (!token) return false;
      await jwtVerify(
        token,
        createRemoteJWKSet(new URL("/cdn-cgi/access/certs", domain)),
        {
          issuer: domain.origin,
          audience: env.ACCESS_AUD,
          algorithms: ["RS256"],
        },
      );
      return true;
    } catch {
      return false;
    }
  }
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  return verifySession(token, env.ADMIN_SESSION_SECRET);
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export async function rateLimit(
  db: D1Database,
  key: string,
  max: number,
  seconds = 60,
) {
  const window = Math.floor(Date.now() / 1000 / seconds);
  const result = await db
    .prepare(
      `INSERT INTO rate_limits(key,window,count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count`,
    )
    .bind(key, window)
    .first<{ count: number }>();
  return (result?.count || 0) <= max;
}
