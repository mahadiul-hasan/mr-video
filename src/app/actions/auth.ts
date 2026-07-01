"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

type LoginState = {
  error?: string;
  success?: boolean;
} | null;

export async function loginAction(_: LoginState, formData: FormData) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "unknown";
  const clientIp = forwardedFor.split(",")[0].trim();

  // Use Redis-based rate limiting with stricter limits for login
  try {
    const rateLimitResult = await rateLimit(`login:${clientIp}`, "ADMIN");

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return {
        error: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
      };
    }
  } catch {}

  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error:
        "Invalid input. Username must be at least 3 characters and password at least 6 characters.",
    };
  }

  const { username, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      // Add a small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { error: "Invalid credentials" };
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);

    if (!valid) {
      // Add a small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { error: "Invalid credentials" };
    }

    const token = await signToken({ id: admin.id });

    const cookieStore = await cookies();

    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return { success: true };
  } catch {
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();

  cookieStore.set("admin_token", "", {
    maxAge: 0,
    path: "/",
  });

  // Optional: Revalidate paths after logout
  // revalidatePath("/admin");
}


