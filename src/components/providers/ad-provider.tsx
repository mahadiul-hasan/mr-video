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
import { usePathname } from "next/navigation";
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
  onInteraction: () => void;
  displayBannerAd: (placement: string) => MonetizationAd | null;
  displayNativeAd: (placement: string) => MonetizationAd | null;
  getBannerAd: (placement: string) => MonetizationAd | null;
  getNativeAd: (placement: string) => MonetizationAd | null;
  subscribe: (callback: (event: MonetizationResult) => void) => () => void;

  socialBarAd: MonetizationResult | null;
  closeSocialBar: () => void;
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
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith("/watch/");
  const engineRef = useRef<ReturnType<typeof initAdEngine> | null>(null);
  const [socialBarAd, setSocialBarAd] = useState<MonetizationResult | null>(
    null,
  );
  const socialBarHideTimerRef = useRef<number | null>(null);
  const subscribersRef = useRef<((event: MonetizationResult) => void)[]>([]);

  const clearSocialBarHideTimer = useCallback(() => {
    if (socialBarHideTimerRef.current === null) return;
    window.clearTimeout(socialBarHideTimerRef.current);
    socialBarHideTimerRef.current = null;
  }, []);

  const notifySubscribers = useCallback((event: MonetizationResult) => {
    subscribersRef.current.forEach((callback) => callback(event));
  }, []);

  const handleAdEvent = useCallback(
    (event: MonetizationResult) => {
      notifySubscribers(event);

      if (event.type === "SOCIAL_BAR") {
        if (!isWatchPage) return;
        clearSocialBarHideTimer();
        setSocialBarAd(event);
        socialBarHideTimerRef.current = window.setTimeout(() => {
          setSocialBarAd(null);
          socialBarHideTimerRef.current = null;
        }, 10000);
      }
    },
    [clearSocialBarHideTimer, isWatchPage, notifySubscribers],
  );

  useEffect(() => {
    engineRef.current = initAdEngine({
      ads,
      settings,
      onEvent: handleAdEvent,
    });

    return () => {
      clearSocialBarHideTimer();
      engineRef.current = null;
    };
  }, [ads, clearSocialBarHideTimer, settings, handleAdEvent]);

  useEffect(() => {
    if (isWatchPage) return;
    clearSocialBarHideTimer();
    const clearTimer = window.setTimeout(() => setSocialBarAd(null), 0);
    return () => window.clearTimeout(clearTimer);
  }, [clearSocialBarHideTimer, isWatchPage, pathname]);

  useEffect(() => {
    if (!settings.smartlinkEnabled) return;

    const timers: number[] = [];
    const maxPerMinute = Math.max(1, settings.smartlinkMaxPerMinute);
    const minPerMinute = Math.max(
      0,
      Math.min(settings.smartlinkMinPerMinute, maxPerMinute),
    );
    const attemptsPerMinute = Math.max(minPerMinute, maxPerMinute);
    const spacingMs = Math.floor(60000 / attemptsPerMinute);

    const scheduleSmartlinkWindow = () => {
      for (let index = 0; index < attemptsPerMinute; index++) {
        const delay = index === 0 ? 10000 : spacingMs * index;
        timers.push(
          window.setTimeout(() => {
            engineRef.current?.landingSmartlink();
          }, delay),
        );
      }
    };

    scheduleSmartlinkWindow();
    const smartlinkWindowInterval = window.setInterval(
      scheduleSmartlinkWindow,
      60000,
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(smartlinkWindowInterval);
    };
  }, [
    settings.smartlinkEnabled,
    settings.smartlinkMaxPerMinute,
    settings.smartlinkMinPerMinute,
  ]);

  useEffect(() => {
    clearSocialBarHideTimer();
    const clearTimer = window.setTimeout(() => setSocialBarAd(null), 0);

    if (!isWatchPage || !settings.socialBarEnabled) {
      return () => window.clearTimeout(clearTimer);
    }

    const socialTimer = window.setTimeout(() => {
      engineRef.current?.landingSocialBar();
    }, 12000);

    return () => {
      window.clearTimeout(clearTimer);
      window.clearTimeout(socialTimer);
    };
  }, [clearSocialBarHideTimer, isWatchPage, pathname, settings.socialBarEnabled]);

  useEffect(() => {
    let fired = false;

    const handleFirstInteraction = () => {
      if (fired) return;
      fired = true;
      engineRef.current?.landingPopunder();
    };

    window.addEventListener("pointerdown", handleFirstInteraction, {
      capture: true,
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", handleFirstInteraction, {
      capture: true,
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction, {
        capture: true,
      });
      window.removeEventListener("keydown", handleFirstInteraction, {
        capture: true,
      });
    };
  }, [ads, settings]);

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

  const closeSocialBar = useCallback(() => {
    clearSocialBarHideTimer();
    engineRef.current?.dismissSocialBar(socialBarAd?.adId);
    setSocialBarAd(null);
  }, [clearSocialBarHideTimer, socialBarAd?.adId]);

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

  const visibleSocialBarAd = isWatchPage ? socialBarAd : null;

  const value: AdContextType = {
    onPlay: () => engineRef.current?.videoPlay(),
    onPause: () => engineRef.current?.handle("pause"),
    onSeeking: () => engineRef.current?.handle("seeking"),
    onVolumeChange: () => engineRef.current?.handle("volumechange"),
    onFullscreen: () => engineRef.current?.handle("fullscreen"),
    onTimeUpdate: (seconds) => engineRef.current?.timeUpdate(seconds),
    onInteraction: () => {
      engineRef.current?.click();
      engineRef.current?.handle("first-interaction");
    },
    displayBannerAd,
    displayNativeAd,
    getBannerAd,
    getNativeAd,
    subscribe,
    socialBarAd: visibleSocialBarAd,
    closeSocialBar,
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
