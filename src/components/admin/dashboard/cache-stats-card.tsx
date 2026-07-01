// app/admin/dashboard/components/cache-stats-card.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  clearCache,
  getCacheKeyDetails,
  getCacheStatistics,
  getCacheTTLDistribution,
} from "@/app/actions/cache";

type CacheStats = {
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
};

type TtlDistribution = {
  short: number;
  medium: number;
  long: number;
  veryLong: number;
  permanent: number;
};

type CacheKeyDetail = {
  key: string;
  type: string;
  ttl: number;
  size: number;
};

type CacheKeyDetails = {
  total: number;
  showing: number;
  keys: CacheKeyDetail[];
};

type ClearType =
  | "all"
  | "public"
  | "rate-limit"
  | "admin"
  | "search"
  | "categories"
  | "tags"
  | "videos"
  | "ads";

const CLEAR_ACTIONS: { type: ClearType; label: string; variant?: "outline" | "destructive" }[] = [
  { type: "public", label: "Public" },
  { type: "admin", label: "Admin" },
  { type: "search", label: "Search" },
  { type: "categories", label: "Categories" },
  { type: "tags", label: "Tags" },
  { type: "videos", label: "Videos" },
  { type: "ads", label: "Ads" },
  { type: "all", label: "All App Cache", variant: "destructive" },
];

