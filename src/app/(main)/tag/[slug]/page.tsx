import { notFound } from "next/navigation";
import { loadMoreTagVideos } from "@/app/actions/public-video";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import { getPublicVideosByTag } from "@/lib/videos/public-videos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Hash } from "lucide-react";

export const revalidate = 3600;

export default async function TagVideosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicVideosByTag({ slug, limit: 12 });

  if (!result || !result.tag) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          #{result.tag.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Videos with this tag.
        </p>
      </div>

      {!result.videos || result.videos.length === 0 ? (
        <Alert>
          <Hash className="h-4 w-4" />
          <AlertTitle>No videos found</AlertTitle>
          <AlertDescription>
            There are no videos with the tag "#{result.tag.name}" at the moment.
            Please check back later.
          </AlertDescription>
        </Alert>
      ) : (
        <VideoGridLoadMore
          initialVideos={result.videos}
          loadMore={loadMoreTagVideos.bind(null, slug)}
        />
      )}
    </div>
  );
}
