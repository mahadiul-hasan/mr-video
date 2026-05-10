// app/admin/dashboard/components/cache-stats-card.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getCacheStatistics,
  clearCache,
  getCacheTTLDistribution,
} from "@/app/actions/cache";

interface CacheStats {
  totalKeys: number;
  memory: string;
  hitRate: string;
  publicKeys: number;
  rateLimitKeys: number;
  adminKeys: number;
  uptime: string;
  connectedClients: number;
  totalCommands: string;
  memoryUsage: string;
  hitRatePercent: number;
}

export function CacheStatsCard() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [ttlDistribution, setTtlDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsResult, ttlResult] = await Promise.all([
        getCacheStatistics(),
        getCacheTTLDistribution(),
      ]);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
      if (ttlResult.success && ttlResult.data) {
        setTtlDistribution(ttlResult.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  async function handleClearCache(type: string) {
    setClearing(type);
    try {
      const result = await clearCache(type as any);
      if (result.success) {
        alert(result.message);
        await loadData();
      } else {
        alert(result.error || "Failed to clear cache");
      }
    } catch (error) {
      alert("Failed to clear cache");
    } finally {
      setClearing(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading cache statistics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Statistics</CardTitle>
        <CardDescription>Redis cache performance and metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Total Keys</div>
            <div className="text-2xl font-bold">{stats?.totalKeys || 0}</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Hit Rate</div>
            <div className="text-2xl font-bold">{stats?.hitRate || "0%"}</div>
            <Progress value={stats?.hitRatePercent || 0} className="mt-2 h-1" />
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Memory Usage</div>
            <div className="text-2xl font-bold">{stats?.memory || "0"}</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Uptime</div>
            <div className="text-2xl font-bold">{stats?.uptime || "0"}</div>
          </div>
        </div>

        {/* Cache Keys Breakdown */}
        <div className="space-y-2">
          <h3 className="font-semibold">Cache Keys Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span>Public Keys</span>
              <Badge variant="secondary">{stats?.publicKeys || 0}</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span>Admin Keys</span>
              <Badge variant="secondary">{stats?.adminKeys || 0}</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span>Rate Limit Keys</span>
              <Badge variant="secondary">{stats?.rateLimitKeys || 0}</Badge>
            </div>
          </div>
        </div>

        {/* TTL Distribution */}
        {ttlDistribution && (
          <div className="space-y-2">
            <h3 className="font-semibold">TTL Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-xs text-green-600">Short</div>
                <div className="font-bold">{ttlDistribution.short}</div>
                <div className="text-xs">&lt;5min</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-xs text-blue-600">Medium</div>
                <div className="font-bold">{ttlDistribution.medium}</div>
                <div className="text-xs">5-60min</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="text-xs text-yellow-600">Long</div>
                <div className="font-bold">{ttlDistribution.long}</div>
                <div className="text-xs">1-24h</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="text-xs text-orange-600">Very Long</div>
                <div className="font-bold">{ttlDistribution.veryLong}</div>
                <div className="text-xs">&gt;24h</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600">Permanent</div>
                <div className="font-bold">{ttlDistribution.permanent}</div>
                <div className="text-xs">No expiry</div>
              </div>
            </div>
          </div>
        )}

        {/* Clear Cache Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold">Clear Cache</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearCache("public")}
              disabled={clearing === "public"}
            >
              {clearing === "public" ? "Clearing..." : "Clear Public"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearCache("admin")}
              disabled={clearing === "admin"}
            >
              {clearing === "admin" ? "Clearing..." : "Clear Admin"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearCache("search")}
              disabled={clearing === "search"}
            >
              {clearing === "search" ? "Clearing..." : "Clear Search"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearCache("categories")}
              disabled={clearing === "categories"}
            >
              {clearing === "categories" ? "Clearing..." : "Clear Categories"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearCache("tags")}
              disabled={clearing === "tags"}
            >
              {clearing === "tags" ? "Clearing..." : "Clear Tags"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearCache("videos")}
              disabled={clearing === "videos"}
            >
              {clearing === "videos" ? "Clearing..." : "Clear Videos"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearCache("ads")}
              disabled={clearing === "ads"}
            >
              {clearing === "ads" ? "Clearing..." : "Clear Ads"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleClearCache("all")}
              disabled={clearing === "all"}
            >
              {clearing === "all" ? "Clearing..." : "Clear ALL"}
            </Button>
          </div>
        </div>

        {/* Redis Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Connected Clients:</span>
            <span className="font-mono">{stats?.connectedClients || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Commands Processed:</span>
            <span className="font-mono">{stats?.totalCommands || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Memory Usage (Redis):</span>
            <span className="font-mono">{stats?.memoryUsage || "0"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
