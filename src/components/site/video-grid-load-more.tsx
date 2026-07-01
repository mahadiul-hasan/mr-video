"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import type { PublicVideo } from "@/lib/videos/public-videos";
import { VideoCard } from "@/components/video/video-card";
import { AdSlot } from "@/components/video/ad-slot";
import { useAd } from "@/components/providers/ad-provider";
import { AD_PLACEMENTS } from "@/lib/ads/ad-placements";

type LoadFn = (page: number) => Promise<PublicVideo[]>;

export function VideoGridLoadMore({
  initialVideos,
  loadMore,
}: {
  initialVideos: PublicVideo[];
  loadMore: LoadFn;
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialVideos.length >= 12);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { settings } = useAd();

  // Only show native ads if enabled in settings
  const showNativeAds = settings?.nativeEnabled ?? true;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || isPending) return;

        startTransition(async () => {
          const nextPage = page + 1;
          const nextVideos = await loadMore(nextPage);
          setVideos((current) => [...current, ...nextVideos]);
          setPage(nextPage);
          setHasMore(nextVideos.length >= 12);
        });
      },
      { rootMargin: "600px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isPending, loadMore, page]);

  if (videos.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No published videos yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video, index) => (
          <Fragment key={`${video.id}-${index}`}>
            <div className="h-full">
              <VideoCard video={video} priority={index < 4} />
            </div>
            {showNativeAds && (index + 1) % 6 === 0 && (
              <AdSlot
                key={`native-${video.id}-${index}`}
                placement={AD_PLACEMENTS.GRID_NATIVE_EVERY_6}
                type="NATIVE_BANNER"
                compact
                className="min-h-full overflow-hidden rounded-md border border-border bg-card transition hover:border-foreground/30 hover:shadow-md"
              />
            )}
          </Fragment>
        ))}
      </div>
      <div
        ref={sentinelRef}
        className="flex min-h-12 items-center justify-center text-sm text-muted-foreground"
      >
        {isPending
          ? "Loading more videos..."
          : hasMore
            ? "Scroll for more"
            : "End of videos"}
      </div>
    </div>
  );
}
