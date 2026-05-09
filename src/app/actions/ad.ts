"use server";

import { AdType } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invalidateCachePattern } from "@/lib/cache/cache-utils";
import { revalidatePublicCaches } from "@/lib/videos/public-videos";

//
// ---------------- AD UNITS ----------------
//

export async function getAds() {
  return prisma.adUnit.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
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
  "INTERSTITIAL",
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
  interstitialEnabled: z.boolean().optional(),
  socialBarEnabled: z.boolean().optional(),
  bannerEnabled: z.boolean().optional(),
  nativeEnabled: z.boolean().optional(),
  smartlinkMinPerMinute: z.number().int().min(0).max(10).optional(),
  smartlinkMaxPerMinute: z.number().int().min(1).max(10).optional(),
  interstitialGapSeconds: z.number().int().min(10).max(3600).optional(),
  interstitialEveryVideos: z.number().int().min(1).max(20).optional(),
  popunderCooldownHours: z.number().int().min(1).max(168).optional(),
});

const idSchema = z.string().uuid();

const DEFAULT_SETTINGS = {
  popunderEnabled: true,
  smartlinkEnabled: true,
  interstitialEnabled: true,
  socialBarEnabled: true,
  bannerEnabled: true,
  nativeEnabled: true,
  smartlinkMinPerMinute: 2,
  smartlinkMaxPerMinute: 3,
  interstitialGapSeconds: 60,
  interstitialEveryVideos: 3,
  popunderCooldownHours: 24,
};

// Helper function to invalidate all ad-related caches
async function invalidateAllAdCaches() {
  await invalidateCachePattern("public:ads:*");
  await invalidateCachePattern("public:ad-settings:*");
  await revalidatePublicCaches();
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
      priority: parsed.priority,
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
  const { getCachedData } = await import("@/lib/cache/cache-utils");

  return getCachedData(
    "public:ad-settings",
    async () => {
      let settings = await prisma.adSetting.findFirst();
      if (!settings) {
        settings = await prisma.adSetting.create({
          data: DEFAULT_SETTINGS,
        });
      }
      return settings;
    },
    300,
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
  const { getCachedData } = await import("@/lib/cache/cache-utils");
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
    300,
  );
}
