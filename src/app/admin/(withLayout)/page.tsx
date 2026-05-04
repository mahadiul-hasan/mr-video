import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminIndexPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const valid = await verifyToken(token);

  if (!valid) {
    redirect("/admin/login");
  }

  redirect("/admin/dashboard");
}
