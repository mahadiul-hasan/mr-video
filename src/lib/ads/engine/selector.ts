import { calculateAdScore } from "./score";
import type { AdSessionState } from "./session";
import type { MonetizationAd, MonetizationSettings } from "./types";

export function selectAd(
  ads: MonetizationAd[],
  type: string,
  session: AdSessionState,
  settings: MonetizationSettings,
) {
  const now = Date.now();

  const candidates = ads.filter((ad) => {
    if (!ad.isActive) return false;
    if (ad.type !== type) return false;

    if (ad.frequencyCap && (session.shownCounts?.[ad.id] ?? 0) >= ad.frequencyCap) return false;

    if (
      ad.cooldownSeconds &&
      session.lastShown?.[ad.id] &&
      now - session.lastShown[ad.id] < ad.cooldownSeconds * 1000
    ) {
      return false;
    }

    return true;
  });

  if (!candidates.length) return null;

  const sorted = candidates.toSorted((a, b) => {
    const score = calculateAdScore(b, session, settings) - calculateAdScore(a, session, settings);
    if (score !== 0) return score;

    const aTime = new Date(a.createdAt ?? 0).getTime();
    const bTime = new Date(b.createdAt ?? 0).getTime();
    if (aTime !== bTime) return bTime - aTime;

    return String(a.id).localeCompare(String(b.id));
  });

  return sorted[0] ?? null;
}
