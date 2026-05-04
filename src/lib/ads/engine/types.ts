import type { AdType } from "@/lib/ads/ad-types";

export type MonetizationEvent =
  | "first-interaction"
  | "play"
  | "pause"
  | "seeking"
  | "volumechange"
  | "fullscreen"
  | "timeupdate"
  | "next-video";

export type MonetizationAd = {
  id: string;
  type: AdType;
  name: string;
  script: string;
  placement?: string | null;
  isActive: boolean;
  priority?: number;
  weight?: number;
  createdAt?: string | Date;
  cooldownSeconds?: number | null;
  frequencyCap?: number | null;
};

export type MonetizationSettings = {
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
};

export type MonetizationResult = {
  type: AdType;
  adId: string;
  name: string;
  reason: MonetizationEvent | "smartlink-enforcement" | "watch-time";
  firedAt: number;
};
