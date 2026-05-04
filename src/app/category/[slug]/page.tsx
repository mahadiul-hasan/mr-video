import { notFound } from "next/navigation";
import { loadMoreCategoryVideos } from "@/app/actions/public-video";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { VideoGridLoadMore } from "@/components/site/video-grid-load-more";
import {
  getPublicCategories,
  getPublicTags,
  getPublicVideosByCategory,
} from "@/lib/videos/public-videos";

export const revalidate = 3600;

export default async function CategoryVideosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, navCategories, navTags] = await Promise.all([
    getPublicVideosByCategory({ slug, limit: 12 }),
    getPublicCategories({ limit: 8 }),
    getPublicTags({ limit: 8 }),
  ]);

  if (!result) notFound();

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader categories={navCategories} tags={navTags} />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {result.category.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Videos in this category.
          </p>
        </div>
        <VideoGridLoadMore
          initialVideos={result.videos}
          loadMore={loadMoreCategoryVideos.bind(null, slug)}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
