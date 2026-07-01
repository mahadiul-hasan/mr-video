// app/(main)/watch/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { VideoPlayerWithAds } from "@/components/video/video-player-with-ads";
import { VideoViewTracker } from "@/components/video/video-view-tracker";
import { VideoCard } from "@/components/video/video-card";
import { AdSlot } from "@/components/video/ad-slot";
import {
  getPublicCategories,
  getPublicTags,
  getPublicVideoBySlug,
  getRelatedPublicVideos,
} from "@/lib/videos/public-videos";
import { AD_PLACEMENTS } from "@/lib/ads/ad-placements";

export const revalidate = 3600; // 1 hour

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const video = await getPublicVideoBySlug(slug);

  if (!video) {
    return {
      title: "Video Not Found",
      description: "The requested video could not be found.",
    };
  }

  return {
    title: video.title,
    openGraph: {
      title: video.title,
      images: [{ url: video.poster }],
      type: "video.other",
    },
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { slug } = await params;
  const video = await getPublicVideoBySlug(slug);

  if (!video) notFound();

  const [relatedVideos, categories, tags] = await Promise.all([
    getRelatedPublicVideos({
      slug: video.slug,
      category: video.category,
      limit: 12,
    }),
    getPublicCategories({ limit: 5 }),
    getPublicTags({ limit: 5 }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5">
      <VideoViewTracker slug={video.slug} />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <VideoPlayerWithAds
              src={video.hlsUrl}
              poster={video.poster}
              videoId={video.id}
              title={video.title}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {video.category}
              </span>
              <span>-</span>
              <span>{video.views}</span>
              <span>-</span>
              <span>{video.duration}</span>
            </div>

            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {video.title}
            </h1>
          </div>
        </div>

        <aside className="space-y-4 lg:pt-1">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Categories
            </h2>
            <div className="space-y-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition hover:bg-muted"
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {category._count.videos}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-sm transition hover:border-foreground/40 hover:bg-muted"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {relatedVideos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Related videos</h2>
            <span className="text-xs text-muted-foreground">
              {relatedVideos.length} videos
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {relatedVideos.map((related, index) => (
              <Fragment key={related.id}>
                <div className="h-full">
                  <VideoCard video={related} />
                </div>

                {(index + 1) % 6 === 0 && (
                  <AdSlot
                    placement={AD_PLACEMENTS.GRID_NATIVE_EVERY_6}
                    type="NATIVE_BANNER"
                    compact
                    className="min-h-full overflow-hidden rounded-md border border-border bg-card"
                  />
                )}
              </Fragment>
            ))}
          </div>
        </section>
      )}

      {relatedVideos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No related videos yet. Check back later!
        </p>
      )}
    </div>
  );
}
