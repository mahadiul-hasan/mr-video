"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useState,
} from "react";
import { initAdEngine } from "@/lib/ads/engine";
import type {
  MonetizationAd,
  MonetizationSettings,
  MonetizationResult,
} from "@/lib/ads/engine/types";

// Named export for the provider
export const AD_CONTEXT_DEFAULT_VALUE = null;

export type AdContextType = {
  onPlay: () => void;
  onPause: () => void;
  onSeeking: () => void;
  onVolumeChange: () => void;
  onFullscreen: () => void;
  onTimeUpdate: (seconds: number) => void;
  onNextVideo: () => void;
  onInteraction: () => void;
  displayBannerAd: (placement: string) => MonetizationAd | null;
  displayNativeAd: (placement: string) => MonetizationAd | null;
  getBannerAd: (placement: string) => MonetizationAd | null;
  getNativeAd: (placement: string) => MonetizationAd | null;
  subscribe: (callback: (event: MonetizationResult) => void) => () => void;
  interstitialAd: MonetizationResult | null;
  socialBarAd: MonetizationResult | null;
  closeInterstitial: () => void;
  closeSocialBar: () => void;
  isInterstitialSkipReady: boolean;
  settings: MonetizationSettings;
  ads: MonetizationAd[];
};

const AdContext = createContext<AdContextType | null>(null);

// Named function component (PascalCase)
export function AdProvider({
  children,
  ads,
  settings,
}: {
  children: ReactNode;
  ads: MonetizationAd[];
  settings: MonetizationSettings;
}) {
  const engineRef = useRef<ReturnType<typeof initAdEngine> | null>(null);
  const [interstitialAd, setInterstitialAd] =
    useState<MonetizationResult | null>(null);
  const [socialBarAd, setSocialBarAd] = useState<MonetizationResult | null>(
    null,
  );
  const [isInterstitialSkipReady, setIsInterstitialSkipReady] = useState(false);
  const subscribersRef = useRef<((event: MonetizationResult) => void)[]>([]);

  const notifySubscribers = useCallback((event: MonetizationResult) => {
    subscribersRef.current.forEach((callback) => callback(event));
  }, []);

  const handleAdEvent = useCallback(
    (event: MonetizationResult) => {
      notifySubscribers(event);

      if (event.type === "INTERSTITIAL") {
        setInterstitialAd(event);
        setIsInterstitialSkipReady(false);
        setTimeout(() => setIsInterstitialSkipReady(true), 2500);
      }

      if (event.type === "SOCIAL_BAR") {
        setSocialBarAd(event);
        setTimeout(() => setSocialBarAd(null), 10000);
      }
    },
    [notifySubscribers],
  );

  useEffect(() => {
    engineRef.current = initAdEngine({
      ads,
      settings,
      onEvent: handleAdEvent,
    });

    return () => {
      engineRef.current = null;
    };
  }, [ads, settings, handleAdEvent]);

  const subscribe = useCallback(
    (callback: (event: MonetizationResult) => void) => {
      subscribersRef.current.push(callback);
      return () => {
        subscribersRef.current = subscribersRef.current.filter(
          (cb) => cb !== callback,
        );
      };
    },
    [],
  );

  const closeInterstitial = useCallback(() => {
    setInterstitialAd(null);
    setIsInterstitialSkipReady(false);
  }, []);

  const closeSocialBar = useCallback(() => {
    setSocialBarAd(null);
  }, []);

  const displayBannerAd = useCallback(
    (placement: string) => {
      if (!settings.bannerEnabled) return null;
      return engineRef.current?.displayBannerAd(placement) ?? null;
    },
    [settings.bannerEnabled],
  );

  const displayNativeAd = useCallback(
    (placement: string) => {
      if (!settings.nativeEnabled) return null;
      return engineRef.current?.displayNativeAd(placement) ?? null;
    },
    [settings.nativeEnabled],
  );

  const getBannerAd = useCallback(
    (placement: string) => {
      if (!settings.bannerEnabled) return null;
      return (
        ads.find(
          (ad) =>
            ad.type === "BANNER" && ad.placement === placement && ad.isActive,
        ) ?? null
      );
    },
    [ads, settings.bannerEnabled],
  );

  const getNativeAd = useCallback(
    (placement: string) => {
      if (!settings.nativeEnabled) return null;
      return (
        ads.find(
          (ad) =>
            ad.type === "NATIVE_BANNER" &&
            ad.placement === placement &&
            ad.isActive,
        ) ?? null
      );
    },
    [ads, settings.nativeEnabled],
  );

  const value: AdContextType = {
    onPlay: () => engineRef.current?.videoPlay(),
    onPause: () => engineRef.current?.handle("pause"),
    onSeeking: () => engineRef.current?.handle("seeking"),
    onVolumeChange: () => engineRef.current?.handle("volumechange"),
    onFullscreen: () => engineRef.current?.handle("fullscreen"),
    onTimeUpdate: (seconds) => engineRef.current?.timeUpdate(seconds),
    onNextVideo: () => engineRef.current?.nextVideo(),
    onInteraction: () => {
      engineRef.current?.click();
      engineRef.current?.handle("first-interaction");
    },
    displayBannerAd,
    displayNativeAd,
    getBannerAd,
    getNativeAd,
    subscribe,
    interstitialAd,
    socialBarAd,
    closeInterstitial,
    closeSocialBar,
    isInterstitialSkipReady,
    settings,
    ads,
  };

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

// Named hook function
export function useAd(): AdContextType {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error("useAd must be used within AdProvider");
  }
  return context;
}
