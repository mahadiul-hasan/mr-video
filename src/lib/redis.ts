import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  if (process.env.NODE_ENV === "development") {
    return "redis://localhost:6379";
  }
  throw new Error("REDIS_URL is not defined");
};

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    enableReadyCheck: true,
    lazyConnect: false,
    keepAlive: 30000,
    family: 4,
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Redis event handlers (silent)
redis.on("error", () => {});

// Graceful shutdown
const disconnectRedis = async () => {
  if (redis) {
    await redis.quit();
  }
};

process.on("SIGTERM", disconnectRedis);
process.on("SIGINT", disconnectRedis);

export default redis;
