import { Metadata } from "next";
import {
  getVideoCount,
  getVideoFormOptions,
  getVideos,
} from "@/app/actions/video";
import VideoTable from "@/components/admin/videos/video-table";

export const metadata: Metadata = {
  title: "MR Video | Video Management",
  description: "Manage uploaded videos",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = params.search ?? "";
  const limit = 10;

  const [videos, total, options] = await Promise.all([
    getVideos({ page, limit, search }),
    getVideoCount(search),
    getVideoFormOptions(),
  ]);

  return (
    <VideoTable
      data={videos}
      total={total}
      page={page}
      search={search}
      categories={options.categories}
      tags={options.tags}
      uploadConfig={{
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET ?? "",
      }}
    />
  );
}
