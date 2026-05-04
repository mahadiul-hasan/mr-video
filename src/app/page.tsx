import { loadMoreHomeVideos } from "@/app/actions/public-video";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import { AdSlot } from "@/components/video/ad-slot";
import { findPlacementAd, getPublicAdsConfig } from "@/lib/ads/public-ads";
import {
  getPublicCategories,
  getPublicTags,
  getPublicVideos,
} from "@/lib/videos/public-videos";

export const revalidate = 3600;

export default async function Home() {
  const [{ ads, settings }, videos, categories, tags] = await Promise.all([
    getPublicAdsConfig(),
    getPublicVideos({ limit: 12 }),
    getPublicCategories({ limit: 8 }),
    getPublicTags({ limit: 8 }),
  ]);

  const headerAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", "header")
    : null;
  const sidebarAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", "sidebar")
    : null;
  const footerAd = settings.bannerEnabled
    ? findPlacementAd(ads, "BANNER", "footer")
    : null;
  const nativeAd = settings.nativeEnabled
    ? findPlacementAd(ads, "NATIVE_BANNER", "grid_native_every_6")
    : null;

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader categories={categories} tags={tags} />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-5">
        <AdSlot type="BANNER" label="Header banner" ad={headerAd} />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Latest videos
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fresh published uploads from your library.
              </p>
            </div>

            <VideoGridLoadMore
              initialVideos={videos}
              loadMore={loadMoreHomeVideos}
              nativeAd={nativeAd}
            />
          </div>

          <aside className="space-y-4">
            <AdSlot
              type="BANNER"
              label="Sidebar banner"
              ad={sidebarAd}
              compact
            />
            <AdSlot
              type="NATIVE_BANNER"
              label="Native recommendation"
              ad={nativeAd}
            />
          </aside>
        </section>

        <AdSlot type="BANNER" label="Footer banner" ad={footerAd} />
      </div>

      <SiteFooter />
    </main>
  );
}
