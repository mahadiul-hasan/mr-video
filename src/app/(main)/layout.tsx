// app/(main)/layout.tsx or wherever your MainLayout is
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { HeaderBanner } from "@/components/site/header-banner";
import { AdProvider } from "@/components/providers/ad-provider";
import { AdOverlay } from "@/components/video/ad-overlay";
import {
  getPublicCategoriesForHeader,
  getPublicTagsForHeader,
} from "@/lib/videos/public-videos";
import { getPublicAdsConfig } from "@/lib/ads/public-ads";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, tags, { ads, settings }] = await Promise.all([
    getPublicCategoriesForHeader({ limit: 8 }),
    getPublicTagsForHeader({ limit: 8 }),
    getPublicAdsConfig(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AdProvider ads={ads} settings={settings}>
        <SiteHeader categories={categories} tags={tags} />
        <HeaderBanner />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <AdOverlay />
      </AdProvider>
    </div>
  );
}
