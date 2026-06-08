"use server";

import { AdType } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getCachedData,
  invalidateCachePattern,
  CACHE_TTL,
} from "@/lib/cache/cache-utils";
import { revalidatePublicCaches } from "@/lib/videos/public-videos";

//
// ---------------- AD UNITS ----------------
//

export async function getAds() {
  const cacheKey = "admin:ads:list";

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.adUnit.findMany({
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
    },
    CACHE_TTL.MEDIUM, // 5 minutes for admin
  );
}

type CreateAdInput = {
  type: AdType;
  name: string;
  script: string;
  placement?: string | null;
  cooldownSeconds?: number | null;
  frequencyCap?: number | null;
  weight?: number | null;
};

const adTypeSchema = z.enum([
  "POPUNDER",
  "SOCIAL_BAR",
  "NATIVE_BANNER",
  "BANNER",
  "SMARTLINK",
]);

const createAdSchema = z.object({
  type: adTypeSchema,
  name: z.string().trim().min(2).max(120),
  script: z.string().trim().min(1).max(50000),
  placement: z.string().trim().max(100).nullable().optional(),
  cooldownSeconds: z.number().int().min(0).max(86400).nullable().optional(),
  frequencyCap: z.number().int().min(1).max(1000).nullable().optional(),
  weight: z.number().int().min(1).max(1000).nullable().optional(),
});

const updateAdSchema = createAdSchema.partial().extend({
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
});

const settingsSchema = z.object({
  popunderEnabled: z.boolean().optional(),
  smartlinkEnabled: z.boolean().optional(),
  socialBarEnabled: z.boolean().optional(),
  bannerEnabled: z.boolean().optional(),
  nativeEnabled: z.boolean().optional(),
  smartlinkMinPerMinute: z.number().int().min(0).max(10).optional(),
  smartlinkMaxPerMinute: z.number().int().min(1).max(10).optional(),
  popunderCooldownHours: z.number().int().min(1).max(168).optional(),
  weightSmartlink: z.number().int().min(0).max(1000).optional(),
  weightPopunder: z.number().int().min(0).max(1000).optional(),
  weightSocialBar: z.number().int().min(0).max(1000).optional(),
  weightBanner: z.number().int().min(0).max(1000).optional(),
  weightNative: z.number().int().min(0).max(1000).optional(),
});

const idSchema = z.string().uuid();

const DEFAULT_SETTINGS = {
  popunderEnabled: true,
  smartlinkEnabled: true,
  socialBarEnabled: true,
  bannerEnabled: true,
  nativeEnabled: true,
  smartlinkMinPerMinute: 2,
  smartlinkMaxPerMinute: 3,
  popunderCooldownHours: 24,
  weightSmartlink: 100,
  weightPopunder: 120,
  weightSocialBar: 70,
  weightBanner: 40,
  weightNative: 50,
};

// Helper function to invalidate all ad-related caches
async function invalidateAllAdCaches() {
  // Invalidate public ad caches
  await invalidateCachePattern("public:ads:*");
  await invalidateCachePattern("public:ad-settings:*");

  // Invalidate admin ad caches
  await invalidateCachePattern("admin:ads:*");

  // Invalidate public caches
  await revalidatePublicCaches();

  // Revalidate Next.js paths
  revalidatePath("/admin/ads");
  revalidatePath("/admin/ads/settings");
  revalidatePath("/");
}

export async function createAd(data: CreateAdInput) {
  await requireAdmin();
  const parsed = createAdSchema.parse(data);

  const res = await prisma.adUnit.create({
    data: {
      type: parsed.type as AdType,
      name: parsed.name,
      script: parsed.script,
      placement: parsed.placement ?? null,
      cooldownSeconds: parsed.cooldownSeconds ?? null,
      frequencyCap: parsed.frequencyCap ?? null,
      weight: parsed.weight ?? 1,
    },
  });

  await invalidateAllAdCaches();
  return res;
}

type UpdateAdInput = Partial<CreateAdInput> & {
  isActive?: boolean;
  priority?: number;
};

