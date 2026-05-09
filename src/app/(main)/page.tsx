import { loadMoreHomeVideos } from "@/app/actions/public-video";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import { AdSlot } from "@/components/video/ad-slot";
import { getPublicVideos } from "@/lib/videos/public-videos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoIcon } from "lucide-react";
import { AdsInitializer } from "@/components/site/ads-initializer";
import { AD_PLACEMENTS } from "@/lib/ads/ad-placements";

// Don't import getPublicAdsConfig here - it's already in layout

export const revalidate = 3600;

export default async function Home() {
  // Only fetch videos - ads come from layout via AdProvider
  const videos = await getPublicVideos({ limit: 12 });

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
      <AdsInitializer />

      <AdSlot
        placement={AD_PLACEMENTS.HEADER}
        type="BANNER"
        label="Advertisement"
      />

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
          />
        </div>

        <aside className="space-y-4">
          <AdSlot
            placement={AD_PLACEMENTS.SIDEBAR}
            type="BANNER"
            label="Sidebar Ad"
            compact
          />
          <AdSlot
            placement={AD_PLACEMENTS.SIDEBAR}
            type="NATIVE_BANNER"
            label="Recommended"
            compact
          />
        </aside>
      </section>

      <AdSlot
        placement={AD_PLACEMENTS.FOOTER}
        type="BANNER"
        label="Footer Ad"
      />
    </div>
  );
}
