"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { deleteVideoAsset } from "@/lib/storage/video-storage";
import { slugify } from "@/lib/videos/slug";
import {
  revalidatePublicCaches,
  revalidateVideoCache,
  revalidateCategoryCache,
  revalidateTagCache,
  revalidateSearchCache,
} from "@/lib/videos/public-videos";
import {
  getCachedData,
  invalidateCachePattern,
  CACHE_TTL,
  CACHE_PATTERNS,
} from "@/lib/cache/cache-utils";

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
  duration: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60),
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

// -------------------------
// PUBLIC READ FUNCTIONS WITH REDIS CACHE
// -------------------------
export async function getVideos({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const cacheKey = `admin:videos:page:${page}:limit:${limit}:search:${search || "none"}`;

  return getCachedData(
    cacheKey,
    async () => {
      const skip = (page - 1) * limit;

      return prisma.video.findMany({
        where: search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
                {
                  category: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  tags: {
                    some: {
                      tag: { name: { contains: search, mode: "insensitive" } },
                    },
                  },
                },
              ],
            }
          : undefined,
        include: videoInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });
    },
    CACHE_TTL.MEDIUM, // 5 minutes for admin
  );
}

export async function getVideoCount(search = "") {
  const cacheKey = `admin:videos:count:search:${search || "none"}`;

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.video.count({
        where: search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
                {
                  category: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  tags: {
                    some: {
                      tag: { name: { contains: search, mode: "insensitive" } },
                    },
                  },
                },
              ],
            }
          : undefined,
      });
    },
    CACHE_TTL.MEDIUM,
  );
}

export async function getVideoFormOptions() {
  const cacheKey = "admin:videos:form-options";

  return getCachedData(
    cacheKey,
    async () => {
      const [categories, tags] = await Promise.all([
        prisma.category.findMany({ orderBy: { name: "asc" } }),
        prisma.tag.findMany({ orderBy: { name: "asc" } }),
      ]);

      return { categories, tags };
    },
    CACHE_TTL.VERY_LONG, // 24 hours for form options (rarely change)
  );
}

// Enhanced function to invalidate all video-related caches
async function invalidateAllVideoCaches(
  slug?: string,
  categoryId?: string,
  tagIds?: string[],
) {
  // Invalidate public caches
  await revalidatePublicCaches();

  // Invalidate specific video cache
  if (slug) {
    await revalidateVideoCache(slug);
  }

  // Invalidate search cache
  await revalidateSearchCache();

  // Invalidate admin caches
  await invalidateCachePattern(CACHE_PATTERNS.ADMIN.VIDEOS);
  await invalidateCachePattern("admin:videos:*");
  await invalidateCachePattern("admin:videos:form-options");

  // Revalidate Next.js paths
  revalidatePath("/admin/videos");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/watch/${slug}`);
  }
}

// -------------------------
// MUTATIONS
// -------------------------
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

  // Invalidate all caches
  await invalidateAllVideoCaches(
    fields.slug,
    fields.categoryId || undefined,
    fields.tagIds,
  );

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
    select: {
      cloudinaryId: true,
      slug: true,
      categoryId: true,
      tags: {
        include: { tag: true },
      },
    },
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

  // Invalidate all caches
  await invalidateAllVideoCaches(
    fields.slug,
    fields.categoryId || undefined,
    fields.tagIds,
  );

  // Also invalidate old slug cache if changed
  if (current.slug !== fields.slug) {
    await invalidateAllVideoCaches(current.slug);
  }

  return result;
}

export async function deleteVideo(id: string) {
  await requireAdmin();

  const video = await prisma.video.delete({
    where: { id },
    select: {
      id: true,
      slug: true,
      cloudinaryId: true,
      categoryId: true,
    },
  });

  await deleteVideoAsset(video.cloudinaryId);

  // Invalidate all caches
  await invalidateAllVideoCaches(video.slug, video.categoryId || undefined);

  return video;
}

export async function bulkDeleteVideos(ids: string[]) {
  await requireAdmin();

  const parsedIds = z.array(z.string().min(1)).max(100).parse(ids);
  const videos = await prisma.video.findMany({
    where: { id: { in: parsedIds } },
    select: {
      id: true,
      cloudinaryId: true,
      slug: true,
      categoryId: true,
    },
  });

  await prisma.video.deleteMany({
    where: { id: { in: videos.map((video) => video.id) } },
  });

  await Promise.all(
    videos.map((video) => deleteVideoAsset(video.cloudinaryId)),
  );

  // Invalidate all caches (full reset)
  await revalidatePublicCaches();
  await invalidateCachePattern(CACHE_PATTERNS.ADMIN.VIDEOS);
  await invalidateCachePattern("admin:videos:*");
  await invalidateCachePattern("admin:videos:form-options");

  revalidatePath("/admin/videos");
  revalidatePath("/");
  videos.forEach((video) => revalidatePath(`/watch/${video.slug}`));

  return { count: videos.length };
}

// Helper function to revalidate video paths (kept for backward compatibility)
function revalidateVideoPaths(slug: string) {
  revalidatePath("/admin/videos");
  revalidatePath("/");
  revalidatePath(`/watch/${slug}`);
}

// Additional helper for getting video stats
export async function getVideoStats() {
  const cacheKey = "admin:videos:stats";

  return getCachedData(
    cacheKey,
    async () => {
      const [total, published, unpublished, totalViews] = await Promise.all([
        prisma.video.count(),
        prisma.video.count({ where: { isPublished: true } }),
        prisma.video.count({ where: { isPublished: false } }),
        prisma.video.aggregate({
          _sum: {
            views: true,
          },
        }),
      ]);

      return {
        total,
        published,
        unpublished,
        totalViews: totalViews._sum.views || 0,
      };
    },
    CACHE_TTL.SHORT, // 1 minute for stats
  );
}

// Helper to get video by slug (for admin preview)
export async function getVideoBySlug(slug: string) {
  const cacheKey = `admin:video:slug:${slug}`;

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.video.findUnique({
        where: { slug },
        include: videoInclude,
      });
    },
    CACHE_TTL.SHORT,
  );
}
