import { redis } from "@/lib/redis";
import prisma from "@/lib/prisma";

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

function parseVideoJob(raw: string): VideoJob | null {
  try {
    const job = JSON.parse(raw) as VideoJob;
    if (job.kind === "PROCESS_VIDEO" && job.videoId && job.sourceKey) return job;
    if (job.kind === "DELETE_PREFIX" && job.prefix) return job;
    return null;
  } catch {
    return null;
  }
}

function serializeJob(job: VideoJob) {
  return JSON.stringify(job);
}

export async function enqueueVideoJob(job: VideoJob) {
  await redis.lpush(VIDEO_QUEUE_KEY, serializeJob({ ...job, attempts: 0 }));
}

export async function reserveVideoJob(timeoutSeconds = 5): Promise<VideoJob | null> {
  const raw = await redis.brpoplpush(
    VIDEO_QUEUE_KEY,
    VIDEO_PROCESSING_KEY,
    timeoutSeconds,
  );
  if (!raw) return null;

  const job = parseVideoJob(raw);
  if (!job) {
    await redis.lrem(VIDEO_PROCESSING_KEY, 1, raw);
    return null;
  }

  return job;
}

export async function ackVideoJob(job: VideoJob) {
  await redis.lrem(VIDEO_PROCESSING_KEY, 1, serializeJob(job));
}

export async function retryVideoJob(job: VideoJob, maxAttempts = 3) {
  const attempts = (job.attempts ?? 0) + 1;
  await redis.lrem(VIDEO_PROCESSING_KEY, 1, serializeJob(job));

  if (attempts >= maxAttempts) {
    return false;
  }

  await redis.rpush(VIDEO_QUEUE_KEY, serializeJob({ ...job, attempts }));
  return true;
}

export async function recoverProcessingJobs() {
  const stuckJobs = await redis.lrange(VIDEO_PROCESSING_KEY, 0, -1);
  if (!stuckJobs.length) return 0;

  const pipeline = redis.pipeline();
  for (const raw of stuckJobs) {
    pipeline.lrem(VIDEO_PROCESSING_KEY, 1, raw);
    pipeline.rpush(VIDEO_QUEUE_KEY, raw);
  }
  await pipeline.exec();

  return stuckJobs.length;
}

export async function removeVideoJobs(videoIds: string[]) {
  const ids = new Set(videoIds);
  if (!ids.size) return 0;

  const [queuedRaw, processingRaw] = await Promise.all([
    redis.lrange(VIDEO_QUEUE_KEY, 0, -1),
    redis.lrange(VIDEO_PROCESSING_KEY, 0, -1),
  ]);

  let removed = 0;
  const pipeline = redis.pipeline();

  for (const raw of [...queuedRaw, ...processingRaw]) {
    const job = parseVideoJob(raw);
    if (job?.kind === "PROCESS_VIDEO" && ids.has(job.videoId)) {
      pipeline.lrem(VIDEO_QUEUE_KEY, 0, raw);
      pipeline.lrem(VIDEO_PROCESSING_KEY, 0, raw);
      removed++;
    }
  }

  if (removed > 0) {
    await pipeline.exec();
  }

  return removed;
}

export async function getVideoQueueMetrics() {
  const [queuedRaw, processingRaw] = await Promise.all([
    redis.lrange(VIDEO_QUEUE_KEY, 0, -1),
    redis.lrange(VIDEO_PROCESSING_KEY, 0, -1),
  ]);

  const queuedJobs = queuedRaw.map(parseVideoJob).filter(Boolean) as VideoJob[];
  const processingJobs = processingRaw
    .map(parseVideoJob)
    .filter(Boolean) as VideoJob[];
  const processVideoIds = [...queuedJobs, ...processingJobs]
    .filter((job): job is ProcessVideoJob => job.kind === "PROCESS_VIDEO")
    .map((job) => job.videoId);

  const existingIds = processVideoIds.length
    ? new Set(
        (
          await prisma.video.findMany({
            where: { id: { in: [...new Set(processVideoIds)] } },
            select: { id: true },
          })
        ).map((video) => video.id),
      )
    : new Set<string>();

  const isValidJob = (job: VideoJob) =>
    job.kind === "DELETE_PREFIX" || existingIds.has(job.videoId);

  return {
    queuedJobs: queuedJobs.filter(isValidJob).length,
    processingJobs: processingJobs.filter(isValidJob).length,
    staleJobs:
      queuedJobs.filter((job) => !isValidJob(job)).length +
      processingJobs.filter((job) => !isValidJob(job)).length,
  };
}

export async function purgeStaleVideoJobs() {
  const [queuedRaw, processingRaw] = await Promise.all([
    redis.lrange(VIDEO_QUEUE_KEY, 0, -1),
    redis.lrange(VIDEO_PROCESSING_KEY, 0, -1),
  ]);

  const jobs = [...queuedRaw, ...processingRaw]
    .map((raw) => ({ raw, job: parseVideoJob(raw) }))
    .filter(
      (item): item is { raw: string; job: ProcessVideoJob } =>
        item.job?.kind === "PROCESS_VIDEO",
    );

  if (!jobs.length) return 0;

  const existingIds = new Set(
    (
      await prisma.video.findMany({
        where: { id: { in: [...new Set(jobs.map((item) => item.job.videoId))] } },
        select: { id: true },
      })
    ).map((video) => video.id),
  );

  const staleJobs = jobs.filter((item) => !existingIds.has(item.job.videoId));
  if (!staleJobs.length) return 0;

  const pipeline = redis.pipeline();
  for (const { raw } of staleJobs) {
    pipeline.lrem(VIDEO_QUEUE_KEY, 0, raw);
    pipeline.lrem(VIDEO_PROCESSING_KEY, 0, raw);
  }
  await pipeline.exec();

  return staleJobs.length;
}
