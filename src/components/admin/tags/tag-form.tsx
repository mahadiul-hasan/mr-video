"use client";

import { useState, useTransition } from "react";
import { createTag, updateTag } from "@/app/actions/tag";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TagForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void;
  initialData?: {
    id?: string;
    name: string;
    slug: string;
  } | null;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initialData?.id;

  function handleSubmit() {
    startTransition(async () => {
      if (isEdit && initialData?.id) {
        await updateTag(initialData.id, { name, slug });
      } else {
        await createTag({ name, slug });
      }

      setName("");
      setSlug("");
      onSuccess?.();
    });
  }

  return (
    <div className="space-y-2 border p-3 rounded-md">
      <Input
        placeholder="Tag name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Input
        placeholder="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />

      <Button onClick={handleSubmit} disabled={isPending}>
        {isPending
          ? isEdit
            ? "Updating..."
            : "Creating..."
          : isEdit
            ? "Update Tag"
            : "Create Tag"}
      </Button>
    </div>
  );
}
