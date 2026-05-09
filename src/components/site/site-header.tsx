"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, X, ChevronDown } from "lucide-react";
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (headerRef.current?.contains(target)) return;

      setMenuOpen(false);
      setMobileSearchOpen(false);
      setOpenDropdown(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setMenuOpen(false);
    setMobileSearchOpen(false);
    setOpenDropdown(null);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function handleNavClick() {
    setMenuOpen(false);
    setOpenDropdown(null);
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link
          href="/"
          className="shrink-0 text-lg font-extrabold tracking-tight"
          onClick={handleNavClick}
        >
          MR Video
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 lg:flex">
          <DesktopDropdown
            label="Categories"
            allHref="/categories"
            items={categories}
            basePath="/category"
          />
          <DesktopDropdown
            label="Tags"
            allHref="/tags"
            items={tags}
            basePath="/tag"
          />
        </nav>

        {/* Desktop Search */}
        <form
          onSubmit={handleSearch}
          className="ml-auto hidden min-w-72 max-w-md flex-1 md:block"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos..."
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-foreground/40"
            />
          </div>
        </form>

        {/* Mobile Search Button */}
        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-border md:hidden cursor-pointer"
          onClick={() => {
            setMobileSearchOpen((open) => !open);
            setMenuOpen(false);
            setOpenDropdown(null);
          }}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        <ModeToggle />

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border lg:hidden cursor-pointer"
          onClick={() => {
            setMenuOpen((open) => !open);
            setMobileSearchOpen(false);
            setOpenDropdown(null);
          }}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Search */}
      {mobileSearchOpen && (
        <form
          onSubmit={handleSearch}
          className="border-t border-border px-4 py-3 md:hidden"
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos..."
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
          />
        </form>
      )}

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-border px-4 py-4 lg:hidden">
          <div className="space-y-4">
            {/* Mobile Categories Dropdown */}
            <MobileDropdown
              title="Categories"
              allHref="/categories"
              items={categories}
              basePath="/category"
              isOpen={openDropdown === "categories"}
              onToggle={() =>
                setOpenDropdown(
                  openDropdown === "categories" ? null : "categories",
                )
              }
              onNavigate={handleNavClick}
            />

            {/* Mobile Tags Dropdown */}
            <MobileDropdown
              title="Tags"
              allHref="/tags"
              items={tags}
              basePath="/tag"
              isOpen={openDropdown === "tags"}
              onToggle={() =>
                setOpenDropdown(openDropdown === "tags" ? null : "tags")
              }
              onNavigate={handleNavClick}
            />
          </div>
        </div>
      )}
    </header>
  );
}

// Desktop Dropdown Component
function DesktopDropdown({
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
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  function handleMouseEnter() {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-accent cursor-pointer"
      >
        {label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && items.length > 0 && (
        <div className="absolute left-0 top-full w-64 rounded-md border border-border bg-popover p-2 shadow-xl">
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
            className="mt-1 block rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            Show all {label.toLowerCase()} →
          </Link>
        </div>
      )}
    </div>
  );
}

// Mobile Dropdown Component
function MobileDropdown({
  title,
  allHref,
  items,
  basePath,
  isOpen,
  onToggle,
  onNavigate,
}: {
  title: string;
  allHref: string;
  items: NavItem[];
  basePath: string;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-semibold hover:bg-accent"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="ml-4 space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/${item.slug}`}
              className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
              onClick={onNavigate}
            >
              {item.name}
            </Link>
          ))}
          <Link
            href={allHref}
            className="block rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            onClick={onNavigate}
          >
            Show all {title.toLowerCase()} →
          </Link>
        </div>
      )}
    </div>
  );
}
