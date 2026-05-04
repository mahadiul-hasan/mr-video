import { LoginForm } from "@/components/admin/auth/login-form";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (token) {
    const valid = await verifyToken(token);

    if (valid) {
      redirect("/admin/dashboard");
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
