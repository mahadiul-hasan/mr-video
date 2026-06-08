// app/admin/videos/[id]/edit/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVideoByIdAdmin,
  getVideoFormOptions,
  updateVideo,
} from "@/app/actions/video";
import { EditVideoClient } from "@/components/admin/videos/edit-video-client";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Edit Video - Admin",
  description: "Edit video details",
};

async function updateVideoAction(
  id: string,
  prevState: any,
  formData: FormData,
) {
  "use server";

  try {
    const videoFile = formData
      .getAll("videoFile")
      .find((value) => value instanceof File && value.size > 0) as
      | File
      | undefined;
    const hasNewVideo = !!videoFile;

    const categoryId = formData.get("categoryId");
    const finalCategoryId =
      categoryId === "_none" || categoryId === null
        ? undefined
        : (categoryId as string);

    const result = await updateVideo(id, {
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      categoryId: finalCategoryId,
      isPublished: formData.get("isPublished") === "on",
      tagIds: formData.getAll("tagIds") as string[],
      ...(hasNewVideo ? { videoFile } : {}),
    });

    return result;
  } catch (error) {
    console.error("Update video error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update video",
    };
  }
}

export default async function EditVideoPage({ params }: Props) {
  const { id } = await params;
  const [video, { categories, tags }] = await Promise.all([
    getVideoByIdAdmin(id),
    getVideoFormOptions(),
  ]);

  if (!video) {
    notFound();
  }

  const boundUpdateAction = updateVideoAction.bind(null, id);

  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <div className="mb-6">
        <Link href="/admin/videos">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Videos
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Video: {video.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditVideoClient
            categories={categories}
            tags={tags}
            updateVideoAction={boundUpdateAction}
            initialData={{
              id: video.id,
              title: video.title,
              slug: video.slug,
              categoryId: video.categoryId,
              isPublished: video.isPublished,
              tags: video.tags,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
