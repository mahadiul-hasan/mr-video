// app/admin/dashboard/page.tsx
import { Suspense } from "react";
import { requireAdmin } from "@/lib/requireAdmin";
import { SystemMetricsCard } from "@/components/admin/dashboard/system-metrics-card";
import { CacheStatsCard } from "@/components/admin/dashboard/cache-stats-card";

export default async function AdminDashboardPage() {
  // Verify admin access on the server
  await requireAdmin();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <Suspense fallback={<div>Loading system metrics...</div>}>
        <SystemMetricsCard />
      </Suspense>

      <Suspense fallback={<div>Loading cache statistics...</div>}>
        <CacheStatsCard />
      </Suspense>
    </div>
  );
}
