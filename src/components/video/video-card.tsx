import Link from "next/link";
import type { PublicVideo } from "@/lib/videos/public-videos";

export function VideoCard({ video }: { video: PublicVideo }) {
  return (
    <Link
      href={`/watch/${video.slug}`}
      className="group block overflow-hidden rounded-md border border-border bg-card transition hover:border-foreground/30"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.poster}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-2 right-2 rounded bg-background/90 px-2 py-1 text-xs font-semibold">
          {video.duration}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{video.category}</span>
          <span>{video.views} views</span>
        </div>
      </div>
    </Link>
  );
}
