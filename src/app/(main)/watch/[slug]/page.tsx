// app/(main)/watch/[slug]/page.tsx
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/video/video-player";
import { VideoCard } from "@/components/video/video-card";
import { AdSlot } from "@/components/video/ad-slot";
import {
  getPublicVideoBySlug,
  getRelatedPublicVideos,
} from "@/lib/videos/public-videos";
import { getPublicAdsConfig, findPlacementAd } from "@/lib/ads/public-ads";
import { AD_PLACEMENTS } from "@/lib/ads/ad-placements";

export const revalidate = 3600;

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const video = await getPublicVideoBySlug(slug);

  if (!video) notFound();

  const [{ ads, settings }, relatedVideos] = await Promise.all([
    getPublicAdsConfig(),
    getRelatedPublicVideos({
      slug: video.slug,
      category: video.category,
      limit: 8,
    }),
  ]);

  const belowPlayerAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", AD_PLACEMENTS.VIDEO_BOTTOM)
    : null;
  const sidebarAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", AD_PLACEMENTS.SIDEBAR)
    : null;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-4">
        <VideoPlayer video={video} />

        {belowPlayerAd && (
          <AdSlot
            placement={AD_PLACEMENTS.VIDEO_BOTTOM}
            type="BANNER"
            label="Advertisement"
          />
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{video.category}</span>
            <span>{video.views} views</span>
            <span>{video.duration}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {video.description}
          </p>
        </div>

        {relatedVideos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Related videos</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {relatedVideos.slice(0, 3).map((related) => (
                <VideoCard key={related.id} video={related} />
              ))}
            </div>
          </section>
        )}
      </section>

      <aside className="space-y-4">
        {sidebarAd && (
          <AdSlot
            placement={AD_PLACEMENTS.SIDEBAR}
            type="BANNER"
            label="Advertisement"
            compact
          />
        )}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Up next</h2>
          {relatedVideos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No related videos yet.
            </p>
          )}
          {relatedVideos.map((related, index) => (
            <div key={related.id} className="space-y-3">
              <VideoCard video={related} />
              {(index + 1) % 3 === 0 && (
                <AdSlot
                  placement={AD_PLACEMENTS.VIDEO_RELATED_LIST}
                  type="NATIVE_BANNER"
                  compact
                />
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
