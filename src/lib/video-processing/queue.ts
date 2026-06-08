import { redis } from "@/lib/redis";

const VIDEO_QUEUE_KEY = "queue:video:jobs";
const VIDEO_PROCESSING_KEY = "queue:video:processing";

export type ProcessVideoJob = {
  kind: "PROCESS_VIDEO";
  videoId: string;
  sourceKey: string;
  cleanupPrefix?: string;
  attempts?: number;
};

export type DeletePrefixJob = {
  kind: "DELETE_PREFIX";
  prefix: string;
  attempts?: number;
};

export type VideoJob = ProcessVideoJob | DeletePrefixJob;

export async function enqueueVideoJob(job: VideoJob) {
  await redis.lpush(VIDEO_QUEUE_KEY, JSON.stringify({ ...job, attempts: 0 }));
}

export async function reserveVideoJob(timeoutSeconds = 5): Promise<VideoJob | null> {
  const raw = await redis.brpoplpush(
    VIDEO_QUEUE_KEY,
    VIDEO_PROCESSING_KEY,
    timeoutSeconds,
  );
  if (!raw) return null;

  try {
    return JSON.parse(raw) as VideoJob;
  } catch {
    await redis.lrem(VIDEO_PROCESSING_KEY, 1, raw);
    return null;
  }
}

export async function ackVideoJob(job: VideoJob) {
  await redis.lrem(VIDEO_PROCESSING_KEY, 1, JSON.stringify(job));
}

export async function retryVideoJob(job: VideoJob, maxAttempts = 3) {
  const attempts = (job.attempts ?? 0) + 1;
  await redis.lrem(VIDEO_PROCESSING_KEY, 1, JSON.stringify(job));

  if (attempts >= maxAttempts) {
    return false;
  }

  await redis.rpush(VIDEO_QUEUE_KEY, JSON.stringify({ ...job, attempts }));
  return true;
}
