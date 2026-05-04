import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TaxonomyList } from "@/components/site/taxonomy-list";
import {
  getPublicCategories,
  getPublicTags,
} from "@/lib/videos/public-videos";

export const revalidate = 3600;

export default async function CategoriesPage() {
  const [categories, navCategories, navTags] = await Promise.all([
    getPublicCategories(),
    getPublicCategories({ limit: 8 }),
    getPublicTags({ limit: 8 }),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader categories={navCategories} tags={navTags} />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <TaxonomyList
          title="Categories"
          description="Browse videos by category."
          items={categories}
          basePath="/category"
        />
      </div>
      <SiteFooter />
    </main>
  );
}
