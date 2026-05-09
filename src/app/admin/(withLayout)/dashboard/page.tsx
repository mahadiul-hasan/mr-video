import { Suspense } from "react";
import { requireAdmin } from "@/lib/requireAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { MonitorPanel } from "@/components/admin/dashboard/monitor-panel";
import { CachePanel } from "@/components/admin/dashboard/cache-panel";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          System monitoring and cache management
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <MonitorPanel />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CachePanel />
      </Suspense>
    </div>
  );
}
