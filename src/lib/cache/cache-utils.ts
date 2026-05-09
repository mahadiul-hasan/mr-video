import { redis } from "@/lib/redis";

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Cache tags for Next.js (for revalidateTag)
export const CACHE_TAGS = {
  PUBLIC: {
    ALL_VIDEOS: "public:all-videos",
    CATEGORY_VIDEOS: "public:category-videos",
    TAG_VIDEOS: "public:tag-videos",
    SINGLE_VIDEO: "public:single-video",
    RELATED_VIDEOS: "public:related-videos",
    SEARCH: "public:search",
    CATEGORIES: "public:categories",
    TAGS: "public:tags",
    HOME: "public:home",
  },
  ADMIN: {
    VIDEOS: "admin:videos",
    CATEGORIES: "admin:categories",
    TAGS: "admin:tags",
  },
} as const;

// Generic cache get/set with Redis
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.LONG,
): Promise<T> {
  try {
    // Try to get from Redis
    const cached = await redis.get(key);

    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch (parseError) {
        console.error(
          `Failed to parse cached data for key ${key}:`,
          parseError,
        );
      }
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in Redis (only if data is not null/undefined)
    if (data !== null && data !== undefined) {
      await redis.setex(key, ttl, JSON.stringify(data));
    }

    return data;
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    return fetcher();
  }
}

// Set cache directly
export async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.LONG,
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to set cache for key ${key}:`, error);
  }
}

// Get cache without fallback
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get cache for key ${key}:`, error);
    return null;
  }
}

// Invalidate cache by pattern
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(
        `Invalidated ${keys.length} cache keys matching pattern: ${pattern}`,
      );
    }
  } catch (error) {
    console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
  }
}

// Batch invalidate multiple patterns
export async function invalidateCaches(patterns: string[]): Promise<void> {
  await Promise.all(patterns.map(invalidateCachePattern));
}

// Get cache stats
export async function getCacheStats(): Promise<{
  totalKeys: number;
  memory: string;
  hitRate: string;
}> {
  try {
    const keys = await redis.keys("*");
    const memory = await redis.info("memory");
    const stats = await redis.info("stats");

    const hits = stats.match(/keyspace_hits:(\d+)/)?.[1] || "0";
    const misses = stats.match(/keyspace_misses:(\d+)/)?.[1] || "0";
    const total = parseInt(hits) + parseInt(misses);
    const hitRate =
      total > 0 ? ((parseInt(hits) / total) * 100).toFixed(2) : "0";

    const memoryMatch = memory.match(/used_memory_human:(\S+)/);

    return {
      totalKeys: keys.length,
      memory: memoryMatch?.[1] || "0",
      hitRate: `${hitRate}%`,
    };
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return {
      totalKeys: 0,
      memory: "0",
      hitRate: "0%",
    };
  }
}

// Clear all cache (use with caution)
export async function clearAllCache(): Promise<void> {
  try {
    await redis.flushall();
    console.log("All cache cleared");
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
}
