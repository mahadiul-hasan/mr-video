import Link from "next/link";

type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  _count: {
    videos: number;
  };
};

export function TaxonomyList({
  title,
  description,
  items,
  basePath,
}: {
  title: string;
  description: string;
  items: TaxonomyItem[];
  basePath: string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`${basePath}/${item.slug}`}
            className="rounded-md border border-border bg-card p-4 transition hover:border-foreground/30 hover:bg-accent/40"
          >
            <p className="font-semibold">{item.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item._count.videos} videos
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
