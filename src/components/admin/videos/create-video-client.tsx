// components/admin/videos/create-video-client.tsx
"use client";

import { VideoForm, type VideoFormState } from "./video-form";

type CreateVideoClientProps = {
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  createVideoAction: (
    prevState: VideoFormState,
    formData: FormData,
  ) => Promise<VideoFormState>;
};

export function CreateVideoClient({
  categories,
  tags,
  createVideoAction,
}: CreateVideoClientProps) {
  // Pass the action directly to VideoForm - don't wrap it with useActionState
  return (
    <VideoForm
      action={createVideoAction}
      categories={categories}
      tags={tags}
      submitLabel="Create Video"
      redirectTo="/admin/videos"
    />
  );
}

