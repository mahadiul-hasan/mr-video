// app/actions/admin/video.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/videos/slug";
import { uploadSourceVideoToR2 } from "@/lib/r2/upload";
import { revalidatePublicCaches } from "@/lib/videos/public-videos";
import { Prisma } from "@/generated/prisma/client";
import { enqueueVideoJob } from "@/lib/video-processing/queue";
import { R2_CDN_URL } from "@/lib/r2/client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2/client";

// Schema for video validation
const videoSchema = z.object({
  title: z.string().min(2).max(180),
  slug: z.string().max(220).optional(),
  categoryId: z.string().nullable().optional(),
  isPublished: z.boolean(),
  tagIds: z.array(z.string()).max(20),
});

const videoInclude = {
  category: true,
  tags: { include: { tag: true } },
};

async function ensureUniqueSlug(base: string, excludeId?: string) {
  const safeBase = base.trim();
  let candidate = safeBase;
  let counter = 2;

  for (;;) {
    const existing = await prisma.video.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;
    candidate = `${safeBase}-${counter++}`;
  }
}

function createVideoPaths(videoId: string) {
  const prefix = `videos/${videoId}`;
  return {
    r2Key: `${prefix}/master.m3u8`,
    hlsUrl: `${R2_CDN_URL}/${prefix}/master.m3u8`,
    thumbnailUrl: `${R2_CDN_URL}/${prefix}/thumbnail.jpg`,
  };
}

export async function getVideosAdmin({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  await requireAdmin();

  const skip = (page - 1) * limit;

  // Fix: Properly type the where clause
  let where: Prisma.VideoWhereInput = {};

  if (search) {
    where = {
      OR: [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { slug: { contains: search, mode: Prisma.QueryMode.insensitive } },
        {
          category: {
            name: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
        },
        {
          tags: {
            some: {
              tag: {
                name: { contains: search, mode: Prisma.QueryMode.insensitive },
              },
            },
          },
        },
      ],
    };
  }

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      include: videoInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.video.count({ where }),
  ]);

  return { videos, total };
}

export async function getVideoByIdAdmin(id: string) {
  await requireAdmin();
  return prisma.video.findUnique({
    where: { id },
    include: videoInclude,
  });
}

export async function getVideoFormOptions() {
  await requireAdmin();

  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { categories, tags };
}

export async function createVideo(data: {
  title: string;
  slug?: string;
  categoryId?: string;
  isPublished: boolean;
  tagIds: string[];
  videoFile: File;
}) {
  await requireAdmin();

  const validated = videoSchema.parse(data);
  const baseSlug = slugify(validated.slug || validated.title);
  const slug = await ensureUniqueSlug(baseSlug);
  const videoId = crypto.randomUUID();
  const basePaths = createVideoPaths(videoId);
  const sourceKey = `uploads/${videoId}/${Date.now()}-${slug}.mp4`;

  // Save to database
  const video = await prisma.video.create({
    data: {
      id: videoId,
      title: validated.title,
      slug,
      categoryId: validated.categoryId,
      isPublished: validated.isPublished,
      r2Key: basePaths.r2Key,
      hlsUrl: basePaths.hlsUrl,
      thumbnailUrl: basePaths.thumbnailUrl,
      duration: 0,
      status: "PROCESSING",
      tags: {
        create: validated.tagIds.map((tagId) => ({
          tag: { connect: { id: tagId } },
        })),
      },
    },
    include: videoInclude,
  });

  try {
    await uploadSourceVideoToR2(data.videoFile, sourceKey);
    await enqueueVideoJob({
      kind: "PROCESS_VIDEO",
      videoId,
      sourceKey,
    });
  } catch (error) {
    await r2Client
      .send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: sourceKey }))
      .catch(() => {});
    await prisma.video.delete({ where: { id: videoId } }).catch(() => {});
    return {
      success: false,
      error:
        error instanceof Error
          ? `Queue/upload failed: ${error.message}`
          : "Queue/upload failed",
    };
  }

  // Revalidate caches
  revalidatePath("/admin/videos");
  await revalidatePublicCaches();
  revalidatePath(`/watch/${slug}`);

  return {
    success: true,
    data: video,
    message: "Video accepted and queued for processing.",
  };
}

