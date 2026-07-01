// components/admin/videos/video-form.tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { slugify } from "@/lib/videos/slug";
import dynamic from "next/dynamic";

// Dynamically import VideoUploader with no SSR
const VideoUploader = dynamic(
  () => import("./video-uploader").then((mod) => mod.VideoUploader),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-50 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading uploader...</p>
        </div>
      </div>
    ),
  },
);

type Option = { id: string; name: string };
export type VideoFormState = {
  success: boolean;
  error: string | null;
  data: unknown;
};

type VideoFormProps = {
  action: (prevState: VideoFormState, formData: FormData) => Promise<VideoFormState>;
  initialData?: {
    id?: string;
    title?: string;
    slug?: string;
    categoryId?: string | null;
    isPublished?: boolean;
    tags?: { tag: Option }[];
  };
  categories: Option[];
  tags: Option[];
  submitLabel: string;
  redirectTo?: string;
};

export function VideoForm({
  action,
  initialData,
  categories,
  tags,
  submitLabel,
  redirectTo,
}: VideoFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, {
    success: false,
    error: null,
    data: null,
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    initialData?.categoryId || "_none",
  );
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(newTitle));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setIsSlugManuallyEdited(true);
  };

  useEffect(() => {
    if (!isPending) return;

    const startTimer = window.setTimeout(() => setUploadProgress(8), 0);
    const interval = window.setInterval(() => {
      setUploadProgress((current) => Math.min(current + 7, 92));
    }, 450);

    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
    };
  }, [isPending]);

  useEffect(() => {
    if (state?.success && redirectTo) {
      toast.success(
        `Video ${initialData?.id ? "updated" : "created"} successfully.`,
        {
          position: "top-right",
        },
      );
      router.push(redirectTo);
      router.refresh();
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

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={handleTitleChange}
          required
          className="w-full"
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={handleSlugChange}
          placeholder="auto-generated"
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          URL-friendly version (auto-generated from title)
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <input type="hidden" name="categoryId" value={selectedCategory} />
        <Select
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">No category</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Video Upload with Drag & Drop - Client only */}
      <div className="space-y-2">
        <Label>Video File {!initialData?.id && "*"}</Label>
        <VideoUploader
          onFileSelect={(file) => setVideoFile(file)}
          disabled={isPending}
          currentFile={initialData?.id ? "existing" : undefined}
        />
        {videoFile && (
          <input
            type="file"
            name="videoFile"
            style={{ display: "none" }}
            ref={(input) => {
              if (input && videoFile) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(videoFile);
                input.files = dataTransfer.files;
              }
            }}
          />
        )}
        {(isPending || uploadProgress > 0) && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{uploadProgress >= 100 ? "Queued" : "Uploading"}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">
              No tags created yet.
            </p>
          )}
          {tags.map((tag) => {
            const checked = initialData?.tags?.some((t) => t.tag.id === tag.id);
            return (
              <label
                key={tag.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors"
              >
                <Checkbox
                  name="tagIds"
                  value={tag.id}
                  defaultChecked={checked}
                  className="cursor-pointer"
                />
                <span className="cursor-pointer select-none">{tag.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Published Status */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label htmlFor="isPublished" className="cursor-pointer">
          Published
        </Label>
        <Switch
          id="isPublished"
          name="isPublished"
          defaultChecked={initialData?.isPublished ?? false}
          className="cursor-pointer"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Uploading..." : submitLabel}
      </Button>
    </form>
  );
}
