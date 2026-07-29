import { redis } from "@/lib/redis";
import prisma from "@/lib/prisma";

const VIDEO_QUEUE_KEY = "queue:video:jobs";
const LEGACY_VIDEO_PROCESSING_KEY = "queue:video:processing";
const VIDEO_PROCESSING_PREFIX = "queue:video:processing:";
const WORKER_HEARTBEAT_PREFIX = "queue:video:worker:";
const VIDEO_PROGRESS_PREFIX = "queue:video:progress:";
const STALE_WORKER_MS = 45_000;

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

export type VideoJobProgress = {
  videoId: string;
  stage: string;
  percent: number;
  message: string;
  updatedAt: string;
  workerName?: string;
};

export function parseVideoJob(raw: string): VideoJob | null {
  try {
    const job = JSON.parse(raw) as VideoJob;
    if (job.kind === "PROCESS_VIDEO" && job.videoId && job.sourceKey) return job;
    if (job.kind === "DELETE_PREFIX" && job.prefix) return job;
    return null;
  } catch {
    return null;
  }
}

export function serializeVideoJob(job: VideoJob) {
  return JSON.stringify(job);
}

function jobIdentity(job: VideoJob) {
  if (job.kind === "PROCESS_VIDEO") return `${job.kind}:${job.videoId}`;
  return `${job.kind}:${job.prefix}`;
}

export async function enqueueVideoJob(job: VideoJob) {
  const nextJob = { ...job, attempts: job.attempts ?? 0 };
  const identity = jobIdentity(nextJob);
  const existingRaw = await getAllQueueJobPayloads();
  const alreadyQueued = existingRaw.some((raw) => {
    const existing = parseVideoJob(raw);
    return existing ? jobIdentity(existing) === identity : false;
  });

  if (!alreadyQueued) {
    await redis.lpush(VIDEO_QUEUE_KEY, serializeVideoJob(nextJob));
  }
}

export async function reserveVideoJob(
  workerName: string,
  timeoutSeconds = 5,
): Promise<VideoJob | null> {
  const raw = await redis.brpop(VIDEO_QUEUE_KEY, timeoutSeconds);
  if (!raw) return null;

  const payload = raw[1];
  const job = parseVideoJob(payload);
  if (!job) return null;

  await redis.lpush(processingKey(workerName), payload);

  return job;
}

export async function ackVideoJob(workerName: string, job: VideoJob) {
  await redis.lrem(processingKey(workerName), 1, serializeVideoJob(job));
}

export async function retryVideoJob(
  workerName: string,
  job: VideoJob,
  maxAttempts = 3,
) {
  const attempts = (job.attempts ?? 0) + 1;
  await redis.lrem(processingKey(workerName), 1, serializeVideoJob(job));

  if (attempts >= maxAttempts) {
    return false;
  }

  await redis.rpush(VIDEO_QUEUE_KEY, serializeVideoJob({ ...job, attempts }));
  return true;
}

export async function updateWorkerHeartbeat(workerName: string) {
  await redis.set(workerHeartbeatKey(workerName), new Date().toISOString(), "EX", 120);
}

export async function recoverStaleProcessingJobs() {
  const processingKeys = await getProcessingKeys();
  if (!processingKeys.length) return 0;

  const queuedRaw = await redis.lrange(VIDEO_QUEUE_KEY, 0, -1);
  const queuedIdentities = new Set(
    queuedRaw
      .map(parseVideoJob)
      .filter(Boolean)
      .map((job) => jobIdentity(job as VideoJob)),
  );
  const recoveredIdentities = new Set<string>();
  const pipeline = redis.pipeline();

  for (const key of processingKeys) {
    const workerName = key.startsWith(VIDEO_PROCESSING_PREFIX)
      ? key.substring(VIDEO_PROCESSING_PREFIX.length)
      : "legacy";
    const heartbeat =
      key === LEGACY_VIDEO_PROCESSING_KEY
        ? null
        : await redis.get(workerHeartbeatKey(workerName));
    const heartbeatMs = heartbeat ? new Date(heartbeat).getTime() : 0;
    const workerIsAlive =
      heartbeatMs > 0 && Date.now() - heartbeatMs < STALE_WORKER_MS;

    if (workerIsAlive) continue;

    const stuckJobs = await redis.lrange(key, 0, -1);
    for (const raw of stuckJobs) {
      const job = parseVideoJob(raw);
      pipeline.lrem(key, 1, raw);
      if (!job) continue;

      const identity = jobIdentity(job);
      if (queuedIdentities.has(identity) || recoveredIdentities.has(identity)) {
        continue;
      }

      recoveredIdentities.add(identity);
      pipeline.rpush(VIDEO_QUEUE_KEY, raw);
    }
  }

  await pipeline.exec();

  return recoveredIdentities.size;
}

