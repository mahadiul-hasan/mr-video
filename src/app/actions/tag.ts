"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/videos/slug";
import {
  revalidatePublicCaches,
  revalidateTagCache,
} from "@/lib/videos/public-videos";
import {
  getCachedData,
  invalidateCachePattern,
  CACHE_TTL,
  CACHE_PATTERNS,
} from "@/lib/cache/cache-utils";

const tagSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(1).max(100).optional(),
});

const idSchema = z.string().uuid();
const idsSchema = z.array(idSchema).min(1).max(100);

// -------------------------
// PUBLIC READ FUNCTIONS WITH REDIS CACHE
// -------------------------
export async function getTags({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const cacheKey = `admin:tags:page:${page}:limit:${limit}:search:${search || "none"}`;

  return getCachedData(
    cacheKey,
    async () => {
      const skip = (page - 1) * limit;

      return prisma.tag.findMany({
        where: search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : undefined,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      });
    },
    CACHE_TTL.MEDIUM, // 5 minutes for admin
  );
}

export async function getTagCount(search = "") {
  const cacheKey = `admin:tags:count:search:${search || "none"}`;

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.tag.count({
        where: search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : undefined,
      });
    },
    CACHE_TTL.MEDIUM,
  );
}

// Helper function to invalidate all tag-related caches
async function invalidateAllTagCaches(slug?: string) {
  // Invalidate public tag caches
  if (slug) {
    await revalidateTagCache(slug);
  }

  // Invalidate public caches (videos, home, etc.)
  await revalidatePublicCaches();

  // Invalidate admin caches
  await invalidateCachePattern(CACHE_PATTERNS.ADMIN.TAGS);
  await invalidateCachePattern("admin:tags:*");

  // Revalidate Next.js paths
  revalidatePath("/admin/tags");
  revalidatePath("/");
  revalidatePath("/tags");
}

// Helper function to check which tags are in use (for UI feedback)
export async function getTagsWithVideoReferences(tagIds: string[]) {
  const tagsWithVideos = await prisma.videoTag.groupBy({
    by: ["tagId"],
    where: {
      tagId: { in: tagIds },
    },
    _count: {
      videoId: true,
    },
  });

  const referencedTagIds = new Set(tagsWithVideos.map((item) => item.tagId));

  // Get detailed info for referenced tags
  const referencedTags = await prisma.tag.findMany({
    where: {
      id: { in: Array.from(referencedTagIds) },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  // Attach video count
  const tagsWithCounts = referencedTags.map((tag) => ({
    ...tag,
    videoCount:
      tagsWithVideos.find((tv) => tv.tagId === tag.id)?._count.videoId || 0,
  }));

  return tagsWithCounts;
}

// -------------------------
// MUTATIONS
// -------------------------
export async function createTag(data: { name: string; slug: string }) {
  await requireAdmin();
  const parsed = tagSchema.parse(data);
  const slug = slugify(parsed.slug || parsed.name);

  const result = await prisma.tag.create({
    data: {
      name: parsed.name,
      slug: slug,
    },
  });

  // Invalidate all tag caches
  await invalidateAllTagCaches(slug);

  return result;
}

export async function updateTag(
  id: string,
  data: { name?: string; slug?: string },
) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const parsed = tagSchema.partial().parse(data);

  // Get current tag to know old slug
  const currentTag = await prisma.tag.findUnique({
    where: { id: parsedId },
    select: { slug: true },
  });

  const newSlug = slugify(parsed.slug || parsed.name || currentTag?.slug || "");

  const result = await prisma.tag.update({
    where: { id: parsedId },
    data: {
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.slug || parsed.name ? { slug: newSlug } : {}),
    },
  });

  // Invalidate old and new tag caches
  if (currentTag?.slug) {
    await invalidateAllTagCaches(currentTag.slug);
  }
  await invalidateAllTagCaches(newSlug);

  return result;
}

export async function bulkDeleteTags(ids: string[]) {
  await requireAdmin();
  const parsedIds = idsSchema.parse(ids);

  // Check which tags have video references (for user feedback)
  const tagsInUse = await getTagsWithVideoReferences(parsedIds);
  const deletableIds = parsedIds.filter(
    (id) => !tagsInUse.some((tag) => tag.id === id),
  );

  if (deletableIds.length === 0) {
    return {
      success: false,
      error: "TAGS_IN_USE",
      message: `Cannot delete ${parsedIds.length} tag(s) that are associated with videos. Please remove tags from videos first.`,
      nonDeletableTags: tagsInUse,
      deletedCount: 0,
    };
  }

  // Get slugs for deletable tags before deletion
  const deletableTags = await prisma.tag.findMany({
    where: { id: { in: deletableIds } },
    select: { slug: true, name: true },
  });

  // Delete tags - VideoTag entries will be automatically deleted due to cascade
  const result = await prisma.tag.deleteMany({
    where: {
      id: { in: deletableIds },
    },
  });

  // Invalidate caches for deleted tags
  for (const tag of deletableTags) {
    if (tag.slug) {
      await invalidateAllTagCaches(tag.slug);
    }
  }

  // Also do a full public cache reset to be safe
  await revalidatePublicCaches();

  return {
    success: true,
    deletedCount: result.count,
    deletedTags: deletableTags.map((t) => t.name),
    nonDeletableTags: tagsInUse,
  };
}

export async function deleteTag(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);

  // Check if tag has video references
  const tagsInUse = await getTagsWithVideoReferences([parsedId]);

  if (tagsInUse.length > 0) {
    return {
      success: false,
      error: "TAG_IN_USE",
      message: `Cannot delete tag "${tagsInUse[0].name}" because it is associated with ${tagsInUse[0].videoCount} video(s). Please remove the tag from all videos first.`,
    };
  }

  // Get tag info before deletion
  const tag = await prisma.tag.findUnique({
    where: { id: parsedId },
    select: { slug: true, name: true },
  });

  if (!tag) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Tag not found",
    };
  }

  // Delete tag - VideoTag entries will be automatically deleted
  await prisma.tag.delete({
    where: { id: parsedId },
  });

  // Invalidate tag caches
  await invalidateAllTagCaches(tag.slug);

  return {
    success: true,
    deletedTag: tag.name,
  };
}

// Additional helper for checking tag usage (for UI)
export async function checkTagUsage(tagId: string) {
  const usage = await prisma.videoTag.count({
    where: { tagId },
  });

  return {
    tagId,
    videoCount: usage,
    hasVideos: usage > 0,
  };
}
