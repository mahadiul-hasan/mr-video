// app/(main)/watch/[slug]/page.tsx
import { notFound } from "next/navigation";
import { VideoPlayerWithAds } from "@/components/video/video-player-with-ads";
import { VideoViewTracker } from "@/components/video/video-view-tracker";
import { VideoCard } from "@/components/video/video-card";
import { AdSlot } from "@/components/video/ad-slot";
import {
  getPublicVideoBySlug,
  getRelatedPublicVideos,
} from "@/lib/videos/public-videos";
import { getPublicAdsConfig, findPlacementAd } from "@/lib/ads/public-ads";
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

  // Fetch ads and related videos in parallel
  const [{ ads, settings }, relatedVideos] = await Promise.all([
    getPublicAdsConfig(),
    getRelatedPublicVideos({
      slug: video.slug,
      category: video.category,
      limit: 12,
    }),
  ]);

  // Find placements for ads
  const belowPlayerAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", AD_PLACEMENTS.VIDEO_BOTTOM)
    : null;

  const sidebarAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", AD_PLACEMENTS.SIDEBAR)
    : null;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <VideoViewTracker slug={video.slug} />
      {/* Main Content */}
      <section className="space-y-4">
        {/* Video Player with Ads */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <VideoPlayerWithAds
            src={video.hlsUrl}
            poster={video.poster}
            videoId={video.id}
            title={video.title}
          />
        </div>

        {/* Below Player Ad */}
        {belowPlayerAd && (
          <AdSlot
            ad={belowPlayerAd}
            placement={AD_PLACEMENTS.VIDEO_BOTTOM}
            type="BANNER"
            label="Advertisement"
          />
        )}

        {/* Video Info */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {video.category}
            </span>
            <span>•</span>
            <span>{video.views}</span>
            <span>•</span>
            <span>{video.duration}</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {video.title}
          </h1>
        </div>

        {/* Related Videos Section (Mobile/Tablet) */}
        {relatedVideos.length > 0 && (
          <section className="space-y-3 lg:hidden">
            <h2 className="text-lg font-semibold">Related videos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedVideos.slice(0, 4).map((related) => (
                <VideoCard key={related.id} video={related} />
              ))}
            </div>
          </section>
        )}
      </section>

      {/* Sidebar - Up Next */}
      <aside className="space-y-4">
        {/* Sidebar Ad */}
        {sidebarAd && (
          <AdSlot
            ad={sidebarAd}
            placement={AD_PLACEMENTS.SIDEBAR}
            type="BANNER"
            label="Advertisement"
            compact
          />
        )}

        {/* Up Next Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Up next</h2>
            <span className="text-xs text-muted-foreground">
              {relatedVideos.length} videos
            </span>
          </div>

          {relatedVideos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No related videos yet. Check back later!
            </p>
          )}

          <div className="space-y-4">
            {relatedVideos.map((related, index) => (
              <div key={related.id}>
                <VideoCard video={related} layout="horizontal" />

                {/* Insert native ad after every 3rd video */}
                {(index + 1) % 3 === 0 &&
                  index + 1 !== relatedVideos.length && (
                    <div className="mt-4 pt-2 border-t border-border">
                      <AdSlot
                        placement={AD_PLACEMENTS.VIDEO_RELATED_LIST}
                        type="NATIVE_BANNER"
                        compact
                      />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
