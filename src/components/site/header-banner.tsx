"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/video/ad-slot";
import { AD_PLACEMENTS } from "@/lib/ads/ad-placements";

export function HeaderBanner() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <div className="border-b border-border/60 px-4 py-2">
      <div className="mx-auto flex max-w-7xl justify-center">
        <div className="w-full max-w-3xl">
          <AdSlot placement={AD_PLACEMENTS.HEADER} type="BANNER" compact />
        </div>
      </div>
    </div>
  );
}
