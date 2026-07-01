// app/admin/dashboard/components/system-metrics-card.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSystemMetrics } from "@/app/actions/cache";
import {
  Video,
  FolderOpen,
  Tag,
  Eye,
  PlayCircle,
  PauseCircle,
  TrendingUp,
} from "lucide-react";

interface SystemMetrics {
  database: {
    videos: number;
    publishedVideos: number;
    unpublishedVideos: number;
    categories: number;
    tags: number;
    totalViews: number;
    ads: number;
    activeAds: number;
  };
  cache: {
    hitRate: string;
    hitRatePercent: number;
    memory: string;
    keys: number;
  };
  performance: {
    uptime: string;
    connectedClients: number;
  };
}

export function SystemMetricsCard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      const result = await getSystemMetrics();
      if (result.success && result.data) {
        setMetrics(result.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMetrics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMetrics]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading system metrics...</div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: "Total Videos",
      value: metrics?.database.videos || 0,
      icon: Video,
      color: "text-blue-500",
    },
    {
      title: "Published Videos",
      value: metrics?.database.publishedVideos || 0,
      icon: PlayCircle,
      color: "text-green-500",
    },
    {
      title: "Unpublished Videos",
      value: metrics?.database.unpublishedVideos || 0,
      icon: PauseCircle,
      color: "text-yellow-500",
    },
    {
      title: "Categories",
      value: metrics?.database.categories || 0,
      icon: FolderOpen,
      color: "text-purple-500",
    },
    {
      title: "Tags",
      value: metrics?.database.tags || 0,
      icon: Tag,
      color: "text-pink-500",
    },
    {
      title: "Total Views",
      value: formatNumber(metrics?.database.totalViews || 0),
      icon: Eye,
      color: "text-indigo-500",
    },
    {
      title: "Active Ads",
      value: metrics?.database.activeAds || 0,
      icon: TrendingUp,
      color: "text-orange-500",
    },
    {
      title: "Total Ads",
      value: metrics?.database.ads || 0,
      icon: TrendingUp,
      color: "text-gray-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Metrics</CardTitle>
        <CardDescription>Database and performance statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.title} className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <div className="text-xs text-muted-foreground">
                  {stat.title}
                </div>
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
            <div className="text-2xl font-bold">
              {metrics?.cache.hitRate || "0%"}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Redis Uptime</div>
            <div className="text-2xl font-bold">
              {metrics?.performance.uptime || "0"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}
