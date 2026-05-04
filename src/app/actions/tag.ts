"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/videos/slug";

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
  const result = await prisma.tag.create({
    data: {
      name: parsed.name,
      slug: slugify(parsed.slug || parsed.name),
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/");

  return result;
}

export async function updateTag(
  id: string,
  data: { name?: string; slug?: string },
) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const parsed = tagSchema.partial().parse(data);
  const result = await prisma.tag.update({
    where: { id: parsedId },
    data: {
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.slug || parsed.name
        ? { slug: slugify(parsed.slug || parsed.name || "") }
        : {}),
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/");

  return result;
}

export async function deleteTag(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const result = await prisma.tag.delete({
    where: { id: parsedId },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/");

  return result;
}

export async function bulkDeleteTags(ids: string[]) {
  await requireAdmin();
  const parsedIds = idsSchema.parse(ids);
  const result = await prisma.tag.deleteMany({
    where: {
      id: { in: parsedIds },
    },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/");

  return result;
}
