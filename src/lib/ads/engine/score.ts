import type { AdSessionState } from "./session";
import type { MonetizationAd } from "./types";

export function calculateScore(session: AdSessionState) {
  let score = 0;
  score += session.videoCount * 10;
  score += session.smartClicks * 5;
  if (session.videoCount > 2) score += 20;
  if (session.videoCount > 10) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function calculateAdScore(ad: MonetizationAd, session: AdSessionState) {
  const sessionScore = calculateScore(session);
  const adWeight = ad.weight ?? 1;
  const priority = ad.priority ?? 0;
  return priority * 1000 + adWeight * sessionScore;
}
