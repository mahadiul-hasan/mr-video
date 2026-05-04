import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { AdSlot } from "@/components/video/ad-slot";
import { VideoCard } from "@/components/video/video-card";
import { VideoPlayer } from "@/components/video/video-player";
import { findPlacementAd, getPublicAdsConfig } from "@/lib/ads/public-ads";
import {
  getPublicVideoBySlug,
  getPublicCategories,
  getPublicTags,
  getRelatedPublicVideos,
} from "@/lib/videos/public-videos";

export const revalidate = 3600;

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const video = await getPublicVideoBySlug(slug);

  if (!video) notFound();

  const [{ ads, settings }, relatedVideos, categories, tags] = await Promise.all([
    getPublicAdsConfig(),
    getRelatedPublicVideos({
      slug: video.slug,
      category: video.category,
      limit: 8,
    }),
    getPublicCategories({ limit: 8 }),
    getPublicTags({ limit: 8 }),
  ]);

  const belowPlayerAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", "video_bottom")
    : null;
  const sidebarAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", "sidebar")
    : null;
  const relatedNativeAd = settings.nativeEnabled
    ? findPlacementAd(ads, "NATIVE_BANNER", "video_related_list")
    : null;

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader categories={categories} tags={tags} />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <VideoPlayer video={video} ads={ads} settings={settings} />

          <AdSlot
            type="BANNER"
            label="Below player banner"
            ad={belowPlayerAd}
          />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{video.category}</span>
              <span>{video.views} views</span>
              <span>{video.duration}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {video.title}
            </h1>
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
          <AdSlot
            type="BANNER"
            label="Sidebar banner"
            ad={sidebarAd}
            compact
          />
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
                    type="NATIVE_BANNER"
                    label="Related native placement"
                    ad={relatedNativeAd}
                    compact
                  />
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
