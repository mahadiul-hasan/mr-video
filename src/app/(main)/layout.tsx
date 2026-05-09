import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { AdProvider } from "@/components/providers/ad-provider";
import { AdOverlay } from "@/components/video/ad-overlay";
import { getPublicCategories, getPublicTags } from "@/lib/videos/public-videos";
import { getPublicAdsConfig } from "@/lib/ads/public-ads";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, tags, { ads, settings }] = await Promise.all([
    getPublicCategories({ limit: 8 }),
    getPublicTags({ limit: 8 }),
    getPublicAdsConfig(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AdProvider ads={ads} settings={settings}>
        <SiteHeader categories={categories} tags={tags} />
        {children}
        <SiteFooter />
        <AdOverlay />
      </AdProvider>
    </div>
  );
}
