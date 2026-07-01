// components/video/ad-overlay.tsx
"use client";

import { useEffect, useRef } from "react";
import { useAd } from "@/components/providers/ad-provider";
import { renderAdScript } from "@/lib/ads/engine/executor";

export function AdOverlay() {
  const { socialBarAd } = useAd();
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socialBarAd?.script || !scriptRef.current) return;
    renderAdScript(scriptRef.current, socialBarAd.script, {
      appendScriptsTo: "body",
    });
  }, [socialBarAd]);

  if (!socialBarAd) return null;

  return (
    <div className="fixed right-4 top-20 z-50 w-[min(420px,calc(100vw-2rem))] animate-in slide-in-from-top-3">
      {socialBarAd.script && <div ref={scriptRef} />}
    </div>
  );
}
