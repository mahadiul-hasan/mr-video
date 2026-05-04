"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { Maximize2, Play, X } from "lucide-react";
import Plyr from "plyr";
import { useAdEngine } from "@/hooks/useAdEngine";
import type {
  MonetizationAd,
  MonetizationResult,
  MonetizationSettings,
} from "@/lib/ads/engine/types";
import type { PublicVideo } from "@/lib/videos/public-videos";

type VideoPlayerProps = {
  video: PublicVideo;
  ads: MonetizationAd[];
  settings: MonetizationSettings;
};

export function VideoPlayer({ video, ads, settings }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const firstInteractionRef = useRef(false);
  const [interstitial, setInterstitial] = useState<MonetizationResult | null>(
    null,
  );
  const [socialBar, setSocialBar] = useState<MonetizationResult | null>(null);
  const [skipEnabled, setSkipEnabled] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>("Ready");

  const handleAdEvent = useCallback((event: MonetizationResult) => {
    setLastEvent(`${event.type} fired by ${event.reason}`);

    if (event.type === "INTERSTITIAL") {
      setInterstitial(event);
      setSkipEnabled(false);
      window.setTimeout(() => setSkipEnabled(true), 2500);
    }

    if (event.type === "SOCIAL_BAR") {
      setSocialBar(event);
    }
  }, []);

  const adEngine = useAdEngine({
    ads,
    settings,
    onEvent: handleAdEvent,
  });

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const isHls = video.hlsUrl.includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(video.hlsUrl);
      hls.attachMedia(element);
      hlsRef.current = hls;
    } else if (isHls && element.canPlayType("application/vnd.apple.mpegurl")) {
      element.src = video.hlsUrl;
    }

    const plyr = new Plyr(element, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "settings",
        "fullscreen",
      ],
      settings: ["quality", "speed"],
    });
    plyrRef.current = plyr;

    return () => {
      plyr.destroy();
      hlsRef.current?.destroy();
      plyrRef.current = null;
      hlsRef.current = null;
    };
  }, [video.hlsUrl]);

  const markFirstInteraction = useCallback(() => {
    if (firstInteractionRef.current) return;
    firstInteractionRef.current = true;
    adEngine.handle("first-interaction");
  }, [adEngine]);

  const playerHandlers = useMemo(
    () => ({
      onClick: markFirstInteraction,
      onPlay: () => adEngine.handle("play"),
      onPause: () => adEngine.handle("pause"),
      onSeeking: () => adEngine.handle("seeking"),
      onVolumeChange: () => adEngine.handle("volumechange"),
      onTimeUpdate: () => {
        const currentTime = videoRef.current?.currentTime ?? 0;
        adEngine.onTimeUpdate(currentTime);
      },
    }),
    [adEngine, markFirstInteraction],
  );

  async function handleFullscreen() {
    markFirstInteraction();
    adEngine.handle("fullscreen");

    try {
      const plyr = plyrRef.current;
      if (plyr?.fullscreen?.enter) {
        plyr.fullscreen.enter();
        return;
      }

      const element = videoRef.current;
      if (element?.isConnected && element.requestFullscreen) {
        await element.requestFullscreen();
      }
    } catch {
      setLastEvent("Fullscreen unavailable");
    }
  }

  async function handlePlayClick() {
    markFirstInteraction();

    try {
      await videoRef.current?.play();
    } catch {
      setLastEvent("Playback unavailable");
    }
  }

  function handleNextVideo() {
    adEngine.onNextVideo();
    setLastEvent("Next video requested");
  }

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-md border border-border bg-black"
        onClick={markFirstInteraction}
      >
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black object-contain"
          controls
          poster={video.poster}
          preload="metadata"
          {...playerHandlers}
        >
          {!video.hlsUrl.includes(".m3u8") && (
            <source src={video.mp4Url} type="video/mp4" />
          )}
        </video>

        <div className="absolute left-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handlePlayClick()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm"
            aria-label="Play video"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleFullscreen()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm"
            aria-label="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {interstitial && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 p-6 text-center">
            <div className="w-full max-w-sm space-y-4 rounded-md border border-border bg-card p-5 shadow-xl">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Sponsored
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {interstitial.name}
                </h3>
              </div>
              <button
                type="button"
                disabled={!skipEnabled}
                onClick={() => setInterstitial(null)}
                className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {skipEnabled ? "Skip ad" : "Skip available soon"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Engine status: {lastEvent}</span>
        <button
          type="button"
          onClick={handleNextVideo}
          className="rounded-md border border-border px-3 py-2 font-medium text-foreground transition hover:bg-accent"
        >
          Next video
        </button>
      </div>

      {socialBar && (
        <div className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-md border border-border bg-card p-3 shadow-2xl">
          <div>
            <p className="text-sm font-semibold">{socialBar.name}</p>
            <p className="text-xs text-muted-foreground">
              Session lifecycle placement
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSocialBar(null)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
            aria-label="Dismiss social bar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
