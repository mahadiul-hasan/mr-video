"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
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

  try {
    assertRateLimit({
      key: `login:${forwardedFor.split(",")[0]}`,
      limit: 10,
      windowMs: 60_000,
    });
  } catch {
    return { error: "Too many login attempts. Try again soon." };
  }

  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const { username, password } = parsed.data;

  const admin = await prisma.admin.findUnique({
    where: { username },
  });

  if (!admin) return { error: "Invalid credentials" };

  const valid = await bcrypt.compare(password, admin.passwordHash);

  if (!valid) return { error: "Invalid credentials" };

  const token = await signToken({ id: admin.id });

  const cookieStore = await cookies();

  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();

  cookieStore.set("admin_token", "", {
    maxAge: 0,
    path: "/",
  });
}