export async function updateVideo(
  id: string,
  data: {
    title?: string;
    slug?: string;
    categoryId?: string;
    isPublished?: boolean;
    tagIds?: string[];
    videoFile?: File | null;
  },
) {
  await requireAdmin();

  const existingVideo = await prisma.video.findUnique({
    where: { id },
    select: { r2Key: true, slug: true },
  });

  if (!existingVideo) {
    return { success: false, error: "Video not found" };
  }

  const validated = videoSchema.partial().parse(data);
  const slug = validated.slug
    ? await ensureUniqueSlug(slugify(validated.slug), id)
    : undefined;

  // Handle video replacement
  let processingUpdate:
    | {
        status: "PROCESSING";
        processingError: null;
      }
    | undefined;
  if (data.videoFile && data.videoFile.size > 0) {
    const sourceKey = `uploads/${id}/${Date.now()}-${(validated.title || existingVideo.slug).replace(/\s+/g, "-").toLowerCase()}.mp4`;
    const oldPrefix = existingVideo.r2Key.substring(
      0,
      existingVideo.r2Key.lastIndexOf("/"),
    );

    await uploadSourceVideoToR2(data.videoFile, sourceKey);
    await enqueueVideoJob({
      kind: "PROCESS_VIDEO",
      videoId: id,
      sourceKey,
      cleanupPrefix: oldPrefix,
    });
    processingUpdate = { status: "PROCESSING", processingError: null };
  }

  // Update database
  const video = await prisma.video.update({
    where: { id },
    data: {
      ...(validated.title && { title: validated.title }),
      ...(slug && { slug }),
      ...(validated.categoryId !== undefined && {
        categoryId: validated.categoryId,
      }),
      ...(validated.isPublished !== undefined && {
        isPublished: validated.isPublished,
      }),
      ...(processingUpdate ?? {}),
      ...(validated.tagIds && {
        tags: {
          deleteMany: {},
          create: validated.tagIds.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
      }),
    },
    include: videoInclude,
  });

  // Revalidate caches
  revalidatePath("/admin/videos");
  await revalidatePublicCaches();
  if (existingVideo.slug !== slug) {
    revalidatePath(`/watch/${existingVideo.slug}`);
  }
  revalidatePath(`/watch/${video.slug}`);

  return {
    success: true,
    data: video,
    message: processingUpdate
      ? "Video replacement queued for processing."
      : "Video updated.",
  };
}

export async function deleteVideo(id: string) {
  await requireAdmin();

  const video = await prisma.video.findUnique({
    where: { id },
    select: { r2Key: true, slug: true },
  });

  if (!video) {
    return { success: false, error: "Video not found" };
  }

  const prefix = video.r2Key.substring(0, video.r2Key.lastIndexOf("/"));
  await enqueueVideoJob({ kind: "DELETE_PREFIX", prefix });
  await prisma.video.delete({ where: { id } });

  // Revalidate caches
  revalidatePath("/admin/videos");
  await revalidatePublicCaches();
  revalidatePath(`/watch/${video.slug}`);

  return { success: true };
}

export async function bulkDeleteVideos(ids: string[]) {
  await requireAdmin();

  const videos = await prisma.video.findMany({
    where: { id: { in: ids } },
    select: { r2Key: true, slug: true },
  });

  await Promise.all(
    videos.map((video) =>
      enqueueVideoJob({
        kind: "DELETE_PREFIX",
        prefix: video.r2Key.substring(0, video.r2Key.lastIndexOf("/")),
      }),
    ),
  );
  await prisma.video.deleteMany({ where: { id: { in: ids } } });

  // Revalidate caches
  revalidatePath("/admin/videos");
  await revalidatePublicCaches();
  videos.forEach((video) => revalidatePath(`/watch/${video.slug}`));

  return { success: true, count: videos.length };
}
