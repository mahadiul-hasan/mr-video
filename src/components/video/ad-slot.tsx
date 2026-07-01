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
  className?: string;
}

export function AdSlot({
  placement,
  type,
  label,
  compact,
  ad: propAd,
  className,
}: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { getBannerAd, getNativeAd } = useAd();
  const ad =
    propAd ??
    (type === "BANNER" ? getBannerAd(placement) : getNativeAd(placement));

  useEffect(() => {
    if (!ad || !containerRef.current) return;
    if (type === "NATIVE_BANNER") return;
    renderAdScript(containerRef.current, ad.script);
  }, [ad, type]);

  useEffect(() => {
    if (!ad || type !== "NATIVE_BANNER" || !iframeRef.current) return;

    iframeRef.current.srcdoc = `
      <!doctype html>
      <html>
        <head>
          <base href="${window.location.origin}" />
          <style>
            html, body {
              width: 100%;
              min-height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: transparent;
            }
            body > * {
              max-width: 100%;
            }
          </style>
        </head>
        <body>${ad.script}</body>
      </html>
    `;
  }, [ad, type]);

  if (!ad) return null;

  return (
    <div className={className ?? (compact ? "w-full" : "w-full")}>
      {label && (
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}
      {type === "NATIVE_BANNER" ? (
        <iframe
          ref={iframeRef}
          title={ad.name}
          className="h-full min-h-64 w-full border-0"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div ref={containerRef} className="ad-container" />
      )}
    </div>
  );
}
