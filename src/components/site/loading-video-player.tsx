import { Skeleton } from "@/components/ui/skeleton";

export function LoadingVideoPlayer() {
  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Main content skeleton */}
      <section className="space-y-4">
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />

        <div className="space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sidebar skeleton */}
      <aside className="space-y-4">
        <Skeleton className="h-60 w-full rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
