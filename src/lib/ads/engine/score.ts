import type { AdSessionState } from "./session";
import type { MonetizationAd, MonetizationSettings } from "./types";

export function calculateScore(session: AdSessionState) {
  let score = 0;

  // engagement depth
  score += session.videoCount * 10;

  // smart interactions
  score += session.smartClicks * 5;

  // time factor (soft boost)
  if (session.videoCount > 2) score += 20;

  // decay control (prevents spam bias)
  if (session.videoCount > 10) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function calculateAdScore(
  ad: MonetizationAd,
  session: AdSessionState,
  settings: MonetizationSettings,
) {
  const sessionScore = calculateScore(session);
  const typeWeight = getTypeWeight(ad.type, settings);
  const adWeight = Math.max(ad.weight ?? 1, 1);
  const priority = ad.priority ?? 0;

  return priority * 1000 + typeWeight * adWeight + sessionScore;
}

function getTypeWeight(
  type: MonetizationAd["type"],
  settings: MonetizationSettings,
) {
  if (type === "POPUNDER") return settings.weightPopunder;
  if (type === "SMARTLINK") return settings.weightSmartlink;
  if (type === "INTERSTITIAL") return settings.weightInterstitial;
  if (type === "SOCIAL_BAR") return settings.weightSocialBar;
  if (type === "NATIVE_BANNER") return settings.weightNative;
  return settings.weightBanner;
}
