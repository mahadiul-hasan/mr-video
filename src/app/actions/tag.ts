"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/videos/slug";
import {
  revalidatePublicCaches,
  revalidateTagCache,
} from "@/lib/videos/public-videos";
import { invalidateCachePattern } from "@/lib/cache/cache-utils";

const tagSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(1).max(100).optional(),
});

const idSchema = z.string().uuid();
const idsSchema = z.array(idSchema).min(1).max(100);

// ---------------- CACHE LIST ----------------
const getCachedTags = unstable_cache(
  async (page: number, limit: number, search: string) => {
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
  ["tags-list"],
  { revalidate: 3600 },
);

// ---------------- CACHE COUNT ----------------
const getCachedTagCount = unstable_cache(
  async (search: string) => {
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
  ["tags-count"],
  { revalidate: 3600 },
);

// Helper function to invalidate all tag-related caches
async function invalidateAllTagCaches(slug?: string) {
  // Invalidate public tag caches
  if (slug) {
    await revalidateTagCache(slug);
  }

  // Invalidate public caches (videos, home, etc.)
  await revalidatePublicCaches();

  // Invalidate admin caches
  await invalidateCachePattern("tags-list");
  await invalidateCachePattern("tags-count");

  // Revalidate Next.js paths
  revalidatePath("/admin/tags");
  revalidatePath("/");
  revalidatePath("/tags");
}

// ---------------- READ ----------------
export async function getTags({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return getCachedTags(page, limit, search);
}

export async function getTagCount(search = "") {
  return getCachedTagCount(search);
}

// ---------------- WRITE ----------------
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

export async function deleteTag(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);

  // Get tag slug before deletion
  const tag = await prisma.tag.findUnique({
    where: { id: parsedId },
    select: { slug: true },
  });

  const result = await prisma.tag.delete({
    where: { id: parsedId },
  });

  // Invalidate tag caches
  if (tag?.slug) {
    await invalidateAllTagCaches(tag.slug);
  }

  return result;
}

export async function bulkDeleteTags(ids: string[]) {
  await requireAdmin();
  const parsedIds = idsSchema.parse(ids);

  // Get all tag slugs before deletion
  const tags = await prisma.tag.findMany({
    where: { id: { in: parsedIds } },
    select: { slug: true },
  });

  const result = await prisma.tag.deleteMany({
    where: {
      id: { in: parsedIds },
    },
  });

  // Invalidate all tag caches
  for (const tag of tags) {
    if (tag.slug) {
      await invalidateAllTagCaches(tag.slug);
    }
  }

  // Also do a full public cache reset to be safe
  await revalidatePublicCaches();

  return result;
}
