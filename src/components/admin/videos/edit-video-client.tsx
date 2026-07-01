// components/admin/videos/edit-video-client.tsx
"use client";

import { VideoForm, type VideoFormState } from "./video-form";

type EditVideoClientProps = {
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  updateVideoAction: (
    prevState: VideoFormState,
    formData: FormData,
  ) => Promise<VideoFormState>;
  initialData: {
    id: string;
    title: string;
    slug: string;
    categoryId?: string | null;
    isPublished?: boolean;
    tags?: { tag: { id: string; name: string } }[];
  };
};

export function EditVideoClient({
  categories,
  tags,
  updateVideoAction,
  initialData,
}: EditVideoClientProps) {
  // Pass the action directly to VideoForm - don't wrap it with useActionState
  return (
    <VideoForm
      action={updateVideoAction}
      initialData={initialData}
      categories={categories}
      tags={tags}
      submitLabel="Update Video"
      redirectTo="/admin/videos"
    />
  );
}

