import { Skeleton } from "@/components/ui/skeleton";

interface LoadingGridProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  showHeader?: boolean;
}

export function LoadingGrid({
  count = 8,
  columns = 4,
  showHeader = true,
}: LoadingGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="space-y-6">
        {showHeader && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        )}

        <div className={`grid gap-4 ${gridCols[columns]}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
