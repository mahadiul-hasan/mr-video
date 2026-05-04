"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";

type NavItem = {
  id: string;
  name: string;
  slug: string;
};

export function SiteHeader({
  categories,
  tags,
}: {
  categories: NavItem[];
  tags: NavItem[];
}) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (headerRef.current?.contains(target)) return;

      setMenuOpen(false);
      setMobileSearchOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setMenuOpen(false);
    setMobileSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-extrabold tracking-tight">
          MR Video
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          <Dropdown label="Categories" allHref="/categories" items={categories} basePath="/category" />
          <Dropdown label="Tags" allHref="/tags" items={tags} basePath="/tag" />
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden min-w-72 max-w-md flex-1 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search videos..."
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-foreground/40"
            />
          </div>
        </form>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-border md:hidden"
          onClick={() => {
            setMobileSearchOpen((open) => !open);
            setMenuOpen(false);
          }}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        <ModeToggle />

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border lg:hidden"
          onClick={() => {
            setMenuOpen((open) => !open);
            setMobileSearchOpen(false);
          }}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileSearchOpen && (
        <form onSubmit={handleSearch} className="border-t border-border px-4 py-3 md:hidden">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search videos..."
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
          />
        </form>
      )}

      {menuOpen && (
        <div className="border-t border-border px-4 py-4 lg:hidden">
          <div className="grid gap-4 sm:grid-cols-2">
            <MobileGroup
              title="Categories"
              allHref="/categories"
              items={categories}
              basePath="/category"
              onNavigate={() => setMenuOpen(false)}
            />
            <MobileGroup
              title="Tags"
              allHref="/tags"
              items={tags}
              basePath="/tag"
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
}

function Dropdown({
  label,
  allHref,
  items,
  basePath,
}: {
  label: string;
  allHref: string;
  items: NavItem[];
  basePath: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-accent"
      >
        {label}
      </button>
      <div className="invisible absolute left-0 top-full w-64 rounded-md border border-border bg-popover p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`${basePath}/${item.slug}`}
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            {item.name}
          </Link>
        ))}
        <Link
          href={allHref}
          className="mt-1 block rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-accent"
        >
          Show all
        </Link>
      </div>
    </div>
  );
}

function MobileGroup({
  title,
  allHref,
  items,
  basePath,
  onNavigate,
}: {
  title: string;
  allHref: string;
  items: NavItem[];
  basePath: string;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link
          href={allHref}
          className="text-xs text-muted-foreground"
          onClick={onNavigate}
        >
          Show all
        </Link>
      </div>
      <div className="grid gap-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`${basePath}/${item.slug}`}
            className="rounded-md px-2 py-2 text-sm hover:bg-accent"
            onClick={onNavigate}
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
