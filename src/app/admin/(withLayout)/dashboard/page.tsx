import prisma from "@/lib/prisma";

import StatsCards from "@/components/admin/dashboard/stats-cards";
import AdOverview from "@/components/admin/dashboard/ad-overview";
import EngineConfig from "@/components/admin/dashboard/engine-config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MR Video | Dashboard",
  description: "Ad Engine Control Panel",
};

export default async function Page() {
  const [
    totalVideos,
    publishedVideos,
    totalCategories,
    totalTags,
    ads,
    settings,
  ] = await Promise.all([
    prisma.video.count(),
    prisma.video.count({ where: { isPublished: true } }),
    prisma.category.count(),
    prisma.tag.count(),

    // ✅ ENGINE SAFE SELECT (NO script, NO createdAt)
    prisma.adUnit.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        placement: true,
        isActive: true,
        weight: true,
        cooldownSeconds: true,
        frequencyCap: true,
        priority: true,
      },
      orderBy: [{ isActive: "desc" }, { weight: "desc" }, { priority: "desc" }],
    }),

    prisma.adSetting.findFirst(),
  ]);

  const safeSettings = settings ?? {
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

  return (
    <div className="space-y-6 p-6">
      {/* 📊 CORE STATS */}
      <StatsCards
        totalVideos={totalVideos}
        publishedVideos={publishedVideos}
        totalCategories={totalCategories}
        totalTags={totalTags}
      />

      {/* 💰 ADS OVERVIEW (ENGINE VIEW ONLY) */}
      <AdOverview ads={ads} />

      {/* ⚙️ ENGINE SETTINGS */}
      <EngineConfig settings={safeSettings} />
    </div>
  );
}
