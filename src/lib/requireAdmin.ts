import { cookies } from "next/headers";
import { headers } from "next/headers";
import { verifyToken } from "./auth";
import { rateLimit } from "./rate-limit";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "unknown";
  const clientIp = forwardedFor.split(",")[0].trim();

  // Rate limit admin mutations using Redis
  try {
    const rateLimitResult = await rateLimit(
      `admin-mutation:${clientIp}`,
      "ADMIN",
    );

    if (!rateLimitResult.success) {
      return { error: "Too many requests. Please try again later." };
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Too many requests")) {
      return { error: error.message };
    }
    return { error: "Unable to process request" };
  }

  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return { error: "Invalid request origin" };
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/admin/login");
  }

  return { payload };
}
