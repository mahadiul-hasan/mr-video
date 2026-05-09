"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useAd } from "@/components/providers/ad-provider";
import type { PublicVideo } from "@/lib/videos/public-videos";

type VideoPlayerProps = {
  video: PublicVideo;
};

export function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ad = useAd();

  // Initialize video player
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    // Setup HLS
    const isHls = video.hlsUrl?.includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(video.hlsUrl);
      hls.attachMedia(element);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Ready to play
      });
    } else if (isHls && element.canPlayType("application/vnd.apple.mpegurl")) {
      element.src = video.hlsUrl;
    } else {
      element.src = video.mp4Url;
    }

    // Dynamically import Plyr with proper initialization
    const initPlyr = async () => {
      try {
        // Import CSS first
        await import("plyr/dist/plyr.css");
        // Then import Plyr
        const PlyrModule = await import("plyr");
        const Plyr = PlyrModule.default;

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

        // Plyr event listeners
        plyr.on("play", () => ad.onPlay());
        plyr.on("pause", () => ad.onPause());
        plyr.on("seeking", () => ad.onSeeking());
        plyr.on("volumechange", () => ad.onVolumeChange());
        plyr.on("enterfullscreen", () => ad.onFullscreen());
        plyr.on("timeupdate", () => {
          const currentTime = videoRef.current?.currentTime ?? 0;
          ad.onTimeUpdate(currentTime);
        });
      } catch (error) {}
    };

    initPlyr();

    return () => {
      if (plyrRef.current) {
        plyrRef.current.destroy();
        plyrRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.hlsUrl, video.mp4Url, ad]);

  // Track first interaction
  useEffect(() => {
    let firstInteraction = false;

    const handleInteraction = () => {
      if (firstInteraction) return;
      firstInteraction = true;
      ad.onInteraction();
    };

    const element = videoRef.current;
    if (element) {
      element.addEventListener("click", handleInteraction);
      element.addEventListener("touchstart", handleInteraction);
    }

    return () => {
      if (element) {
        element.removeEventListener("click", handleInteraction);
        element.removeEventListener("touchstart", handleInteraction);
      }
    };
  }, [ad]);

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-black">
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black"
        poster={video.poster}
        preload="metadata"
        playsInline
      />
    </div>
  );
}
