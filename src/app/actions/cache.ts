// app/actions/cache.ts
"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import {
  getCacheStats,
  clearAllCache,
  invalidateCachePattern,
  CACHE_PATTERNS,
  scanKeys,
} from "@/lib/cache/cache-utils";
import { revalidatePath } from "next/cache";
import { redis } from "@/lib/redis";
import prisma from "@/lib/prisma";
import { getVideoQueueMetrics } from "@/lib/video-processing/queue";

export interface CacheStatsData {
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

export interface SystemMetricsData {
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
    publicKeys: number;
    adminKeys: number;
    rateLimitKeys: number;
  };
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    uptime: string;
    connectedClients: number;
    totalCommands: string;
  };
}

export async function getVideoQueueStatus(): Promise<{
  success: boolean;
  data?: {
    queuedJobs: number;
    processingJobs: number;
    processingVideos: number;
    readyVideos: number;
    failedVideos: number;
    workerLastSeenAt: string | null;
    workerIsHealthy: boolean;
    recentFailures: {
      id: string;
      title: string;
      slug: string;
      processingError: string | null;
      updatedAt: string;
    }[];
  };
  error?: string;
}> {
  try {
    await requireAdmin();

    const [
      queueMetrics,
      processingVideos,
      readyVideos,
      failedVideos,
      workerLastSeenAt,
      recentFailures,
    ] = await Promise.all([
      getVideoQueueMetrics(),
      prisma.video.count({ where: { status: "PROCESSING" } }),
      prisma.video.count({ where: { status: "READY" } }),
      prisma.video.count({ where: { status: "FAILED" } }),
      redis.get("queue:video:worker:heartbeat"),
      prisma.video.findMany({
        where: { status: "FAILED" },
        select: {
          id: true,
          title: true,
          slug: true,
          processingError: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const workerLastSeenMs = workerLastSeenAt
      ? new Date(workerLastSeenAt).getTime()
      : 0;
    const workerIsHealthy =
      workerLastSeenMs > 0 && Date.now() - workerLastSeenMs < 30000;

    return {
      success: true,
      data: {
        queuedJobs: queueMetrics.queuedJobs,
        processingJobs: queueMetrics.processingJobs,
        processingVideos,
        readyVideos,
        failedVideos,
        workerLastSeenAt,
        workerIsHealthy,
        recentFailures: recentFailures.map((video) => ({
          ...video,
          updatedAt: video.updatedAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to read queue status",
    };
  }
}
export async function getCacheStatistics(): Promise<{
  success: boolean;
  data?: CacheStatsData;
  error?: string;
}> {
  try {
    await requireAdmin();

    if (!redis || typeof redis.info !== "function") {
      return {
        success: false,
        error: "Redis is not available or not configured",
      };
    }

    const cacheStats = await getCacheStats();
    const [redisInfo, memoryInfo, statsInfo] = await Promise.all([
      redis.info(),
      redis.info("memory"),
      redis.info("stats"),
    ]);

    const [publicKeys, rateLimitKeys, adminKeys] = await Promise.all([
      scanKeys("public:*"),
      scanKeys("ratelimit:*"),
      scanKeys("admin:*"),
    ]);

    const memoryMatch = memoryInfo.match(/used_memory_human:(\S+)/);
    const memoryUsage = memoryMatch?.[1] || "0";

    const hitRateMatch = cacheStats.hitRate.match(/(\d+(?:\.\d+)?)/);
    const hitRatePercent = hitRateMatch ? parseFloat(hitRateMatch[0]) : 0;

    const uptimeSeconds = parseInt(
      redisInfo.match(/uptime_in_seconds:(\d+)/)?.[1] || "0",
    );
    const uptime = formatUptime(uptimeSeconds);

    return {
      success: true,
      data: {
        totalKeys: cacheStats.totalKeys,
        memory: cacheStats.memory,
        hitRate: cacheStats.hitRate,
        publicKeys: publicKeys.length,
        rateLimitKeys: rateLimitKeys.length,
        adminKeys: adminKeys.length,
        uptime,
        connectedClients: parseInt(
          redisInfo.match(/connected_clients:(\d+)/)?.[1] || "0",
        ),
        totalCommands:
          statsInfo.match(/total_commands_processed:(\d+)/)?.[1] || "0",
        memoryUsage,
        hitRatePercent,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch cache statistics",
    };
  }
}

export async function clearCache(
  type:
    | "all"
    | "public"
    | "rate-limit"
    | "admin"
    | "search"
    | "categories"
    | "tags"
    | "videos"
    | "ads",
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  clearedCount?: number;
}> {
  try {
    await requireAdmin();

    let clearedCount = 0;

    switch (type) {
      case "all":
        await clearAllCache();
        clearedCount = await getTotalKeysCount();
        break;
      case "public":
        clearedCount = await invalidateAndCount("public:*");
        break;
      case "rate-limit":
        clearedCount = await invalidateAndCount("ratelimit:*");
        break;
      case "admin":
        clearedCount = await invalidateAndCount("admin:*");
        break;
      case "search":
        clearedCount = await invalidateAndCount(CACHE_PATTERNS.PUBLIC.SEARCH);
        break;
      case "categories":
        clearedCount = await invalidateAndCount(
          CACHE_PATTERNS.PUBLIC.CATEGORIES,
        );
        clearedCount += await invalidateCachePattern("admin:categories:*");
        break;
      case "tags":
        clearedCount = await invalidateAndCount(CACHE_PATTERNS.PUBLIC.TAGS);
        clearedCount += await invalidateCachePattern("admin:tags:*");
        break;
      case "videos":
        clearedCount = await invalidateAndCount(
          CACHE_PATTERNS.PUBLIC.ALL_VIDEOS,
        );
        clearedCount += await invalidateCachePattern("admin:videos:*");
        break;
      case "ads":
        clearedCount = await invalidateAndCount("public:ads:*");
        clearedCount += await invalidateAndCount("admin:ads:*");
        break;
    }

    const pathsToRevalidate = [
      "/",
      "/categories",
      "/tags",
      "/admin/dashboard",
      "/admin/categories",
      "/admin/tags",
      "/admin/videos",
      "/admin/ads",
    ];

    pathsToRevalidate.forEach((path) => revalidatePath(path));

    const message =
      clearedCount > 0
        ? `${type} cache cleared successfully (${clearedCount} key${clearedCount > 1 ? "s" : ""} removed)`
        : `${type} cache cleared successfully (no keys found)`;

    return { success: true, message, clearedCount };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear cache",
    };
  }
}

async function invalidateAndCount(pattern: string): Promise<number> {
  return invalidateCachePattern(pattern);
}

async function getTotalKeysCount(): Promise<number> {
  try {
    const keys = await scanKeys("*");
    return keys.length;
  } catch {
    return 0;
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

export async function getSystemMetrics(): Promise<{
  success: boolean;
  data?: SystemMetricsData;
  error?: string;
}> {
  try {
    await requireAdmin();

    const [
      totalVideos,
      publishedVideos,
      categories,
      tags,
      totalViews,
      totalAds,
      activeAds,
    ] = await Promise.all([
      prisma.video.count(),
      prisma.video.count({ where: { isPublished: true } }),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.video.aggregate({ _sum: { views: true } }),
      prisma.adUnit.count(),
      prisma.adUnit.count({ where: { isActive: true } }),
    ]);

    const cacheStats = await getCacheStats();

    const [publicKeys, adminKeys, rateLimitKeys] = await Promise.all([
      scanKeys("public:*"),
      scanKeys("admin:*"),
      scanKeys("ratelimit:*"),
    ]);

    const hitRateMatch = cacheStats.hitRate.match(/(\d+(?:\.\d+)?)/);
    const hitRatePercent = hitRateMatch ? parseFloat(hitRateMatch[0]) : 0;

    const redisInfo = await redis.info();
    const uptimeSeconds = parseInt(
      redisInfo.match(/uptime_in_seconds:(\d+)/)?.[1] || "0",
    );
    const uptime = formatUptime(uptimeSeconds);
    const connectedClients = parseInt(
      redisInfo.match(/connected_clients:(\d+)/)?.[1] || "0",
    );
    const totalCommands =
      redisInfo.match(/total_commands_processed:(\d+)/)?.[1] || "0";

    return {
      success: true,
      data: {
        database: {
          videos: totalVideos,
          publishedVideos,
          unpublishedVideos: totalVideos - publishedVideos,
          categories,
          tags,
          totalViews: totalViews._sum.views || 0,
          ads: totalAds,
          activeAds,
        },
        cache: {
          hitRate: cacheStats.hitRate,
          hitRatePercent,
          memory: cacheStats.memory,
          keys: cacheStats.totalKeys,
          publicKeys: publicKeys.length,
          adminKeys: adminKeys.length,
          rateLimitKeys: rateLimitKeys.length,
        },
        performance: {
          avgResponseTime: 0,
          cacheHitRate: hitRatePercent,
          uptime,
          connectedClients,
          totalCommands,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch system metrics",
    };
  }
}

export async function getCacheKeyDetails(pattern?: string) {
  try {
    await requireAdmin();

    const searchPattern = pattern ? `*${pattern}*` : "*";
    const keys = await scanKeys(searchPattern);

    const keyDetails = await Promise.all(
      keys.slice(0, 100).map(async (key) => {
        const type = await redis.type(key);
        const ttl = await redis.ttl(key);
        const size = await redis.memory("USAGE", key).catch(() => 0);
        return { key, type, ttl, size: size || 0 };
      }),
    );

    return {
      success: true,
      data: {
        total: keys.length,
        showing: keyDetails.length,
        keys: keyDetails,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get key details",
    };
  }
}

export async function getCacheTTLDistribution() {
  try {
    await requireAdmin();

    const keys = await scanKeys("*");
    const ttlDistribution = {
      short: 0,
      medium: 0,
      long: 0,
      veryLong: 0,
      permanent: 0,
    };

    for (const key of keys) {
      const ttl = await redis.ttl(key);

      if (ttl === -1) {
        ttlDistribution.permanent++;
      } else if (ttl <= 300) {
        ttlDistribution.short++;
      } else if (ttl <= 3600) {
        ttlDistribution.medium++;
      } else if (ttl <= 86400) {
        ttlDistribution.long++;
      } else {
        ttlDistribution.veryLong++;
      }
    }

    return {
      success: true,
      data: ttlDistribution,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get TTL distribution",
    };
  }
}


