import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>MR Video</p>
        <div className="flex gap-4">
          <Link href="/categories" className="hover:text-foreground">
            Categories
          </Link>
          <Link href="/tags" className="hover:text-foreground">
            Tags
          </Link>
          <Link href="/admin/dashboard" className="hover:text-foreground">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
