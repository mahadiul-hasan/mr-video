import { lock, unlock, canRun } from "./conflict";
import { runAdScript } from "./executor";
import { selectAd } from "./selector";
import { getSession, saveSession } from "./session";
import {
  canTriggerInterstitial,
  canTriggerPopunder,
  canTriggerPushPrompt,
  canTriggerSmartlink,
} from "./rules";
import type {
  MonetizationAd,
  MonetizationEvent,
  MonetizationResult,
  MonetizationSettings,
} from "./types";

type EngineProps = {
  ads: MonetizationAd[];
  settings: MonetizationSettings;
  onEvent?: (event: MonetizationResult) => void;
};

export function createEngine({ ads, settings, onEvent }: EngineProps) {
  const session = getSession();
  const runtime = {
    firstInteractionSeen: false,
    playStarted: false,
    watchSeconds: 0,
    smartForcePending: false,
    lastInteractionTime: 0,
    interactionCount: 0,
  };

  function fire(
    ad: MonetizationAd | null,
    reason: MonetizationResult["reason"],
  ) {
    if (!ad || !canRun()) return false;

    lock();

    const firedAt = Date.now();
    runAdScript(ad.script);

    session.lastShown[ad.id] = firedAt;
    session.shownCounts[ad.id] = (session.shownCounts[ad.id] ?? 0) + 1;
    saveSession(session);

    // Include script in the event for UI to render
    onEvent?.({
      type: ad.type,
      adId: ad.id,
      name: ad.name,
      reason,
      firedAt,
      script: ad.script, // Add this line
    });

    // Different unlock times for different ad types
    const unlockDelay =
      ad.type === "INTERSTITIAL" ? 3000 : ad.type === "POPUNDER" ? 1000 : 500;
    window.setTimeout(() => unlock(), unlockDelay);
    return true;
  }

  function fireSmartlink(reason: MonetizationEvent | "smartlink-enforcement") {
    if (!canTriggerSmartlink(session, settings)) return false;

    const ad = selectAd(ads, "SMARTLINK", session);
    if (!fire(ad, reason)) return false;

    session.smartClicks++;
    session.lastSmartTrigger = Date.now();
    runtime.smartForcePending = false;
    runtime.lastInteractionTime = Date.now();
    runtime.interactionCount++;
    saveSession(session);
    return true;
  }

  function handleInteraction(reason: MonetizationEvent) {
    // Don't trigger on hidden tab
    if (typeof document !== "undefined" && document.hidden) return;

    // Rate limit interactions (max 3 per 10 seconds)
    const now = Date.now();
    if (now - runtime.lastInteractionTime < 3000) return;

    runtime.lastInteractionTime = now;
    runtime.interactionCount++;

    // First interaction logic
    if (!runtime.firstInteractionSeen) {
      runtime.firstInteractionSeen = true;
      window.setTimeout(() => {
        if (session.smartClicks < settings.smartlinkMinPerMinute) {
          runtime.smartForcePending = true;
        }
      }, 15000);
    }

    // Trigger smartlink on interactions (but not too frequently)
    fireSmartlink(runtime.smartForcePending ? "smartlink-enforcement" : reason);
  }

  // Native ad display (for grid/list placements)
  function displayNativeAd(
    placement: string,
    reason: MonetizationResult["reason"] = "next-video",
  ) {
    if (!settings.nativeEnabled) return null;

    const ad = selectAd(ads, "NATIVE_BANNER", session);
    if (ad && ad.placement === placement) {
      fire(ad, reason);
      return ad;
    }
    return null;
  }

  // Banner ad display (for header/sidebar/footer)
  function displayBannerAd(
    placement: string,
    reason: MonetizationResult["reason"] = "banner-display",
  ) {
    if (!settings.bannerEnabled) return null;

    const ad = selectAd(ads, "BANNER", session);
    if (ad && ad.placement === placement) {
      fire(ad, reason);
      return ad;
    }
    return null;
  }

  // Social bar / push prompt
  function displaySocialBar(
    reason: MonetizationResult["reason"] = "watch-time",
  ) {
    if (!settings.socialBarEnabled) return null;

    if (canTriggerPushPrompt(session, settings)) {
      const ad = selectAd(ads, "SOCIAL_BAR", session);
      if (fire(ad, reason)) {
        session.pushPromptShown = true;
        saveSession(session);
        return ad;
      }
    }
    return null;
  }

  return {
    // Main event handler
    handle(event: MonetizationEvent) {
      switch (event) {
        case "play":
          this.videoPlay();
          break;
        case "next-video":
          this.nextVideo();
          break;
        case "first-interaction":
        case "pause":
        case "seeking":
        case "volumechange":
        case "fullscreen":
          handleInteraction(event);
          break;
        case "timeupdate":
          // timeupdate handled separately with seconds param
          break;
      }
    },

    // User click handler
    click() {
      handleInteraction("first-interaction");
    },

    // Video play handler
    videoPlay() {
      if (typeof document !== "undefined" && document.hidden) return;

      // Check for popunder on video start (once per day)
      if (canTriggerPopunder(session, settings)) {
        const ad = selectAd(ads, "POPUNDER", session);
        if (fire(ad, "play")) {
          session.popunderShownAt = Date.now();
          saveSession(session);
          // Don't return - continue with smartlink check
        }
      }

      // Track video count on first play
      if (!runtime.playStarted) {
        runtime.playStarted = true;
        session.videoCount++;
        saveSession(session);
      }

      // Trigger smartlink on play
      fireSmartlink("play");
    },

    // Next video handler (for interstitial ads)
    nextVideo() {
      session.videoCount++;

      // Check for interstitial between videos
      if (canTriggerInterstitial(session, settings)) {
        const ad = selectAd(ads, "INTERSTITIAL", session);
        if (fire(ad, "next-video")) {
          session.interstitialCount++;
          session.lastInterstitial = Date.now();
          saveSession(session);
        }
      }

      saveSession(session);
    },

    // Time update handler (for social bar at 30 seconds)
    timeUpdate(seconds: number) {
      runtime.watchSeconds = Math.max(runtime.watchSeconds, seconds);

      // Trigger social bar at 30 seconds of watch time
      if (
        runtime.watchSeconds >= 30 &&
        canTriggerPushPrompt(session, settings)
      ) {
        const ad = selectAd(ads, "SOCIAL_BAR", session);
        if (fire(ad, "watch-time")) {
          session.pushPromptShown = true;
          saveSession(session);
        }
      }
    },

    // Display native ad in grid/list (for home page, category pages)
    displayNativeAd,

    // Display banner ad (for header, sidebar, footer)
    displayBannerAd,

    // Display social bar (for watch page)
    displaySocialBar,

    // Get current ad (for manual placement)
    getAdByType(type: string, placement?: string) {
      const ad = selectAd(ads, type, session);
      if (ad && placement && ad.placement !== placement) return null;
      return ad;
    },

    // Get session state (for debugging)
    getSession() {
      return { ...session };
    },

    // Reset session (for testing)
    resetSession() {
      Object.assign(session, {
        smartClicks: 0,
        windowStart: Date.now(),
        lastSmartTrigger: 0,
        popunderShown: false,
        interstitialCount: 0,
        lastInterstitial: 0,
        pushPromptShown: false,
        videoCount: 0,
        popunderShownAt: null,
        lastShown: {},
        shownCounts: {},
      });
      saveSession(session);
    },
  };
}
