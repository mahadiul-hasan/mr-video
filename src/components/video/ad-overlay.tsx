// components/video/ad-overlay.tsx
"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useAd } from "@/components/providers/ad-provider";
import { renderAdScript } from "@/lib/ads/engine/executor";

export function AdOverlay() {
  const { socialBarAd, closeSocialBar } = useAd();
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socialBarAd?.script || !scriptRef.current) return;
    renderAdScript(scriptRef.current, socialBarAd.script);
  }, [socialBarAd]);

  if (!socialBarAd) return null;

  return (
    <>
      {/* Social Bar */}
      {socialBarAd && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-5 rounded-lg border border-border bg-card p-3 shadow-lg md:left-auto md:right-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">{socialBarAd.name}</p>
              {socialBarAd.script && (
                <div
                  ref={scriptRef}
                  className="mt-1 text-xs text-muted-foreground"
                />
              )}
            </div>
            <button
              onClick={closeSocialBar}
              className="rounded-full p-1 hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
