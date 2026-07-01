import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-linear-to-b from-background to-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-lg font-bold text-foreground">VVideos</p>
          <p className="max-w-xs leading-6">
            Stream fresh videos with fast HLS playback, clean discovery, and a
            lightweight viewing experience.
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-semibold text-foreground">Browse</p>
          <div className="flex flex-col gap-2">
            <Link href="/" className="hover:text-foreground">
              Latest videos
            </Link>
            <Link href="/categories" className="hover:text-foreground">
              Categories
            </Link>
            <Link href="/tags" className="hover:text-foreground">
              Tags
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold text-foreground">Discover</p>
          <div className="flex flex-col gap-2">
            <Link href="/search" className="hover:text-foreground">
              Search
            </Link>
            <Link href="/categories" className="hover:text-foreground">
              Popular categories
            </Link>
            <Link href="/tags" className="hover:text-foreground">
              Trending tags
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold text-foreground">Platform</p>
          <p className="leading-6">
            Powered by adaptive video delivery, CDN caching, and optimized
            playback for mobile and desktop.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl border-t border-border/70 px-4 py-4">
        <p className="mx-auto max-w-7xl text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} VVideos. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
