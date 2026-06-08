// components/video/video-card.tsx
"use client";

import Link from "next/link";
import type { PublicVideo } from "@/lib/videos/public-videos";

type VideoCardProps = {
  video: PublicVideo;
  layout?: "vertical" | "horizontal";
};

export function VideoCard({ video, layout = "vertical" }: VideoCardProps) {
  const formatViews = (views: string | number) => {
    const num = typeof views === "string" ? parseInt(views) : views;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return `${num}`;
  };

  if (layout === "horizontal") {
    return (
      <Link
        href={`/watch/${video.slug}`}
        className="group flex gap-3 transition hover:opacity-80"
      >
        <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-md bg-muted">
          <img
            src={video.poster}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {video.duration}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight group-hover:text-primary">
            {video.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{video.category}</span>
            <span>•</span>
            <span>{formatViews(video.views)} views</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/watch/${video.slug}`}
      className="group block overflow-hidden rounded-md border border-border bg-card transition hover:border-foreground/30 hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={video.poster}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
          {video.duration}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{video.category}</span>
          <span>•</span>
          <span>{formatViews(video.views)} views</span>
        </div>
      </div>
    </Link>
  );
}
