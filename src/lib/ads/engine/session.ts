const KEY = "ad_engine_session";

export type AdSessionState = {
  smartClicks: number;
  windowStart: number;
  lastSmartTrigger: number;

  popunderShown: boolean;

  pushPromptShown: boolean;

  videoCount: number;
  popunderShownAt: number | null;

  lastShown: Record<string, number>;
  shownCounts: Record<string, number>;
};

function createDefaultSession(): AdSessionState {
  return {
    smartClicks: 0,
    windowStart: Date.now(),
    lastSmartTrigger: 0,
    popunderShown: false,
    pushPromptShown: false,
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
