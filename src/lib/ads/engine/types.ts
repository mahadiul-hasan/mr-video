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

export type MonetizationReason =
  | MonetizationEvent
  | "smartlink-enforcement"
  | "watch-time"
  | "banner-display"
  | "native-display"
  | "social-display";

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

export type MonetizationResult = {
  type: AdType;
  adId: string;
  name: string;
  reason: MonetizationReason;
  firedAt: number;
  // Add script to result for easy access
  script?: string;
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
};
