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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Trash2,
  RefreshCw,
  Database,
  Hash,
  HardDrive,
  TrendingUp,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import {
  getCacheStatistics,
  clearCache,
  type CacheStats,
} from "@/app/actions/cache";

export function CachePanel() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await getCacheStatistics();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async (
    type: "all" | "public" | "rate-limit" | "admin" | "search",
  ) => {
    setActionLoading(type);
    setMessage(null);

    const result = await clearCache(type);

    if (result.success) {
      setMessage({
        type: "success",
        text: result.message || "Cache cleared successfully",
      });
      await loadStats();
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to clear cache",
      });
    }

    setActionLoading(null);
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>Loading cache statistics...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 animate-pulse bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Management
            </CardTitle>
            <CardDescription>Monitor and manage Redis cache</CardDescription>
          </div>
          <Button onClick={loadStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {message && (
          <Alert
            variant={message.type === "success" ? "default" : "destructive"}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              Total Keys
            </div>
            <div className="text-2xl font-bold">{stats?.totalKeys || 0}</div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              Memory Usage
            </div>
            <div className="text-2xl font-bold">{stats?.memory || "0"}</div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Hit Rate
            </div>
            <div className="text-2xl font-bold">{stats?.hitRate || "0%"}</div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              Connected Clients
            </div>
            <div className="text-2xl font-bold">
              {stats?.connectedClients || 0}
            </div>
          </div>
        </div>

        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="public">Public Cache</TabsTrigger>
            <TabsTrigger value="rate-limit">Rate Limits</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-3 mt-4">
            <div className="rounded-lg border p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Public Cache Keys:
                  </span>
                  <span className="font-medium">{stats?.publicKeys || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Rate Limit Keys:
                  </span>
                  <span className="font-medium">
                    {stats?.rateLimitKeys || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Admin Cache Keys:
                  </span>
                  <span className="font-medium">{stats?.adminKeys || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span className="font-medium">
                    {Math.floor(parseInt(stats?.uptime || "0") / 86400)} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Commands:</span>
                  <span className="font-medium">
                    {parseInt(stats?.totalCommands || "0").toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="public" className="mt-4">
            <div className="rounded-lg border p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">
                  Public Cache Keys: {stats?.publicKeys || 0}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClearCache("public")}
                  disabled={actionLoading === "public"}
                >
                  {actionLoading === "public" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Contains all public-facing data including videos, categories,
                tags, and search results.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="rate-limit" className="mt-4">
            <div className="rounded-lg border p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">
                  Rate Limit Keys: {stats?.rateLimitKeys || 0}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClearCache("rate-limit")}
                  disabled={actionLoading === "rate-limit"}
                >
                  {actionLoading === "rate-limit" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Contains rate limiting data for all users. Clearing this will
                reset all rate limits.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-3 mt-4">
            <Button
              className="w-full"
              variant="destructive"
              onClick={() => handleClearCache("all")}
              disabled={actionLoading === "all"}
            >
              {actionLoading === "all" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear ALL Cache
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleClearCache("search")}
              disabled={actionLoading === "search"}
            >
              <Search className="h-4 w-4 mr-2" />
              Clear Search Cache Only
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
