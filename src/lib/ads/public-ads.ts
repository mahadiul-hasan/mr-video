import "server-only";

import prisma from "@/lib/prisma";
import type {
  MonetizationAd,
  MonetizationSettings,
} from "@/lib/ads/engine/types";

const DEFAULT_AD_SETTINGS: MonetizationSettings = {
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
  weightSmartlink: 100,
  weightPopunder: 120,
  weightInterstitial: 90,
  weightSocialBar: 70,
  weightBanner: 40,
  weightNative: 50,
};

export async function getPublicAdsConfig(): Promise<{
  ads: MonetizationAd[];
  settings: MonetizationSettings;
}> {
  try {
    const [ads, settings] = await Promise.all([
      prisma.adUnit.findMany({
        where: { isActive: true },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      prisma.adSetting.findFirst(),
    ]);

    return {
      ads: ads.map((ad) => ({ ...ad, type: ad.type })),
      settings: settings ? mapSettings(settings) : DEFAULT_AD_SETTINGS,
    };
  } catch {
    return {
      ads: [],
      settings: DEFAULT_AD_SETTINGS,
    };
  }
}

function mapSettings(settings: {
  popunderEnabled: boolean;
  smartlinkEnabled: boolean;
  interstitialEnabled: boolean;
  socialBarEnabled: boolean;
  bannerEnabled: boolean;
  nativeEnabled: boolean;
  smartlinkMinPerMinute: number;
  smartlinkMaxPerMinute: number;
  interstitialGapSeconds: number;
  interstitialEveryVideos: number;
  popunderCooldownHours: number;
  weightSmartlink: number;
  weightPopunder: number;
  weightInterstitial: number;
  weightSocialBar: number;
  weightBanner: number;
  weightNative: number;
}): MonetizationSettings {
  return settings;
}

export function findPlacementAd(
  ads: MonetizationAd[],
  type: MonetizationAd["type"],
  placement: string,
) {
  return (
    ads
      .filter((ad) => ad.type === type && ad.placement === placement)
      .toSorted((a, b) => {
        const priority = (b.priority ?? 0) - (a.priority ?? 0);
        if (priority !== 0) return priority;
        return String(a.id).localeCompare(String(b.id));
      })[0] ?? null
  );
}
