"use client";

import { useState, useTransition } from "react";
import { createCategory, updateCategory } from "@/app/actions/category";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CategoryForm({
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
        await updateCategory(initialData.id, { name, slug });
      } else {
        await createCategory({ name, slug });
      }

      setName("");
      setSlug("");
      onSuccess?.();
    });
  }

  return (
    <div className="space-y-2 border p-3 rounded-md">
      <Input
        placeholder="Category name"
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
            ? "Update Category"
            : "Create Category"}
      </Button>
    </div>
  );
}
