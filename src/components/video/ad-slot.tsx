// components/video/ad-slot.tsx
"use client";

import { useEffect, useRef } from "react";
import { useAd } from "@/components/providers/ad-provider";
import type { MonetizationAd } from "@/lib/ads/engine/types";
import { AdPlacement } from "@/lib/ads/ad-placements";
import { renderAdScript } from "@/lib/ads/engine/executor";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { getBannerAd, getNativeAd } = useAd();
  const ad =
    propAd ??
    (type === "BANNER" ? getBannerAd(placement) : getNativeAd(placement));

  useEffect(() => {
    if (!ad || !containerRef.current) return;
    renderAdScript(containerRef.current, ad.script);
  }, [ad]);

  if (!ad) return null;

  return (
    <div className={compact ? "w-full" : "w-full"}>
      {label && (
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}
      <div ref={containerRef} className="ad-container" />
    </div>
  );
}
