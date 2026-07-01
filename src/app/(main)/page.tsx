import { loadMoreHomeVideos } from "@/app/actions/public-video";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import { getPublicVideos } from "@/lib/videos/public-videos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoIcon } from "lucide-react";

// Don't import getPublicAdsConfig here - it's already in layout

export const revalidate = 3600;

export default async function Home() {
  // Only fetch videos - ads come from layout via AdProvider
  const videos = await getPublicVideos({ limit: 12 });

  if (!videos || videos.length === 0) {
    return (
      <div className="min-h-[calc(100vh-134px)] flex items-center justify-center px-4">
        <Alert className="w-full max-w-md mx-auto">
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
      <section>
        <VideoGridLoadMore
          initialVideos={videos}
          loadMore={loadMoreHomeVideos}
        />
      </section>
    </div>
  );
}
