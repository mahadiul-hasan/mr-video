import "server-only";

import prisma from "@/lib/prisma";

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

export async function getPublicVideos({
  page = 1,
  limit = 24,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const videos = await prisma.video.findMany({
    where: { isPublished: true },
    select: publicVideoSelect,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return videos.map(mapPublicVideo);
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

  const videos = await prisma.video.findMany({
    where: {
      isPublished: true,
      ...(search
        ? {
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
          }
        : {}),
    },
    select: publicVideoSelect,
    orderBy: [{ views: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  return videos.map(mapPublicVideo);
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
}

export async function getPublicCategories({ limit }: { limit?: number } = {}) {
  return prisma.category.findMany({
    where: { videos: { some: { isPublished: true } } },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { videos: { where: { isPublished: true } } } },
    },
    orderBy: { name: "asc" },
    ...(limit ? { take: limit } : {}),
  });
}

export async function getPublicTags({ limit }: { limit?: number } = {}) {
  return prisma.tag.findMany({
    where: { videos: { some: { video: { isPublished: true } } } },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { videos: true } },
    },
    orderBy: { name: "asc" },
    ...(limit ? { take: limit } : {}),
  });
}

export async function getPublicVideoBySlug(slug: string) {
  const video = await prisma.video.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: publicVideoSelect,
  });

  return video ? mapPublicVideo(video) : null;
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
}

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
