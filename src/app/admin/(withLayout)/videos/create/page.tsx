// app/admin/videos/create/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createVideo, getVideoFormOptions } from "@/app/actions/video";
import { CreateVideoClient } from "@/components/admin/videos/create-video-client";
import type { VideoFormState } from "@/components/admin/videos/video-form";

export const metadata = {
  title: "Create Video - Admin",
  description: "Upload a new video",
};

async function createVideoAction(
  _prevState: VideoFormState,
  formData: FormData,
): Promise<VideoFormState> {
  "use server";

  try {
    const videoFile = formData
      .getAll("videoFile")
      .find((value) => value instanceof File && value.size > 0) as
      | File
      | undefined;

    if (!videoFile) {
      return { success: false, error: "Video file is required", data: null };
    }

    const categoryId = formData.get("categoryId");
    const finalCategoryId =
      categoryId === "_none" || categoryId === null
        ? undefined
        : (categoryId as string);

    const result = await createVideo({
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      categoryId: finalCategoryId,
      isPublished: formData.get("isPublished") === "on",
      tagIds: formData.getAll("tagIds") as string[],
      videoFile,
    });

    if (!result?.success) {
      return {
        success: false,
        error: result?.error || "Video creation failed",
        data: result?.data ?? null,
      };
    }

    return {
      success: result.success,
      error: result.error ?? null,
      data: result.data ?? null,
    };
  } catch (error) {
    console.error("Create video error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create video",
      data: null,
    };
  }
}

export default async function CreateVideoPage() {
  const { categories, tags } = await getVideoFormOptions();

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
          <CardTitle>Upload New Video</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateVideoClient
            categories={categories}
            tags={tags}
            createVideoAction={createVideoAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}

