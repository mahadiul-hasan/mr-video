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

    onEvent?.({
      type: ad.type,
      adId: ad.id,
      name: ad.name,
      reason,
      firedAt,
    });

    window.setTimeout(() => unlock(), ad.type === "INTERSTITIAL" ? 3000 : 2000);
    return true;
  }

  function fireSmartlink(reason: MonetizationEvent | "smartlink-enforcement") {
    if (!canTriggerSmartlink(session, settings)) return false;

    const ad = selectAd(ads, "SMARTLINK", session, settings);
    if (!fire(ad, reason)) return false;

    session.smartClicks++;
    session.lastSmartTrigger = Date.now();
    runtime.smartForcePending = false;
    saveSession(session);
    return true;
  }

  function handleInteraction(reason: MonetizationEvent) {
    if (typeof document !== "undefined" && document.hidden) return;

    if (!runtime.firstInteractionSeen) {
      runtime.firstInteractionSeen = true;
      window.setTimeout(() => {
        if (session.smartClicks < settings.smartlinkMinPerMinute) {
          runtime.smartForcePending = true;
        }
      }, 15000);
    }

    fireSmartlink(
      runtime.smartForcePending ? "smartlink-enforcement" : reason,
    );
  }

  return {
    handle(event: MonetizationEvent) {
      if (event === "play") this.videoPlay();
      if (event === "next-video") this.nextVideo();
      if (
        event === "first-interaction" ||
        event === "pause" ||
        event === "seeking" ||
        event === "volumechange" ||
        event === "fullscreen"
      ) {
        handleInteraction(event);
      }
    },

    click() {
      handleInteraction("first-interaction");
    },

    videoPlay() {
      if (typeof document !== "undefined" && document.hidden) return;

      if (canTriggerPopunder(session, settings)) {
        const ad = selectAd(ads, "POPUNDER", session, settings);
        if (fire(ad, "play")) {
          session.popunderShown = true;
          session.popunderShownAt = Date.now();
          saveSession(session);
          return;
        }
      }

      if (!runtime.playStarted) {
        runtime.playStarted = true;
        session.videoCount++;
        saveSession(session);
      }

      fireSmartlink("play");
    },

    nextVideo() {
      session.videoCount++;

      if (canTriggerInterstitial(session, settings)) {
        const ad = selectAd(ads, "INTERSTITIAL", session, settings);
        if (fire(ad, "next-video")) {
          session.interstitialCount++;
          session.lastInterstitial = Date.now();
        }
      }

      saveSession(session);
    },

    timeUpdate(seconds: number) {
      runtime.watchSeconds = Math.max(runtime.watchSeconds, seconds);

      if (
        runtime.watchSeconds >= 30 &&
        canTriggerPushPrompt(session, settings)
      ) {
        const ad = selectAd(ads, "SOCIAL_BAR", session, settings);
        if (fire(ad, "watch-time")) {
          session.pushPromptShown = true;
          saveSession(session);
        }
      }
    },

    getSession() {
      return { ...session };
    },
  };
}
