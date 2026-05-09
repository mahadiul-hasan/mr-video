"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import {
  getCacheStats,
  clearAllCache,
  invalidateCachePattern,
} from "@/lib/cache/cache-utils";
import { revalidatePath } from "next/cache";
import { redis } from "@/lib/redis";
import prisma from "@/lib/prisma";

export interface CacheStats {
  // Changed from CacheStatsData to CacheStats
  totalKeys: number;
  memory: string;
  hitRate: string;
  publicKeys: number;
  rateLimitKeys: number;
  adminKeys: number;
  uptime: string;
  connectedClients: number;
  totalCommands: string;
}

export async function getCacheStatistics(): Promise<{
  success: boolean;
  data?: CacheStats;
  error?: string;
}> {
  try {
    await requireAdmin();

    const cacheStats = await getCacheStats();

    const redisInfo = await redis.info();
    const memoryInfo = await redis.info("memory");
    const statsInfo = await redis.info("stats");

    const publicKeys = await redis.keys("public:*");
    const rateLimitKeys = await redis.keys("ratelimit:*");
    const adminKeys = await redis.keys("admin:*");

    return {
      success: true,
      data: {
        totalKeys: cacheStats.totalKeys,
        memory: cacheStats.memory,
        hitRate: cacheStats.hitRate,
        publicKeys: publicKeys.length,
        rateLimitKeys: rateLimitKeys.length,
        adminKeys: adminKeys.length,
        uptime: redisInfo.match(/uptime_in_seconds:(\d+)/)?.[1] || "0",
        connectedClients: parseInt(
          redisInfo.match(/connected_clients:(\d+)/)?.[1] || "0",
        ),
        totalCommands:
          statsInfo.match(/total_commands_processed:(\d+)/)?.[1] || "0",
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch cache statistics" };
  }
}

export async function clearCache(
  type: "all" | "public" | "rate-limit" | "admin" | "search",
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await requireAdmin();

    switch (type) {
      case "all":
        await clearAllCache();
        break;
      case "public":
        await invalidateCachePattern("public:*");
        break;
      case "rate-limit":
        await invalidateCachePattern("ratelimit:*");
        break;
      case "admin":
        await invalidateCachePattern("admin:*");
        break;
      case "search":
        await invalidateCachePattern("public:search:*");
        break;
    }

    // Revalidate paths to refresh Next.js cache
    revalidatePath("/");
    revalidatePath("/categories");
    revalidatePath("/tags");
    revalidatePath("/admin/dashboard");

    return { success: true, message: `${type} cache cleared successfully` };
  } catch (error) {
    return { success: false, error: "Failed to clear cache" };
  }
}

export async function getSystemMetrics() {
  try {
    await requireAdmin();

    const [totalVideos, publishedVideos, categories, tags] = await Promise.all([
      prisma.video.count(),
      prisma.video.count({ where: { isPublished: true } }),
      prisma.category.count(),
      prisma.tag.count(),
    ]);

    const cacheStats = await getCacheStats();

    return {
      success: true,
      data: {
        database: {
          videos: totalVideos,
          categories,
          tags,
          publishedVideos,
        },
        cache: {
          hitRate: cacheStats.hitRate,
          memory: cacheStats.memory,
          keys: cacheStats.totalKeys,
        },
        performance: {
          avgResponseTime: 0,
          cacheHitRate: parseFloat(cacheStats.hitRate) || 0,
        },
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch system metrics" };
  }
}
