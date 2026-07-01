const KEY = "ad_engine_session";

export type AdSessionState = {
  startedAt: number;
  smartClicks: number;
  windowStart: number;
  lastSmartTrigger: number;

  popunderShown: boolean;

  pushPromptShown: boolean;
  socialBarDismissedAt: number | null;

  videoCount: number;
  popunderShownAt: number | null;

  lastShown: Record<string, number>;
  shownCounts: Record<string, number>;
};

function createDefaultSession(): AdSessionState {
  return {
    startedAt: Date.now(),
    smartClicks: 0,
    windowStart: Date.now(),
    lastSmartTrigger: 0,
    popunderShown: false,
    pushPromptShown: false,
    socialBarDismissedAt: null,
    videoCount: 0,
    popunderShownAt: null,
    lastShown: {},
    shownCounts: {},
  };
}

export function getSession(): AdSessionState {
  const fallback = createDefaultSession();
  if (typeof window === "undefined") return fallback;

  const raw = localStorage.getItem(KEY);
  if (!raw) return fallback;

  try {
    const session = {
      ...fallback,
      ...JSON.parse(raw),
    } satisfies AdSessionState;

    if (Date.now() - session.startedAt >= 24 * 60 * 60 * 1000) {
      const fresh = createDefaultSession();
      saveSession(fresh);
      return fresh;
    }

    if (Date.now() - session.windowStart >= 60000) {
      session.windowStart = Date.now();
      session.smartClicks = 0;
    }

    return session;
  } catch {
    return fallback;
  }
}

export function saveSession(session: AdSessionState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
}
