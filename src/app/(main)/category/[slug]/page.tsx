import { notFound } from "next/navigation";
import { loadMoreCategoryVideos } from "@/app/actions/public-video";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import { getPublicVideosByCategory } from "@/lib/videos/public-videos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const revalidate = 3600;

// Empty state component
function EmptyState() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No videos found</AlertTitle>
        <AlertDescription>
          There are no videos available in this category yet. Please check back
          later.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default async function CategoryVideosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const result = await getPublicVideosByCategory({ slug, limit: 12 });

  if (!result || !result.category) {
    notFound();
  }

  if (!result.videos || result.videos.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <VideoGridLoadMore
        initialVideos={result.videos}
        loadMore={loadMoreCategoryVideos.bind(null, slug)}
      />
    </div>
  );
}
