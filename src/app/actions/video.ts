"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { deleteVideoAsset } from "@/lib/storage/video-storage";
import { slugify } from "@/lib/videos/slug";

const videoFieldsSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(220).optional(),
  description: z.string().trim().max(5000).optional(),
  categoryId: z.string().trim().optional(),
  isPublished: z.boolean(),
  tagIds: z.array(z.string().trim()).max(20),
});

const videoMetadataSchema = videoFieldsSchema.extend({
  categoryId: z.string().trim().nullable().optional(),
});

const videoAssetSchema = z.object({
  providerId: z.string().trim().min(1).max(500),
  playbackUrl: z.url(),
  thumbnailUrl: z.url(),
  duration: z.number().int().min(0).max(24 * 60 * 60),
});

type VideoMetadataInput = z.input<typeof videoMetadataSchema>;
type VideoAssetInput = z.input<typeof videoAssetSchema>;

function normalizeVideoMetadata(data: VideoMetadataInput) {
  const parsed = videoMetadataSchema.parse(data);
  const slug = slugify(parsed.slug || parsed.title);
  if (!slug) throw new Error("Invalid video slug");

  return {
    ...parsed,
    slug,
    description: parsed.description || null,
    categoryId: parsed.categoryId || null,
  };
}

const videoInclude = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
} as const;

const getCachedVideos = unstable_cache(
  async (page: number, limit: number, search: string) => {
    const skip = (page - 1) * limit;

    return prisma.video.findMany({
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { category: { name: { contains: search, mode: "insensitive" } } },
              { tags: { some: { tag: { name: { contains: search, mode: "insensitive" } } } } },
            ],
          }
        : undefined,
      include: videoInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  },
  ["videos-list"],
  { revalidate: 3600 },
);

const getCachedVideoCount = unstable_cache(
  async (search: string) => {
    return prisma.video.count({
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { category: { name: { contains: search, mode: "insensitive" } } },
              { tags: { some: { tag: { name: { contains: search, mode: "insensitive" } } } } },
            ],
          }
        : undefined,
    });
  },
  ["videos-count"],
  { revalidate: 3600 },
);

export async function getVideos({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return getCachedVideos(page, limit, search);
}

export async function getVideoCount(search = "") {
  return getCachedVideoCount(search);
}

export async function getVideoFormOptions() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { categories, tags };
}

export async function createVideoFromAsset(
  data: VideoMetadataInput,
  assetData: VideoAssetInput,
) {
  await requireAdmin();

  const fields = normalizeVideoMetadata(data);
  const asset = videoAssetSchema.parse(assetData);

  const result = await prisma.video.create({
    data: {
      title: fields.title,
      slug: fields.slug,
      description: fields.description,
      categoryId: fields.categoryId,
      isPublished: fields.isPublished,
      cloudinaryId: asset.providerId,
      hlsUrl: asset.playbackUrl,
      thumbnailUrl: asset.thumbnailUrl,
      duration: asset.duration,
      tags: {
        create: fields.tagIds.map((tagId) => ({
          tag: { connect: { id: tagId } },
        })),
      },
    },
  });

  revalidateVideoPaths(fields.slug);
  return result;
}

export async function updateVideoFromAsset(
  id: string,
  data: VideoMetadataInput,
  assetData?: VideoAssetInput | null,
) {
  await requireAdmin();

  const parsedId = z.string().uuid().parse(id);
  const fields = normalizeVideoMetadata(data);
  const asset = assetData ? videoAssetSchema.parse(assetData) : null;

  const current = await prisma.video.findUniqueOrThrow({
    where: { id: parsedId },
    select: { cloudinaryId: true, slug: true },
  });

  const result = await prisma.video.update({
    where: { id: parsedId },
    data: {
      title: fields.title,
      slug: fields.slug,
      description: fields.description,
      categoryId: fields.categoryId,
      isPublished: fields.isPublished,
      ...(asset
        ? {
            cloudinaryId: asset.providerId,
            hlsUrl: asset.playbackUrl,
            thumbnailUrl: asset.thumbnailUrl,
            duration: asset.duration,
          }
        : {}),
      tags: {
        deleteMany: {},
        create: fields.tagIds.map((tagId) => ({
          tag: { connect: { id: tagId } },
        })),
      },
    },
  });

  if (asset) await deleteVideoAsset(current.cloudinaryId);

  revalidateVideoPaths(fields.slug);
  revalidatePath(`/watch/${current.slug}`);
  return result;
}

export async function deleteVideo(id: string) {
  await requireAdmin();

  const video = await prisma.video.delete({
    where: { id },
  });

  await deleteVideoAsset(video.cloudinaryId);
  revalidateVideoPaths(video.slug);
  return video;
}

export async function bulkDeleteVideos(ids: string[]) {
  await requireAdmin();

  const parsedIds = z.array(z.string().min(1)).max(100).parse(ids);
  const videos = await prisma.video.findMany({
    where: { id: { in: parsedIds } },
    select: { id: true, cloudinaryId: true, slug: true },
  });

  await prisma.video.deleteMany({
    where: { id: { in: videos.map((video) => video.id) } },
  });

  await Promise.all(videos.map((video) => deleteVideoAsset(video.cloudinaryId)));

  revalidatePath("/admin/videos");
  revalidatePath("/");
  videos.forEach((video) => revalidatePath(`/watch/${video.slug}`));

  return { count: videos.length };
}

function revalidateVideoPaths(slug: string) {
  revalidatePath("/admin/videos");
  revalidatePath("/");
  revalidatePath(`/watch/${slug}`);
}