export function CacheStatsCard() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [ttlDistribution, setTtlDistribution] = useState<TtlDistribution | null>(null);
  const [keyDetails, setKeyDetails] = useState<CacheKeyDetails | null>(null);
  const [keySearch, setKeySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<ClearType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ttlTotal = useMemo(() => {
    if (!ttlDistribution) return 0;
    return Object.values(ttlDistribution).reduce((sum, value) => sum + value, 0);
  }, [ttlDistribution]);

  const loadData = useCallback(async (pattern = keySearch) => {
    setError(null);
    try {
      const [statsResult, ttlResult, detailsResult] = await Promise.all([
        getCacheStatistics(),
        getCacheTTLDistribution(),
        getCacheKeyDetails(pattern.trim() || undefined),
      ]);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else if (statsResult.error) {
        setError(statsResult.error);
      }

      if (ttlResult.success && ttlResult.data) {
        setTtlDistribution(ttlResult.data);
      }

      if (detailsResult.success && detailsResult.data) {
        setKeyDetails(detailsResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cache data");
    } finally {
      setLoading(false);
    }
  }, [keySearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  function refresh(pattern = keySearch) {
    startTransition(() => {
      void loadData(pattern);
    });
  }

  async function handleClearCache(type: ClearType) {
    const confirmed = window.confirm(
      type === "all"
        ? "Clear all public/admin app cache? Queue and worker keys will be preserved."
        : `Clear ${type} cache?`,
    );
    if (!confirmed) return;

    setClearing(type);
    setError(null);
    try {
      const result = await clearCache(type);
      if (!result.success) {
        setError(result.error || "Failed to clear cache");
        return;
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear cache");
    } finally {
      setClearing(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            Loading cache statistics...
          </div>
        </CardContent>
      </Card>
    );
  }

  const namespaceTotal =
    (stats?.publicKeys ?? 0) + (stats?.adminKeys ?? 0) + (stats?.rateLimitKeys ?? 0);
  const otherKeys = Math.max((stats?.totalKeys ?? 0) - namespaceTotal, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Cache Management</CardTitle>
            <CardDescription>
              Redis health, key visibility, TTL distribution, and safe cache clearing
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={(stats?.hitRatePercent ?? 0) >= 70 ? "secondary" : "destructive"}>
              Hit rate {stats?.hitRate ?? "0%"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => refresh()} disabled={isPending}>
              {isPending ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric label="Total Keys" value={stats?.totalKeys ?? 0} />
          <Metric label="Memory" value={stats?.memoryUsage || stats?.memory || "0"} />
          <Metric label="Clients" value={stats?.connectedClients ?? 0} />
          <Metric label="Redis Uptime" value={stats?.uptime || "0"} />
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Hit Rate</h3>
              <p className="text-sm text-muted-foreground">
                Higher means more requests are served from Redis instead of Postgres.
              </p>
            </div>
            <span className="text-2xl font-bold">{stats?.hitRate ?? "0%"}</span>
          </div>
          <Progress value={stats?.hitRatePercent ?? 0} className="h-2" />
        </div>

        <Tabs defaultValue="breakdown" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="ttl">TTL</TabsTrigger>
            <TabsTrigger value="keys">Keys</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-3">
            <NamespaceRow label="Public Cache" count={stats?.publicKeys ?? 0} total={stats?.totalKeys ?? 0} />
            <NamespaceRow label="Admin Cache" count={stats?.adminKeys ?? 0} total={stats?.totalKeys ?? 0} />
            <NamespaceRow label="Rate Limit Keys" count={stats?.rateLimitKeys ?? 0} total={stats?.totalKeys ?? 0} />
            <NamespaceRow label="Other Redis Keys" count={otherKeys} total={stats?.totalKeys ?? 0} />
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Clear cache does not remove video queue, worker heartbeat, or Redis persistence data.
            </div>
          </TabsContent>

          <TabsContent value="ttl" className="space-y-3">
            {ttlDistribution && (
              <>
                <TtlRow label="Short" detail="0-5 min" count={ttlDistribution.short} total={ttlTotal} />
                <TtlRow label="Medium" detail="5-60 min" count={ttlDistribution.medium} total={ttlTotal} />
                <TtlRow label="Long" detail="1-24 hours" count={ttlDistribution.long} total={ttlTotal} />
                <TtlRow label="Very Long" detail="Over 24 hours" count={ttlDistribution.veryLong} total={ttlTotal} />
                <TtlRow label="Permanent" detail="No expiry" count={ttlDistribution.permanent} total={ttlTotal} />
              </>
            )}
          </TabsContent>

          <TabsContent value="keys" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={keySearch}
                onChange={(event) => setKeySearch(event.target.value)}
                placeholder="Filter keys, e.g. public:videos or admin:"
              />
              <Button variant="outline" onClick={() => refresh(keySearch)} disabled={isPending}>
                Search
              </Button>
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3 text-sm">
                <span className="font-medium">Sampled Keys</span>
                <span className="text-muted-foreground">
                  Showing {keyDetails?.showing ?? 0} of {keyDetails?.total ?? 0}
                </span>
              </div>
              <div className="max-h-72 overflow-auto">
                {(keyDetails?.keys.length ?? 0) === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No keys found.</div>
                ) : (
                  keyDetails?.keys.map((item) => (
                    <div key={item.key} className="grid gap-2 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1fr_90px_90px_90px]">
                      <code className="break-all text-xs">{item.key}</code>
                      <span>{item.type}</span>
                      <span>TTL {formatTtl(item.ttl)}</span>
                      <span>{formatBytes(item.size)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {CLEAR_ACTIONS.map((action) => (
                <Button
                  key={action.type}
                  size="sm"
                  variant={action.variant ?? "outline"}
                  onClick={() => void handleClearCache(action.type)}
                  disabled={clearing === action.type}
                >
                  {clearing === action.type ? "Clearing..." : `Clear ${action.label}`}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Use targeted clearing first. Clear all only removes public/admin app cache, not queue or rate-limit keys.
            </p>
          </TabsContent>
        </Tabs>

        <div className="grid gap-3 border-t pt-4 text-sm text-muted-foreground sm:grid-cols-3">
          <Info label="Total Commands" value={stats?.totalCommands || "0"} />
          <Info label="Redis Memory" value={stats?.memoryUsage || "0"} />
          <Info label="Connected Clients" value={stats?.connectedClients ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function NamespaceRow({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}

function TtlRow({ label, detail, count, total }: { label: string; detail: string; count: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-muted/50 p-3">
      <span>{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function formatTtl(ttl: number) {
  if (ttl === -1) return "never";
  if (ttl === -2) return "expired";
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.round(ttl / 60)}m`;
  if (ttl < 86400) return `${Math.round(ttl / 3600)}h`;
  return `${Math.round(ttl / 86400)}d`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
