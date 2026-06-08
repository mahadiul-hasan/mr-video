import type { AdSessionState } from "./session";
import type { MonetizationSettings } from "./types";

export function canTriggerPopunder(
  session: AdSessionState,
  settings: MonetizationSettings,
) {
  if (!settings.popunderEnabled) return false;
  if (!session.popunderShownAt) return true;

  const cooldownMs = settings.popunderCooldownHours * 60 * 60 * 1000;
  return Date.now() - session.popunderShownAt >= cooldownMs;
}

export function canTriggerSmartlink(
  session: AdSessionState,
  settings: MonetizationSettings,
) {
  if (!settings.smartlinkEnabled) return false;
  if (typeof document !== "undefined" && document.hidden) return false;

  const now = Date.now();
  const last = session.lastSmartTrigger || 0;

  if (now - session.windowStart >= 60000) {
    session.windowStart = now;
    session.smartClicks = 0;
  }

  if (now - last < 10000) return false;

  return session.smartClicks < settings.smartlinkMaxPerMinute;
}

export function canTriggerPushPrompt(
  session: AdSessionState,
  settings: MonetizationSettings,
) {
  if (!settings.socialBarEnabled) return false;
  if (session.pushPromptShown) return false;
  return session.videoCount >= 2;
}
