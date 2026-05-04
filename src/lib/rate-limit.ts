type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new Error("Too many requests");
  }

  current.count++;
}
