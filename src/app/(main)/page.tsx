import { loadMoreHomeVideos } from "@/app/actions/public-video";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import { AdSlot } from "@/components/video/ad-slot";
import { findPlacementAd, getPublicAdsConfig } from "@/lib/ads/public-ads";
import { getPublicVideos } from "@/lib/videos/public-videos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoIcon } from "lucide-react";

export const revalidate = 3600;

export default async function Home() {
  const [{ ads, settings }, videos] = await Promise.all([
    getPublicAdsConfig(),
    getPublicVideos({ limit: 12 }),
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

  if (!videos || videos.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-5">
        <Alert>
          <VideoIcon className="h-4 w-4" />
          <AlertTitle>No videos found</AlertTitle>
          <AlertDescription>
            There are no videos available at the moment. Please check back
            later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5">
      <AdSlot type="BANNER" label="Header banner" ad={headerAd} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Latest videos</h1>
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
          <AdSlot type="BANNER" label="Sidebar banner" ad={sidebarAd} compact />
          <AdSlot
            type="NATIVE_BANNER"
            label="Native recommendation"
            ad={nativeAd}
          />
        </aside>
      </section>

      <AdSlot type="BANNER" label="Footer banner" ad={footerAd} />
    </div>
  );
}
