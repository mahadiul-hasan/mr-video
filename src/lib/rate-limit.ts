import { redis } from "@/lib/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Rate limit configuration
export const rateLimits = {
  PUBLIC: { limit: 50, windowMs: 10000 }, // 50 requests per 10 seconds
  SEARCH: { limit: 30, windowMs: 60000 }, // 30 requests per minute
  API: { limit: 100, windowMs: 60000 }, // 100 requests per minute
  ADMIN: { limit: 20, windowMs: 60000 }, // 20 requests per minute
} as const;

// Simple sliding window rate limiter using Redis
export async function rateLimit(
  identifier: string,
  type: keyof typeof rateLimits = "PUBLIC",
): Promise<RateLimitResult> {
  const { limit, windowMs } = rateLimits[type];
  const key = `ratelimit:${type}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis MULTI for atomic operation
    const multi = redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);
    // Add current request
    multi.zadd(key, now, `${now}:${Math.random()}`);
    // Get count of requests in window
    multi.zcard(key);
    // Set expiry on the key (windowMs in seconds + buffer)
    multi.expire(key, Math.ceil(windowMs / 1000) + 60);

    const results = await multi.exec();
    const requestCount = (results?.[2]?.[1] as number) || 0;

    const remaining = Math.max(0, limit - requestCount);
    const reset = now + windowMs;

    return {
      success: requestCount <= limit,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    // On error, allow the request (fail open)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: now + windowMs,
    };
  }
}

// Helper to get rate limit status without consuming a token
export async function getRateLimitStatus(
  identifier: string,
  type: keyof typeof rateLimits = "PUBLIC",
): Promise<RateLimitResult> {
  const { limit, windowMs } = rateLimits[type];
  const key = `ratelimit:${type}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zcard(key);

    const results = await multi.exec();
    const requestCount = (results?.[1]?.[1] as number) || 0;

    const remaining = Math.max(0, limit - requestCount);
    const reset = now + windowMs;

    return {
      success: requestCount < limit,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    return {
      success: true,
      limit,
      remaining: limit,
      reset: now + windowMs,
    };
  }
}

// Reset rate limit for a user
export async function resetRateLimit(
  identifier: string,
  type: keyof typeof rateLimits = "PUBLIC",
): Promise<void> {
  const key = `ratelimit:${type}:${identifier}`;
  try {
    await redis.del(key);
  } catch (error) {}
}
