import { verifyToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip rate limiting for static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get client IP - fixed for Next.js
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  // Apply rate limiting based on route
  const isAdminRoute = pathname.startsWith("/admin");
  const isSearchRoute =
    pathname.startsWith("/search") || pathname.includes("/search");
  const isApiRoute = pathname.startsWith("/api");

  let rateLimitType: "PUBLIC" | "SEARCH" | "API" | "ADMIN" = "PUBLIC";

  if (isAdminRoute) {
    rateLimitType = "ADMIN";
  } else if (isSearchRoute) {
    rateLimitType = "SEARCH";
  } else if (isApiRoute) {
    rateLimitType = "API";
  }

  // Check rate limit
  const rateLimitResult = await rateLimit(
    `${rateLimitType}:${ip}`,
    rateLimitType,
  );

  // Create response
  const response = NextResponse.next();

  // Add rate limit headers
  response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
  response.headers.set(
    "X-RateLimit-Remaining",
    rateLimitResult.remaining.toString(),
  );
  response.headers.set(
    "X-RateLimit-Reset",
    Math.ceil(rateLimitResult.reset / 1000).toString(),
  );

  // Add cache headers for CDN
  if (!isAdminRoute) {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    response.headers.set("CDN-Cache-Control", "max-age=3600");
    response.headers.set("Cloudflare-CDN-Cache-Control", "max-age=3600");
  }

  // If rate limited, return 429
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
        },
      },
    );
  }

  // Admin authentication logic
  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    const token = req.cookies.get("admin_token")?.value;

    if (!token) {
      if (isLogin) return response;
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // logged-in user should not see login page
    if (isLogin) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
