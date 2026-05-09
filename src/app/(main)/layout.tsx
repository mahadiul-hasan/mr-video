import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getPublicCategories, getPublicTags } from "@/lib/videos/public-videos";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, tags] = await Promise.all([
    getPublicCategories({ limit: 8 }),
    getPublicTags({ limit: 8 }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader categories={categories} tags={tags} />
      {children}
      <SiteFooter />
    </div>
  );
}
