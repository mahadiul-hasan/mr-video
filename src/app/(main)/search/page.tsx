import { searchPublicVideos } from "@/lib/videos/public-videos";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import { loadMoreSearchVideos } from "@/app/actions/public-video";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search } from "lucide-react";

export const revalidate = 3600;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";

  const videos = await searchPublicVideos({ query, limit: 12 });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {query
            ? `Results for "${query}"`
            : "Enter a search term in the search box above."}
        </p>
      </div>

      {query && (!videos || videos.length === 0) ? (
        <Alert>
          <Search className="h-4 w-4" />
          <AlertTitle>No results found</AlertTitle>
          <AlertDescription>
            No videos matched your search term "{query}". Please try a different
            search term.
          </AlertDescription>
        </Alert>
      ) : (
        <VideoGridLoadMore
          key={query} // Force re-mount when query changes
          initialVideos={videos || []}
          loadMore={loadMoreSearchVideos.bind(null, query)}
        />
      )}
    </div>
  );
}
