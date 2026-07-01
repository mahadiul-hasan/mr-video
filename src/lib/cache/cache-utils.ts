// lib/cache/cache-utils.ts
import { redis } from "@/lib/redis";

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Cache tags for pattern matching
export const CACHE_PATTERNS = {
  PUBLIC: {
    ALL_VIDEOS: "public:videos:*",
    CATEGORY_VIDEOS: "public:category:*",
    TAG_VIDEOS: "public:tag:*",
    SINGLE_VIDEO: "public:single-video:*",
    RELATED_VIDEOS: "public:related:*",
    SEARCH: "public:search:*",
    CATEGORIES: "public:categories:*",
    TAGS: "public:tags:*",
    HOME: "public:home:*",
  },
  ADMIN: {
    VIDEOS: "admin:videos:*",
    CATEGORIES: "admin:categories:*",
    TAGS: "admin:tags:*",
  },
} as const;

// Generic cache get/set with Redis
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.LONG,
): Promise<T> {
  try {
    if (!redis || typeof redis.get !== "function") {
      return await fetcher();
    }

    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {}
    }

    const data = await fetcher();

    if (data !== null && data !== undefined) {
      await redis.setex(key, ttl, JSON.stringify(data));
    }

    return data;
  } catch {
    return await fetcher();
  }
}

// Set cache directly
export async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.LONG,
): Promise<void> {
  try {
    if (redis && typeof redis.setex === "function") {
      await redis.setex(key, ttl, JSON.stringify(data));
    }
  } catch {}
}

// Get cache without fallback
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    if (!redis || typeof redis.get !== "function") return null;
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export async function scanKeys(pattern = "*", limit = 10000): Promise<string[]> {
  try {
    if (!redis || typeof redis.scan !== "function") return [];

    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, batch] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        500,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0" && keys.length < limit);

    return keys.slice(0, limit);
  } catch {
    return [];
  }
}

// Invalidate cache by pattern
export async function invalidateCachePattern(pattern: string): Promise<number> {
  try {
    if (!redis || typeof redis.scan !== "function") return 0;
    const keys = await scanKeys(pattern);
    if (keys.length > 0) {
      await redis.unlink(...keys);
    }
    return keys.length;
  } catch {
    return 0;
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
    if (!redis) {
      return { totalKeys: 0, memory: "0", hitRate: "0%" };
    }
    const keys = await scanKeys("*");
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
  } catch {
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
    await Promise.all([
      invalidateCachePattern("public:*"),
      invalidateCachePattern("admin:*"),
    ]);
  } catch {}
}
