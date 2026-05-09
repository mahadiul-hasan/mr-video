"use client";

import { useEffect } from "react";
import { useAd } from "@/components/providers/ad-provider";

export function AdsInitializer() {
  const ad = useAd();

  useEffect(() => {
    // Display header banner
    ad.displayBannerAd("header");
  }, [ad]);

  return null;
}
