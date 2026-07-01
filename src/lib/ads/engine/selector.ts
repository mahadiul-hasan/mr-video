import { calculateAdScore } from "./score";
import type { AdSessionState } from "./session";
import type { MonetizationAd } from "./types";

export function selectAd(
  ads: MonetizationAd[],
  type: string,
  session: AdSessionState,
  options: { ignoreAdLimits?: boolean } = {},
) {
  const now = Date.now();

  const candidates = ads.filter((ad) => {
    if (!ad.isActive) return false;
    if (ad.type !== type) return false;

    if (
      !options.ignoreAdLimits &&
      ad.frequencyCap &&
      (session.shownCounts?.[ad.id] ?? 0) >= ad.frequencyCap
    ) {
      return false;
    }

    if (
      !options.ignoreAdLimits &&
      ad.cooldownSeconds &&
      session.lastShown?.[ad.id] &&
      now - session.lastShown[ad.id] < ad.cooldownSeconds * 1000
    ) {
      return false;
    }

    return true;
  });

  if (!candidates.length) return null;

  return candidates.sort((a, b) => {
    const scoreA = calculateAdScore(a, session);
    const scoreB = calculateAdScore(b, session);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
    );
  })[0];
}