export async function removeVideoJobs(videoIds: string[]) {
  const ids = new Set(videoIds);
  if (!ids.size) return 0;

  const [queuedRaw, processingRaw] = await Promise.all([
    redis.lrange(VIDEO_QUEUE_KEY, 0, -1),
    getAllProcessingJobPayloads(),
  ]);

  let removed = 0;
  const pipeline = redis.pipeline();

  for (const raw of [...queuedRaw, ...processingRaw]) {
    const job = parseVideoJob(raw);
    if (job?.kind === "PROCESS_VIDEO" && ids.has(job.videoId)) {
      pipeline.lrem(VIDEO_QUEUE_KEY, 0, raw);
      for (const key of await getProcessingKeys()) {
        pipeline.lrem(key, 0, raw);
      }
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
    getAllProcessingJobPayloads(),
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

  const uniqueValidQueued = new Set(
    queuedJobs.filter(isValidJob).map(jobIdentity),
  );
  const uniqueValidProcessing = new Set(
    processingJobs.filter(isValidJob).map(jobIdentity),
  );
  for (const identity of uniqueValidProcessing) {
    uniqueValidQueued.delete(identity);
  }

  return {
    queuedJobs: uniqueValidQueued.size,
    processingJobs: uniqueValidProcessing.size,
    processingVideoIds: processingJobs
      .filter(
        (job): job is ProcessVideoJob =>
          job.kind === "PROCESS_VIDEO" && isValidJob(job),
      )
      .filter((job, index, jobs) => {
        const identity = jobIdentity(job);
        return jobs.findIndex((item) => jobIdentity(item) === identity) === index;
      })
      .map((job) => job.videoId),
    staleJobs:
      queuedJobs.filter((job) => !isValidJob(job)).length +
      processingJobs.filter((job) => !isValidJob(job)).length,
  };
}

export async function purgeStaleVideoJobs() {
  const [queuedRaw, processingRaw] = await Promise.all([
    redis.lrange(VIDEO_QUEUE_KEY, 0, -1),
    getAllProcessingJobPayloads(),
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

  const seen = new Set<string>();
  const normalizeList = (items: string[]) => {
    const kept: string[] = [];
    let removed = 0;

    for (const raw of items) {
      const job = parseVideoJob(raw);
      if (!job) {
        removed++;
        continue;
      }

      if (job.kind === "PROCESS_VIDEO" && !existingIds.has(job.videoId)) {
        removed++;
        continue;
      }

      const identity = jobIdentity(job);
      if (seen.has(identity)) {
        removed++;
        continue;
      }

      seen.add(identity);
      kept.push(raw);
    }

    return { kept, removed };
  };

  const processing = normalizeList(processingRaw);
  const queued = normalizeList(queuedRaw);
  const removed = queued.removed + processing.removed;
  if (removed === 0) return 0;

  const pipeline = redis.pipeline();
  pipeline.del(VIDEO_QUEUE_KEY);
  const processingKeys = await getProcessingKeys();
  for (const key of processingKeys) pipeline.del(key);
  for (const raw of queued.kept) pipeline.rpush(VIDEO_QUEUE_KEY, raw);
  if (processing.kept.length > 0) {
    pipeline.rpush(processingKey("recovered"), ...processing.kept);
  }
  await pipeline.exec();

  return removed;
}

export async function setVideoJobProgress(progress: VideoJobProgress) {
  await redis.set(
    `${VIDEO_PROGRESS_PREFIX}${progress.videoId}`,
    JSON.stringify(progress),
    "EX",
    60 * 60,
  );
}

export async function clearVideoJobProgress(videoId: string) {
  await redis.del(`${VIDEO_PROGRESS_PREFIX}${videoId}`);
}

export async function getVideoJobProgress(videoIds: string[]) {
  const ids = [...new Set(videoIds)];
  if (!ids.length) return [];

  const values = await redis.mget(
    ...ids.map((id) => `${VIDEO_PROGRESS_PREFIX}${id}`),
  );

  return values
    .map((value) => {
      if (!value) return null;
      try {
        return JSON.parse(value) as VideoJobProgress;
      } catch {
        return null;
      }
    })
    .filter((value): value is VideoJobProgress => Boolean(value));
}

function processingKey(workerName: string) {
  return `${VIDEO_PROCESSING_PREFIX}${workerName}`;
}

function workerHeartbeatKey(workerName: string) {
  return `${WORKER_HEARTBEAT_PREFIX}${workerName}:heartbeat`;
}

async function getAllProcessingJobPayloads() {
  const keys = await getProcessingKeys();
  if (!keys.length) return [];

  const payloads = await Promise.all(keys.map((key) => redis.lrange(key, 0, -1)));
  return payloads.flat();
}

async function getProcessingKeys() {
  const keys = await redis.keys(`${VIDEO_PROCESSING_PREFIX}*`);
  const legacyExists = await redis.exists(LEGACY_VIDEO_PROCESSING_KEY);
  return legacyExists ? [...keys, LEGACY_VIDEO_PROCESSING_KEY] : keys;
}

async function getAllQueueJobPayloads() {
  const [queuedRaw, processingRaw] = await Promise.all([
    redis.lrange(VIDEO_QUEUE_KEY, 0, -1),
    getAllProcessingJobPayloads(),
  ]);

  return [...queuedRaw, ...processingRaw];
}
