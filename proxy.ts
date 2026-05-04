import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isLogin = pathname === "/admin/login";

  const token = req.cookies.get("admin_token")?.value;

  if (!token) {
    if (isLogin) return NextResponse.next();

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
