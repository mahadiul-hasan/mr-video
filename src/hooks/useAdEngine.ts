"use client";

import { useEffect, useMemo, useRef } from "react";
import { initAdEngine } from "@/lib/ads/engine";
import type {
  MonetizationAd,
  MonetizationEvent,
  MonetizationResult,
  MonetizationSettings,
} from "@/lib/ads/engine/types";

export function useAdEngine({
  ads,
  settings,
  onEvent,
}: {
  ads: MonetizationAd[];
  settings: MonetizationSettings;
  onEvent?: (event: MonetizationResult) => void;
}) {
  const engineRef = useRef<ReturnType<typeof initAdEngine> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const engine = initAdEngine({
      ads,
      settings,
      onEvent,
    });

    if (!mountedRef.current) return;

    engineRef.current = engine;

    return () => {
      mountedRef.current = false;
      engineRef.current = null;
    };
  }, [ads, settings, onEvent]);

  return useMemo(
    () => ({
      handle: (event: MonetizationEvent) => {
        engineRef.current?.handle(event);
      },

      onClick: () => {
        engineRef.current?.click();
      },

      onVideoPlay: () => {
        engineRef.current?.videoPlay();
      },

      onTimeUpdate: (seconds: number) => {
        engineRef.current?.timeUpdate(seconds);
      },

      onNextVideo: () => {
        engineRef.current?.nextVideo();
      },

      getEngine: () => engineRef.current,
    }),
    [],
  );
}
