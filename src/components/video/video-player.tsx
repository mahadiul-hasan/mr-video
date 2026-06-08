// components/ui/hls-video-player.tsx
"use client";

import { useEffect, useRef, useState, forwardRef } from "react";
import Hls from "hls.js";

type HLSVideoPlayerProps = {
  src: string; // HLS URL (.m3u8)
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onLoaded?: () => void;
};

export const VideoPlayer = forwardRef<HTMLVideoElement, HLSVideoPlayerProps>(
  (
    {
      src,
      poster,
      className = "",
      autoPlay = false,
      controls = true,
      onPlay,
      onPause,
      onTimeUpdate,
      onLoaded,
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLVideoElement>(null);
    const videoRef = (ref || internalRef) as React.RefObject<HTMLVideoElement>;
    const hlsRef = useRef<Hls | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      setIsLoading(true);
      setError(null);

      const isHLS = src?.includes(".m3u8") || src?.includes(".m3u");

      // Clean up previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (isHLS && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 3,
        });

        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          onLoaded?.();
          if (autoPlay) {
            video.play().catch((err) => {
              console.error("Auto-play failed:", err);
              setError("Auto-play was blocked. Click play to start.");
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("HLS Network error, trying to recover...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("HLS Media error, trying to recover...");
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS Fatal error:", data);
                setError("Unable to play this video. Please try again later.");
                setIsLoading(false);
                break;
            }
          } else {
            // Non-fatal error - just log it
            console.warn("HLS non-fatal error:", data.type, data.details);
          }
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (isHLS && video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS support
        video.src = src;

        const handleLoadedMetadata = () => {
          setIsLoading(false);
          onLoaded?.();
          if (autoPlay) {
            video.play().catch((err) => {
              console.error("Auto-play failed:", err);
              setError("Auto-play was blocked. Click play to start.");
            });
          }
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);

        return () => {
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
      } else if (!isHLS) {
        // Direct MP4 or other format
        video.src = src;

        const handleLoadedMetadata = () => {
          setIsLoading(false);
          onLoaded?.();
          if (autoPlay) {
            video.play().catch((err) => {
              console.error("Auto-play failed:", err);
              setError("Auto-play was blocked. Click play to start.");
            });
          }
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);

        return () => {
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
      } else {
        setError("HLS is not supported in this browser");
        setIsLoading(false);
      }

      return () => {
        if (video) {
          video.pause();
          video.src = "";
        }
      };
    }, [src, autoPlay, onLoaded, videoRef]);

    // Event listeners
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => onPlay?.();
      const handlePause = () => onPause?.();
      const handleTimeUpdate = () => onTimeUpdate?.(video.currentTime);

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("timeupdate", handleTimeUpdate);

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }, [onPlay, onPause, onTimeUpdate, videoRef]);

    return (
      <div className="relative w-full h-full bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center text-white p-4">
              <p className="text-red-500 mb-2">⚠️ {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white text-black rounded-md text-sm hover:bg-gray-200 transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className={`w-full h-full ${className}`}
          poster={poster}
          controls={controls}
          playsInline
          preload="metadata"
        />
      </div>
    );
  },
);

VideoPlayer.displayName = "VideoPlayer";
