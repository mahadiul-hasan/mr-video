"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;

    if (state.error) {
      toast.error(state.error, {
        position: "top-right",
      });
    }

    if (state.success) {
      toast.success("Login successful", {
        position: "top-right",
      });

      // ✅ correct client navigation
      router.replace("/admin/dashboard");
    }
  }, [state, router]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">Login</CardTitle>
        </CardHeader>

        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  placeholder="your username"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="your password"
                />
              </Field>

              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Logging in..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
