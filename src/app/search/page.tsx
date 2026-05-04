import { loadMoreSearchVideos } from "@/app/actions/public-video";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import {
  getPublicCategories,
  getPublicTags,
  searchPublicVideos,
} from "@/lib/videos/public-videos";

export const revalidate = 3600;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [videos, navCategories, navTags] = await Promise.all([
    searchPublicVideos({ query, limit: 12 }),
    getPublicCategories({ limit: 8 }),
    getPublicTags({ limit: 8 }),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader categories={navCategories} tags={navTags} />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Search</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {query ? `Results for "${query}"` : "Enter a search term from the header."}
          </p>
        </div>
        <VideoGridLoadMore
          initialVideos={videos}
          loadMore={loadMoreSearchVideos.bind(null, query)}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
