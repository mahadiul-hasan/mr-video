import { AdType } from "./ad-types";

export function requiresPlacement(type: AdType) {
  return type === "BANNER" || type === "NATIVE_BANNER";
}

export function isSystemAd(type: AdType) {
  return (
    type === "POPUNDER" ||
    type === "SOCIAL_BAR" ||
    type === "SMARTLINK" ||
    type === "INTERSTITIAL"
  );
}
