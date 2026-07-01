import Redis, { type RedisOptions } from "ioredis";

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

function getRedisConnectionOptions(): RedisOptions {
  const url = new URL(getRedisUrl());
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number.isFinite(db) ? db : undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
  };
}

export const redis =
  globalForRedis.redis ??
  new Redis({
    ...getRedisConnectionOptions(),
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
