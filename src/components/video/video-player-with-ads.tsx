// components/video/video-player-with-ads.tsx
"use client";

import { useRef, useEffect } from "react";
import { useAd } from "@/components/providers/ad-provider";
import { VideoPlayer } from "./video-player";

type VideoPlayerWithAdsProps = {
  src: string;
  poster?: string;
  videoId: string;
  title?: string;
};

export function VideoPlayerWithAds({
  src,
  poster,
  videoId,
  title,
}: VideoPlayerWithAdsProps) {
  const ad = useAd();
  const videoRef = useRef<HTMLVideoElement>(null);
  const firstInteractionRef = useRef(false);

  const handleTimeUpdate = (currentTime: number) => {
    ad.onTimeUpdate(currentTime);
  };

  const handlePlay = () => {
    ad.onPlay();
  };

  const handlePause = () => {
    ad.onPause();
  };

  const handleLoaded = () => {
    console.log(`Video loaded: ${title || videoId}`);
  };

  // Track first interaction
  useEffect(() => {
    const video = videoRef.current;

    const handleInteraction = () => {
      if (firstInteractionRef.current) return;
      firstInteractionRef.current = true;
      ad.onInteraction();
    };

    if (video) {
      video.addEventListener("click", handleInteraction);
      video.addEventListener("touchstart", handleInteraction);
    }

    return () => {
      if (video) {
        video.removeEventListener("click", handleInteraction);
        video.removeEventListener("touchstart", handleInteraction);
      }
    };
  }, [ad]);

  return (
    <VideoPlayer
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay={false}
      controls={true}
      onPlay={handlePlay}
      onPause={handlePause}
      onTimeUpdate={handleTimeUpdate}
      onLoaded={handleLoaded}
    />
  );
}
