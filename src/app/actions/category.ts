"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/videos/slug";
import {
  revalidatePublicCaches,
  revalidateCategoryCache,
} from "@/lib/videos/public-videos";
import {
  getCachedData,
  invalidateCachePattern,
  CACHE_TTL,
  CACHE_PATTERNS,
} from "@/lib/cache/cache-utils";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(1).max(100).optional(),
});

const idSchema = z.string().uuid();
const idsSchema = z.array(idSchema).min(1).max(100);

// -------------------------
// PUBLIC READ FUNCTIONS WITH REDIS CACHE
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
  const cacheKey = `admin:categories:page:${page}:limit:${limit}:search:${search || "none"}`;

  return getCachedData(
    cacheKey,
    async () => {
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
    CACHE_TTL.MEDIUM, // 5 minutes for admin
  );
}

export async function getCategoryCount(search = "") {
  const cacheKey = `admin:categories:count:search:${search || "none"}`;

  return getCachedData(
    cacheKey,
    async () => {
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
    CACHE_TTL.MEDIUM,
  );
}

// Helper function to invalidate all category-related caches
async function invalidateAllCategoryCaches(slug?: string) {
  // Invalidate public caches
  if (slug) {
    await revalidateCategoryCache(slug);
  }
  await revalidatePublicCaches();

  // Invalidate admin caches
  await invalidateCachePattern(CACHE_PATTERNS.ADMIN.CATEGORIES);
  await invalidateCachePattern("admin:categories:*");

  // Revalidate Next.js paths
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/categories");
}

// -------------------------
// MUTATIONS
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

  if (currentCategory?.slug) {
    await invalidateAllCategoryCaches(currentCategory.slug);
  }
  await invalidateAllCategoryCaches(newSlug);

  return result;
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);

  const category = await prisma.category.findUnique({
    where: { id: parsedId },
    select: { slug: true },
  });

  const result = await prisma.category.delete({
    where: { id: parsedId },
  });

  if (category?.slug) {
    await invalidateAllCategoryCaches(category.slug);
  }

  return result;
}

export async function bulkDeleteCategories(ids: string[]) {
  await requireAdmin();
  const parsedIds = idsSchema.parse(ids);

  const categories = await prisma.category.findMany({
    where: { id: { in: parsedIds } },
    select: { slug: true },
  });

  const result = await prisma.category.deleteMany({
    where: {
      id: { in: parsedIds },
    },
  });

  for (const category of categories) {
    if (category.slug) {
      await invalidateAllCategoryCaches(category.slug);
    }
  }

  await revalidatePublicCaches();

  return result;
}
