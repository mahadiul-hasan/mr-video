import "server-only";
import prisma from "@/lib/prisma";
import {
  getCachedData,
  invalidateCachePattern,
  CACHE_TTL,
  CACHE_PATTERNS,
} from "@/lib/cache/cache-utils";
import { rateLimit } from "@/lib/rate-limit";

export type PublicVideo = {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration: string;
  durationSeconds: number;
  views: string;
  category: string;
  poster: string;
  hlsUrl: string;
  mp4Url: string;
  createdAt: Date;
};

const publicVideoSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  duration: true,
  views: true,
  thumbnailUrl: true,
  hlsUrl: true,
  createdAt: true,
  category: {
    select: {
      name: true,
    },
  },
} as const;

// ============================
// PUBLIC VIDEO FUNCTIONS WITH REDIS CACHE
// ============================

export async function getPublicVideos({
  page = 1,
  limit = 24,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const cacheKey = `public:videos:page:${page}:limit:${limit}`;

  return getCachedData(
    cacheKey,
    async () => {
      const videos = await prisma.video.findMany({
        where: { isPublished: true },
        select: publicVideoSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return videos.map(mapPublicVideo);
    },
    CACHE_TTL.LONG,
  );
}

export async function searchPublicVideos({
  query,
  page = 1,
  limit = 24,
}: {
  query: string;
  page?: number;
  limit?: number;
}) {
  const search = query.trim();

  if (search) {
    await rateLimit(`search:${search.substring(0, 50)}`, "SEARCH");
  }

  if (!search) return [];

  const cacheKey = `public:search:${search}:page:${page}:limit:${limit}`;

  return getCachedData(
    cacheKey,
    async () => {
      const videos = await prisma.video.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { category: { name: { contains: search, mode: "insensitive" } } },
            {
              tags: {
                some: {
                  tag: { name: { contains: search, mode: "insensitive" } },
                },
              },
            },
          ],
        },
        select: publicVideoSelect,
        orderBy: [{ views: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      });
      return videos.map(mapPublicVideo);
    },
    CACHE_TTL.SHORT, // Short TTL for search results
  );
}

export async function getPublicVideosByCategory({
  slug,
  page = 1,
  limit = 24,
}: {
  slug: string;
  page?: number;
  limit?: number;
}) {
  const cacheKey = `public:category:${slug}:page:${page}:limit:${limit}`;

  return getCachedData(
    cacheKey,
    async () => {
      const category = await prisma.category.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });

      if (!category) return null;

      const videos = await prisma.video.findMany({
        where: { isPublished: true, categoryId: category.id },
        select: publicVideoSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { category, videos: videos.map(mapPublicVideo) };
    },
    CACHE_TTL.LONG,
  );
}

export async function getPublicVideosByTag({
  slug,
  page = 1,
  limit = 24,
}: {
  slug: string;
  page?: number;
  limit?: number;
}) {
  const cacheKey = `public:tag:${slug}:page:${page}:limit:${limit}`;

  return getCachedData(
    cacheKey,
    async () => {
      const tag = await prisma.tag.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });

      if (!tag) return null;

      const videos = await prisma.video.findMany({
        where: {
          isPublished: true,
          tags: { some: { tagId: tag.id } },
        },
        select: publicVideoSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { tag, videos: videos.map(mapPublicVideo) };
    },
    CACHE_TTL.LONG,
  );
}

export async function getPublicCategories({ limit }: { limit?: number } = {}) {
  const cacheKey = `public:categories:limit:${limit || "all"}`;

  return getCachedData(
    cacheKey,
    async () => {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              videos: {
                where: { isPublished: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
        ...(limit ? { take: limit } : {}),
      });

      return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        _count: {
          videos: category._count.videos,
        },
      }));
    },
    CACHE_TTL.VERY_LONG,
  );
}

export async function getPublicTags({ limit }: { limit?: number } = {}) {
  const cacheKey = `public:tags:limit:${limit || "all"}`;

  return getCachedData(
    cacheKey,
    async () => {
      const tags = await prisma.tag.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              videos: {
                where: {
                  video: {
                    isPublished: true,
                  },
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
        ...(limit ? { take: limit } : {}),
      });

      return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        _count: {
          videos: tag._count.videos,
        },
      }));
    },
    CACHE_TTL.VERY_LONG,
  );
}

