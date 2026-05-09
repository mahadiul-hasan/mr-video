"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSystemMetrics } from "@/app/actions/cache";
import { Activity, Video, Hash, TrendingUp, Database, Zap } from "lucide-react";

export function MonitorPanel() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      const result = await getSystemMetrics();
      if (result.success && result.data) {
        setMetrics(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Monitor</CardTitle>
          <CardDescription>Loading system metrics...</CardDescription>
        </CardHeader>
        <CardContent className="h-32 animate-pulse bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Monitor
        </CardTitle>
        <CardDescription>
          Real-time system health and performance metrics
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Video className="h-4 w-4" />
              Total Videos
            </div>
            <div className="text-2xl font-bold">
              {metrics?.database?.videos || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Published: {metrics?.database?.publishedVideos || 0}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              Categories & Tags
            </div>
            <div className="text-2xl font-bold">
              {metrics?.database?.categories || 0} /{" "}
              {metrics?.database?.tags || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Categories / Tags
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              Cache Performance
            </div>
            <div className="text-2xl font-bold">
              {metrics?.cache?.hitRate || "0%"}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics?.cache?.keys || 0} keys | {metrics?.cache?.memory || "0"}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              Cache Efficiency
            </div>
            <div className="text-2xl font-bold">
              {metrics?.performance?.cacheHitRate || 0}%
            </div>
            <div className="text-xs text-muted-foreground">
              Estimated hit rate
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