export async function updateAd(id: string, data: UpdateAdInput) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const parsed = updateAdSchema.parse(data);

  const res = await prisma.adUnit.update({
    where: { id: parsedId },
    data: {
      type: parsed.type as AdType | undefined,
      name: parsed.name,
      script: parsed.script,
      placement:
        parsed.placement === null ? null : (parsed.placement ?? undefined),
      cooldownSeconds:
        parsed.cooldownSeconds === null
          ? null
          : (parsed.cooldownSeconds ?? undefined),
      frequencyCap:
        parsed.frequencyCap === null
          ? null
          : (parsed.frequencyCap ?? undefined),
      weight: parsed.weight === null ? 1 : (parsed.weight ?? undefined),
      isActive: parsed.isActive,
      // Fix: Only update priority if it's provided (not undefined)
      ...(parsed.priority !== undefined ? { priority: parsed.priority } : {}),
    },
  });

  await invalidateAllAdCaches();
  return res;
}

export async function deleteAd(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);

  const res = await prisma.adUnit.delete({
    where: { id: parsedId },
  });

  await invalidateAllAdCaches();
  return res;
}

//
// ---------------- AD SETTINGS ----------------
//

export async function getAdSettings() {
  const cacheKey = "public:ad-settings";

  return getCachedData(
    cacheKey,
    async () => {
      let settings = await prisma.adSetting.findFirst();
      if (!settings) {
        settings = await prisma.adSetting.create({
          data: DEFAULT_SETTINGS,
        });
      }
      return settings;
    },
    CACHE_TTL.VERY_LONG, // 24 hours for settings
  );
}

export async function updateAdSettings(data: Partial<typeof DEFAULT_SETTINGS>) {
  await requireAdmin();
  const parsed = settingsSchema.parse(data);

  if (
    parsed.smartlinkMinPerMinute !== undefined &&
    parsed.smartlinkMaxPerMinute !== undefined &&
    parsed.smartlinkMinPerMinute > parsed.smartlinkMaxPerMinute
  ) {
    throw new Error("SmartLink min cannot exceed max");
  }

  const settings = await prisma.adSetting.findFirst();

  if (!settings) {
    await prisma.adSetting.create({
      data: {
        ...DEFAULT_SETTINGS,
        ...parsed,
      },
    });
  } else {
    await prisma.adSetting.update({
      where: { id: settings.id },
      data: parsed,
    });
  }

  await invalidateAllAdCaches();
  revalidatePath("/admin/ads/settings");
  revalidatePath("/");
}

export async function getActiveAdsByPlacement(
  placement: string,
  type?: AdType,
) {
  const cacheKey = `public:ads:placement:${placement}:type:${type || "all"}`;

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.adUnit.findMany({
        where: {
          isActive: true,
          placement: placement,
          ...(type ? { type } : {}),
        },
        orderBy: [{ priority: "desc" }, { weight: "desc" }],
      });
    },
    CACHE_TTL.MEDIUM, // 5 minutes for ads
  );
}

// Additional helper function to get ad by ID
export async function getAdById(id: string) {
  await requireAdmin();
  const parsedId = idSchema.parse(id);
  const cacheKey = `admin:ads:${parsedId}`;

  return getCachedData(
    cacheKey,
    async () => {
      return prisma.adUnit.findUnique({
        where: { id: parsedId },
      });
    },
    CACHE_TTL.MEDIUM,
  );
}

// Additional helper to get ad statistics
export async function getAdStats() {
  await requireAdmin();
  const cacheKey = "admin:ads:stats";

  return getCachedData(
    cacheKey,
    async () => {
      const [total, active, byType] = await Promise.all([
        prisma.adUnit.count(),
        prisma.adUnit.count({ where: { isActive: true } }),
        prisma.adUnit.groupBy({
          by: ["type"],
          _count: true,
          where: { isActive: true },
        }),
      ]);

      return {
        total,
        active,
        inactive: total - active,
        byType: byType.reduce(
          (acc, curr) => {
            acc[curr.type] = curr._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    },
    CACHE_TTL.SHORT, // 1 minute for stats
  );
}

// Helper to get all unique placements
export async function getAdPlacements() {
  const cacheKey = "public:ads:placements";

  return getCachedData(
    cacheKey,
    async () => {
      const placements = await prisma.adUnit.findMany({
        where: { isActive: true },
        select: { placement: true },
        distinct: ["placement"],
      });
      return placements.map((p) => p.placement).filter(Boolean);
    },
    CACHE_TTL.LONG,
  );
}
