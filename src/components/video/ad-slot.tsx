"use client";

import { useEffect, useState } from "react";
import { useAd } from "@/components/providers/ad-provider";
import type { MonetizationAd } from "@/lib/ads/engine/types";
import { AdPlacement } from "@/lib/ads/ad-placements";

interface AdSlotProps {
  placement: AdPlacement;
  type: "BANNER" | "NATIVE_BANNER";
  label?: string;
  compact?: boolean;
  ad?: MonetizationAd | null;
}

export function AdSlot({
  placement,
  type,
  label,
  compact,
  ad: propAd,
}: AdSlotProps) {
  const [ad, setAd] = useState<MonetizationAd | null>(propAd || null);
  const { displayBannerAd, displayNativeAd } = useAd();

  useEffect(() => {
    // If ad is passed via props, don't fetch it again
    if (propAd) return;

    const adResult =
      type === "BANNER"
        ? displayBannerAd(placement)
        : displayNativeAd(placement);
    setAd(adResult);
  }, [placement, type, displayBannerAd, displayNativeAd, propAd]);

  if (!ad) return null;

  return (
    <div className={compact ? "w-full" : "w-full"}>
      {label && (
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}
      <div
        dangerouslySetInnerHTML={{ __html: ad.script }}
        className="ad-container"
      />
    </div>
  );
}
