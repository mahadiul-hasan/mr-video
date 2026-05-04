"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createVideoFromAsset,
  updateVideoFromAsset,
} from "@/app/actions/video";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/videos/slug";

type Option = {
  id: string;
  name: string;
};

type UploadPhase = "idle" | "video" | "thumbnail" | "saving" | "done" | "error";

type UploadProgress = {
  phase: UploadPhase;
  video: number;
  thumbnail: number;
};

export type VideoFormData = {
  id?: string;
  title: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  isPublished: boolean;
  tags: {
    tag: Option;
  }[];
};

export default function VideoForm({
  initialData,
  categories,
  tags,
  uploadConfig,
  onSuccess,
}: {
  initialData?: VideoFormData | null;
  categories: Option[];
  tags: Option[];
  uploadConfig: {
    cloudName: string;
    uploadPreset: string;
  };
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<UploadProgress>({
    phase: "idle",
    video: 0,
    thumbnail: 0,
  });
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!initialData?.id;
  const isWorking =
    isPending ||
    progress.phase === "video" ||
    progress.phase === "thumbnail" ||
    progress.phase === "saving";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        setProgress({ phase: "video", video: 0, thumbnail: 0 });

        const videoFile = formData.get("videoFile");
        const thumbnailFile = formData.get("thumbnailFile");
        const metadata = {
          title: String(formData.get("title") ?? ""),
          slug: String(formData.get("slug") ?? ""),
          description: String(formData.get("description") ?? ""),
          categoryId:
            formData.get("categoryId") === "_none"
              ? null
              : String(formData.get("categoryId") ?? ""),
          isPublished: formData.get("isPublished") === "on",
          tagIds: formData
            .getAll("tagIds")
            .filter((value): value is string => typeof value === "string"),
        };

        const hasVideoFile = videoFile instanceof File && videoFile.size > 0;
        const hasThumbnailFile =
          thumbnailFile instanceof File && thumbnailFile.size > 0;

        if (!isEdit && !hasVideoFile) {
          throw new Error("Video file is required");
        }

        if (hasThumbnailFile && !hasVideoFile) {
          throw new Error("Select a replacement video to change thumbnail");
        }

        const asset = hasVideoFile
          ? await uploadToCloudinary({
              videoFile,
              thumbnailFile: hasThumbnailFile ? thumbnailFile : null,
              title: metadata.title,
              uploadConfig,
              onProgress: (nextProgress) => {
                setProgress((current) => ({ ...current, ...nextProgress }));
              },
            })
          : null;

        setProgress((current) => ({ ...current, phase: "saving" }));

        if (isEdit && initialData?.id) {
          await updateVideoFromAsset(initialData.id, metadata, asset);
          toast.success("Video updated");
        } else {
          if (!asset) throw new Error("Video upload did not complete");
          await createVideoFromAsset(metadata, asset);
          toast.success("Video created");
        }

        formRef.current?.reset();
        setSelectedVideo("");
        setSelectedThumbnail("");
        setProgress((current) => ({
          phase: "done",
          video: asset ? 100 : 0,
          thumbnail: asset ? current.thumbnail : 0,
        }));
        window.setTimeout(
          () => setProgress({ phase: "idle", video: 0, thumbnail: 0 }),
          900,
        );
        onSuccess?.();
      } catch (error) {
        setProgress((current) => ({ ...current, phase: "error" }));
        toast.error(
          error instanceof Error ? error.message : "Video action failed",
        );
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-5 rounded-md border bg-background p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1 border-b pb-4">
        <h2 className="text-base font-semibold">
          {isEdit ? "Edit video" : "Create video"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload media to Cloudinary, then publish it to your video library.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            minLength={2}
            maxLength={180}
            defaultValue={initialData?.title ?? ""}
            onBlur={(event) => {
              const slugInput = formRef.current?.elements.namedItem("slug");
              if (!(slugInput instanceof HTMLInputElement)) return;
              if (!slugInput.value) slugInput.value = slugify(event.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            maxLength={220}
            defaultValue={initialData?.slug ?? ""}
            placeholder="auto-generated from title"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={initialData?.description ?? ""}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            name="categoryId"
            defaultValue={initialData?.categoryId ?? "_none"}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="videoFile">
            {isEdit ? "Replace video file" : "Video file"}
          </Label>
          <Input
            id="videoFile"
            name="videoFile"
            type="file"
            accept="video/*"
            required={!isEdit}
            disabled={isWorking}
            onChange={(event) => {
              setSelectedVideo(event.target.files?.[0]?.name ?? "");
              setProgress({ phase: "idle", video: 0, thumbnail: 0 });
            }}
          />
          <FileHint
            fileName={selectedVideo}
            fallback={isEdit ? "Keep current video if empty" : "Required"}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="thumbnailFile">Thumbnail image</Label>
          <Input
            id="thumbnailFile"
            name="thumbnailFile"
            type="file"
            accept="image/*"
            disabled={isWorking}
            onChange={(event) => {
              setSelectedThumbnail(event.target.files?.[0]?.name ?? "");
              setProgress((current) => ({ ...current, thumbnail: 0 }));
            }}
          />
          <FileHint fileName={selectedThumbnail} fallback="Optional" />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Visibility</p>
            <p className="text-xs text-muted-foreground">
              Published videos appear on the public homepage.
            </p>
          </div>
          <Checkbox
            id="isPublished"
            name="isPublished"
            defaultChecked={initialData?.isPublished ?? false}
            disabled={isWorking}
          />
          <Label htmlFor="isPublished">Published</Label>
        </div>
      </div>

      <UploadProgressPanel progress={progress} />

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags created yet.</p>
          )}
          {tags.map((tag) => {
            const checked = initialData?.tags.some(
              (item) => item.tag.id === tag.id,
            );

            return (
              <label key={tag.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  defaultChecked={checked}
                  disabled={isWorking}
                />
                {tag.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button type="submit" disabled={isWorking}>
          {getSubmitLabel({ isEdit, progress, isPending })}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isWorking}
          onClick={onSuccess}
        >
          Cancel
        </Button>
        {isWorking && (
          <span className="text-xs text-muted-foreground">
            Keep this page open while upload finishes.
          </span>
        )}
      </div>
    </form>
  );
}

function FileHint({
  fileName,
  fallback,
}: {
  fileName: string;
  fallback: string;
}) {
  return (
    <p className="truncate text-xs text-muted-foreground">
      {fileName ? `Selected: ${fileName}` : fallback}
    </p>
  );
}

function UploadProgressPanel({ progress }: { progress: UploadProgress }) {
  if (progress.phase === "idle") return null;

  return (
    <div className="space-y-3 rounded-md border bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{getPhaseLabel(progress.phase)}</p>
          <p className="text-xs text-muted-foreground">
            Video {progress.video}%
            {progress.thumbnail > 0 ? ` · Thumbnail ${progress.thumbnail}%` : ""}
          </p>
        </div>
        <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium">
          {Math.max(progress.video, progress.thumbnail)}%
        </span>
      </div>

      <ProgressLine label="Video" value={progress.video} active />
      {progress.thumbnail > 0 && (
        <ProgressLine label="Thumbnail" value={progress.thumbnail} active />
      )}
    </div>
  );
}

function ProgressLine({
  label,
  value,
}: {
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function getPhaseLabel(phase: UploadPhase) {
  if (phase === "video") return "Uploading video";
  if (phase === "thumbnail") return "Uploading thumbnail";
  if (phase === "saving") return "Saving video details";
  if (phase === "done") return "Upload complete";
  if (phase === "error") return "Upload failed";
  return "Ready";
}

function getSubmitLabel({
  isEdit,
  progress,
  isPending,
}: {
  isEdit: boolean;
  progress: UploadProgress;
  isPending: boolean;
}) {
  if (progress.phase === "video") return `Uploading video ${progress.video}%`;
  if (progress.phase === "thumbnail") {
    return `Uploading thumbnail ${progress.thumbnail}%`;
  }
  if (progress.phase === "saving") return "Saving...";
  if (isPending) return isEdit ? "Updating..." : "Creating...";
  return isEdit ? "Update video" : "Create video";
}

async function uploadToCloudinary({
  videoFile,
  thumbnailFile,
  title,
  uploadConfig,
  onProgress,
}: {
  videoFile: File;
  thumbnailFile: File | null;
  title: string;
  uploadConfig: {
    cloudName: string;
    uploadPreset: string;
  };
  onProgress: (progress: Partial<UploadProgress>) => void;
}) {
  const video = await uploadCloudinaryFile({
    file: videoFile,
    resourceType: "video",
    folder: "mr-video/videos",
    title,
    uploadConfig,
    onProgress: (value) => onProgress({ phase: "video", video: value }),
  });

  let thumbnailUrl = video.secure_url.replace(
    "/video/upload/",
    "/video/upload/so_1,w_1280,h_720,c_fill/",
  );

  if (thumbnailFile) {
    const thumbnail = await uploadCloudinaryFile({
      file: thumbnailFile,
      resourceType: "image",
      folder: "mr-video/thumbnails",
      title,
      uploadConfig,
      onProgress: (value) =>
        onProgress({ phase: "thumbnail", thumbnail: value }),
    });
    thumbnailUrl = thumbnail.secure_url;
  }

  return {
    providerId: video.public_id,
    playbackUrl: video.secure_url,
    thumbnailUrl,
    duration: Math.round(video.duration ?? 0),
  };
}

async function uploadCloudinaryFile({
  file,
  resourceType,
  folder,
  title,
  uploadConfig,
  onProgress,
}: {
  file: File;
  resourceType: "image" | "video";
  folder: string;
  title: string;
  uploadConfig: {
    cloudName: string;
    uploadPreset: string;
  };
  onProgress: (value: number) => void;
}) {
  return new Promise<{
    public_id: string;
    secure_url: string;
    duration?: number;
  }>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", uploadConfig.uploadPreset);
    body.append("folder", folder);
    body.append("context", `caption=${title}`);

    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${uploadConfig.cloudName}/${resourceType}/upload`,
    );

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    request.onload = () => {
      let payload: {
        public_id?: string;
        secure_url?: string;
        duration?: number;
        error?: { message?: string };
      };

      try {
        payload = JSON.parse(request.responseText || "{}") as typeof payload;
      } catch {
        reject(new Error("Cloudinary upload returned an invalid response"));
        return;
      }

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(payload.error?.message ?? "Cloudinary upload failed"));
        return;
      }

      if (!payload.public_id || !payload.secure_url) {
        reject(new Error("Cloudinary upload response was incomplete"));
        return;
      }

      onProgress(100);
      resolve({
        public_id: payload.public_id,
        secure_url: payload.secure_url,
        duration: payload.duration,
      });
    };

    request.onerror = () => reject(new Error("Cloudinary upload failed"));
    request.onabort = () => reject(new Error("Cloudinary upload cancelled"));
    request.send(body);
  });
}