// For header navigation - simple version without counts (better performance)
export async function getPublicCategoriesForHeader({
  limit,
}: { limit?: number } = {}) {
  const cacheKey = `public:categories:header:limit:${limit || "all"}`;

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: "asc" },
        ...(limit ? { take: limit } : {}),
      });
    },
    CACHE_TTL.VERY_LONG,
  );
}

export async function getPublicTagsForHeader({
  limit,
}: { limit?: number } = {}) {
  const cacheKey = `public:tags:header:limit:${limit || "all"}`;

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.tag.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: "asc" },
        ...(limit ? { take: limit } : {}),
      });
    },
    CACHE_TTL.VERY_LONG,
  );
}

export async function getPublicVideoBySlug(slug: string) {
  const cacheKey = `public:single-video:${slug}`;

  return getCachedData(
    cacheKey,
    async () => {
      const video = await prisma.video.findFirst({
        where: {
          slug,
          isPublished: true,
        },
        select: publicVideoSelect,
      });
      return video ? mapPublicVideo(video) : null;
    },
    CACHE_TTL.LONG,
  );
}

export async function getRelatedPublicVideos({
  slug,
  category,
  limit = 8,
}: {
  slug: string;
  category?: string;
  limit?: number;
}) {
  const cacheKey = `public:related:${slug}:category:${category || "none"}:limit:${limit}`;

  return getCachedData(
    cacheKey,
    async () => {
      const videos = await prisma.video.findMany({
        where: {
          isPublished: true,
          slug: { not: slug },
          ...(category && category !== "Uncategorized"
            ? { category: { name: category } }
            : {}),
        },
        select: publicVideoSelect,
        orderBy: [{ views: "desc" }, { createdAt: "desc" }],
        take: limit,
      });
      return videos.map(mapPublicVideo);
    },
    CACHE_TTL.MEDIUM,
  );
}

// ============================
// CACHE INVALIDATION HELPERS
// ============================

export async function revalidatePublicCaches() {
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.ALL_VIDEOS);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.HOME);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.CATEGORIES);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.TAGS);
}

export async function revalidateVideoCache(slug: string) {
  await invalidateCachePattern(`public:single-video:${slug}`);
  await invalidateCachePattern(`public:related:${slug}:*`);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.ALL_VIDEOS);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.HOME);
}

export async function revalidateCategoryCache(slug: string) {
  await invalidateCachePattern(`public:category:${slug}:*`);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.CATEGORIES);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.ALL_VIDEOS);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.HOME);
}

export async function revalidateTagCache(slug: string) {
  await invalidateCachePattern(`public:tag:${slug}:*`);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.TAGS);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.ALL_VIDEOS);
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.HOME);
}

export async function revalidateSearchCache() {
  await invalidateCachePattern(CACHE_PATTERNS.PUBLIC.SEARCH);
}

// ============================
// VIEW COUNTER (NO CACHE)
// ============================

export async function incrementVideoViews(slug: string) {
  try {
    await prisma.video.update({
      where: { slug },
      data: { views: { increment: 1 } },
    });
    await revalidateVideoCache(slug);
  } catch {
    // Silently fail
  }
}

// ============================
// HELPER FUNCTIONS
// ============================

function mapPublicVideo(video: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration: number;
  views: number;
  thumbnailUrl: string;
  hlsUrl: string;
  createdAt: Date;
  category: { name: string } | null;
}): PublicVideo {
  return {
    id: video.id,
    slug: video.slug,
    title: video.title,
    description: video.description ?? "",
    duration: formatDuration(video.duration),
    durationSeconds: video.duration,
    views: formatViews(video.views),
    category: video.category?.name ?? "Uncategorized",
    poster: video.thumbnailUrl,
    hlsUrl: video.hlsUrl,
    mp4Url: video.hlsUrl,
    createdAt: video.createdAt,
  };
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatViews(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${Math.round(views / 100) / 10}K`;
  return String(views);
}
