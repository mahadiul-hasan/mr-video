"use client";

import { X } from "lucide-react";
import { useAd } from "@/components/providers/ad-provider";

export function AdOverlay() {
  const {
    interstitialAd,
    socialBarAd,
    closeInterstitial,
    closeSocialBar,
    isInterstitialSkipReady,
  } = useAd();

  if (!interstitialAd && !socialBarAd) return null;

  return (
    <>
      {/* Interstitial Overlay */}
      {interstitialAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Advertisement
              </p>
              <h3 className="mt-2 text-xl font-bold">{interstitialAd.name}</h3>
            </div>

            {/* Render the ad script if available */}
            {interstitialAd.script && (
              <div
                dangerouslySetInnerHTML={{ __html: interstitialAd.script }}
                className="my-4"
              />
            )}

            <button
              onClick={closeInterstitial}
              disabled={!isInterstitialSkipReady}
              className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isInterstitialSkipReady ? "Continue Watching" : "Ad loading..."}
            </button>
          </div>
        </div>
      )}

      {/* Social Bar */}
      {socialBarAd && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-5 rounded-lg border border-border bg-card p-3 shadow-lg md:left-auto md:right-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">{socialBarAd.name}</p>
              {socialBarAd.script && (
                <div
                  dangerouslySetInnerHTML={{ __html: socialBarAd.script }}
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
