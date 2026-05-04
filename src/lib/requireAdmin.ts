import { cookies } from "next/headers";
import { headers } from "next/headers";
import { verifyToken } from "./auth";
import { assertRateLimit } from "./rate-limit";

export async function requireAdmin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "unknown";

  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) throw new Error("Invalid request origin");
  }

  assertRateLimit({
    key: `admin-mutation:${forwardedFor.split(",")[0]}`,
    limit: 240,
    windowMs: 60_000,
  });

  const cookieStore = await cookies();

  const token = cookieStore.get("admin_token")?.value;

  if (!token) throw new Error("Unauthorized");

  const payload = await verifyToken(token);

  if (!payload) throw new Error("Unauthorized");

  return payload;
}
