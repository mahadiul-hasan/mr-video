"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/videos/slug";
import {
  revalidatePublicCaches,
  revalidateCategoryCache,
} from "@/lib/videos/public-videos";
import { invalidateCachePattern } from "@/lib/cache/cache-utils";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(1).max(100).optional(),
});

const idSchema = z.string().uuid();
const idsSchema = z.array(idSchema).min(1).max(100);

// -------------------------
// CACHE KEY: CATEGORY LIST
// -------------------------
const getCachedCategories = unstable_cache(
  async (page: number, limit: number, search: string) => {
    const skip = (page - 1) * limit;

    return prisma.category.findMany({
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
  ["categories-list"],
  {
    revalidate: 3600, // 1 hour
  },
);

// -------------------------
// CACHE KEY: COUNT
// -------------------------
const getCachedCategoryCount = unstable_cache(
  async (search: string) => {
    return prisma.category.count({
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
  ["categories-count"],
  {
    revalidate: 3600,
  },
);

// Helper function to invalidate all category-related caches
async function invalidateAllCategoryCaches(slug?: string) {
  // Invalidate public category caches
  if (slug) {
    await revalidateCategoryCache(slug);
  }

  // Invalidate public caches (videos, home, etc.)
  await revalidatePublicCaches();

  // Invalidate admin caches
  await invalidateCachePattern("categories-list");
  await invalidateCachePattern("categories-count");

  // Revalidate Next.js paths
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/categories");
}

// -------------------------
// PUBLIC READ FUNCTIONS
// -------------------------
export async function getCategories({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return getCachedCategories(page, limit, search);
}

export async function getCategoryCount(search = "") {
  return getCachedCategoryCount(search);
}

// -------------------------
// MUTATIONS (INVALIDATE CACHE)
// -------------------------
export async function createCategory(data: { name: string; slug: string }) {
  await requireAdmin();
  const parsed = categorySchema.parse(data);
  const slug = slugify(parsed.slug || parsed.name);

  const result = await prisma.category.create({
    data: {
      name: parsed.name,
      slug: slug,
    },
  });

  // Invalidate all category caches
  await invalidateAllCategoryCaches(slug);

  return result;
}

export async function updateCategory(
  id: string,
  data: { name?: string; slug?: string },
) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const parsed = categorySchema.partial().parse(data);

  // Get current category to know old slug
  const currentCategory = await prisma.category.findUnique({
    where: { id: parsedId },
    select: { slug: true },
  });

  const newSlug = slugify(
    parsed.slug || parsed.name || currentCategory?.slug || "",
  );

  const result = await prisma.category.update({
    where: { id: parsedId },
    data: {
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.slug || parsed.name ? { slug: newSlug } : {}),
    },
  });

  // Invalidate old and new category caches
  if (currentCategory?.slug) {
    await invalidateAllCategoryCaches(currentCategory.slug);
  }
  await invalidateAllCategoryCaches(newSlug);

  return result;
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);

  // Get category slug before deletion
  const category = await prisma.category.findUnique({
    where: { id: parsedId },
    select: { slug: true },
  });

  const result = await prisma.category.delete({
    where: { id: parsedId },
  });

  // Invalidate category caches
  if (category?.slug) {
    await invalidateAllCategoryCaches(category.slug);
  }

  return result;
}

export async function bulkDeleteCategories(ids: string[]) {
  await requireAdmin();
  const parsedIds = idsSchema.parse(ids);

  // Get all category slugs before deletion
  const categories = await prisma.category.findMany({
    where: { id: { in: parsedIds } },
    select: { slug: true },
  });

  const result = await prisma.category.deleteMany({
    where: {
      id: { in: parsedIds },
    },
  });

  // Invalidate all category caches
  for (const category of categories) {
    if (category.slug) {
      await invalidateAllCategoryCaches(category.slug);
    }
  }

  // Also do a full public cache reset to be safe
  await revalidatePublicCaches();

  return result;
}
