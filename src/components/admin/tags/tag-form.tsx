// components/admin/tags/tag-form.tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { slugify } from "@/lib/videos/slug";

type TagFormProps = {
  action: (
    prevState: TagActionState,
    formData: FormData,
  ) => Promise<TagActionState>;
  initialData?: {
    id?: string;
    name?: string;
    slug?: string;
  };
  submitLabel: string;
  redirectTo?: string;
};

type TagActionState = {
  success: boolean;
  error?: string | null;
  data?: unknown;
};

export function TagForm({
  action,
  initialData,
  submitLabel,
  redirectTo,
}: TagFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, {
    success: false,
    error: null,
    data: null,
  });

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);

    if (!isSlugManuallyEdited) {
      setSlug(slugify(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setIsSlugManuallyEdited(true);
  };

  useEffect(() => {
    if (state?.success) {
      toast.success(
        `Tag ${initialData?.id ? "updated" : "created"} successfully.`,
        { position: "top-right" },
      );

      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      }
    }

    if (state?.error) {
      toast.error(state.error, { position: "top-right" });
    }
  }, [state?.success, state?.error, redirectTo, router, initialData?.id]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Tag Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter tag name"
          value={name}
          onChange={handleNameChange}
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug *</Label>
        <Input
          id="slug"
          name="slug"
          placeholder="tag-url-slug"
          value={slug}
          onChange={handleSlugChange}
          required
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          {!isSlugManuallyEdited && slug && "Auto-generated from name"}
          {!isSlugManuallyEdited && !slug && "Will be auto-generated from name"}
          {isSlugManuallyEdited && "Manually edited (auto-generation paused)"}
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Processing..." : submitLabel}
      </Button>
    </form>
  );
}
