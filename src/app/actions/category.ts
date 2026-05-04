"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/videos/slug";

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
  const result = await prisma.category.create({
    data: {
      name: parsed.name,
      slug: slugify(parsed.slug || parsed.name),
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");

  return result;
}

export async function updateCategory(
  id: string,
  data: { name?: string; slug?: string },
) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const parsed = categorySchema.partial().parse(data);
  const result = await prisma.category.update({
    where: { id: parsedId },
    data: {
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.slug || parsed.name
        ? { slug: slugify(parsed.slug || parsed.name || "") }
        : {}),
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");

  return result;
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const result = await prisma.category.delete({
    where: { id: parsedId },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");

  return result;
}

export async function bulkDeleteCategories(ids: string[]) {
  await requireAdmin();
  const parsedIds = idsSchema.parse(ids);
  const result = await prisma.category.deleteMany({
    where: {
      id: { in: parsedIds },
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");

  return result;
}
