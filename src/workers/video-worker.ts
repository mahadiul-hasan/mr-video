import "dotenv/config";
import { exec } from "child_process";
import { promisify } from "util";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { r2Client, R2_BUCKET } from "@/lib/r2/client";
import {
  ackVideoJob,
  clearVideoJobProgress,
  enqueueVideoJob,
  purgeStaleVideoJobs,
  recoverProcessingJobs,
  reserveVideoJob,
  retryVideoJob,
  setVideoJobProgress,
} from "@/lib/video-processing/queue";
import { deletePrefix, processVideoJob } from "@/lib/video-processing/processor";

const execAsync = promisify(exec);
const WORKER_HEARTBEAT_KEY = "queue:video:worker:heartbeat";
const ORPHAN_PROCESSING_GRACE_MS = 10 * 60 * 1000;
const WORKER_NAME = process.env.WORKER_NAME || `worker-${process.pid}`;

async function assertMediaToolsInstalled() {
  try {
    await execAsync("ffmpeg -version");
    await execAsync("ffprobe -version");
  } catch {
    throw new Error(
      "ffmpeg/ffprobe not found in PATH. Install FFmpeg and restart worker.",
    );
  }
}

function isNonRetryableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const errorWithCode = error as Error & { Code?: string; code?: string };
  const message = error.message.toLowerCase();
  const code = (errorWithCode.Code || errorWithCode.code || "").toLowerCase();

  return (
    code === "nosuchkey" ||
    message.includes("nosuchkey") ||
    message.includes("specified key does not exist") ||
    (message.includes("ffprobe") && message.includes("not recognized")) ||
    (message.includes("ffmpeg") && message.includes("not recognized")) ||
    message.includes("not found in path")
  );
}

async function handleOne() {
  const job = await reserveVideoJob(5);
  if (!job) return;

  try {
    if (job.kind === "PROCESS_VIDEO") {
      const videoExists = await prisma.video.findUnique({
        where: { id: job.videoId },
        select: { id: true },
      });

      if (!videoExists) {
        await ackVideoJob(job);
        await clearVideoJobProgress(job.videoId);
        console.warn(
          `Skipped stale video job because video ${job.videoId} no longer exists.`,
        );
        return;
      }

      await processVideoJob({
        videoId: job.videoId,
        sourceKey: job.sourceKey,
        cleanupPrefix: job.cleanupPrefix,
        onProgress: (progress) =>
          setVideoJobProgress({
            videoId: job.videoId,
            workerName: WORKER_NAME,
            updatedAt: new Date().toISOString(),
            ...progress,
          }),
      });
    } else if (job.kind === "DELETE_PREFIX") {
      await deletePrefix(job.prefix);
    }

    await ackVideoJob(job);
    if (job.kind === "PROCESS_VIDEO") {
      await clearVideoJobProgress(job.videoId);
    }
  } catch (error) {
    const requeued = isNonRetryableError(error)
      ? false
      : await retryVideoJob(job, 3);
    if (!requeued) {
      await ackVideoJob(job);
      if (job.kind === "PROCESS_VIDEO") {
        await clearVideoJobProgress(job.videoId);
      }
      console.error("Job permanently failed", job, error);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recoverOrphanProcessingVideos() {
  const cutoff = new Date(Date.now() - ORPHAN_PROCESSING_GRACE_MS);
  const videos = await prisma.video.findMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: cutoff },
    },
    select: { id: true, updatedAt: true },
  });

  let recovered = 0;
  let failed = 0;

  for (const video of videos) {
    const listed = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: `uploads/${video.id}/`,
      }),
    );

    const latestSource = listed.Contents?.filter((item) => item.Key)
      .toSorted(
        (a, b) =>
          (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
      )[0]?.Key;

    if (!latestSource) {
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: "FAILED",
          processingError:
            "Source upload missing in R2 during worker recovery. Re-upload the video to process it again.",
        },
      });
      failed++;
      continue;
    }

    await enqueueVideoJob({
      kind: "PROCESS_VIDEO",
      videoId: video.id,
      sourceKey: latestSource,
    });
    recovered++;
  }

  return { recovered, failed };
}

async function main() {
  await assertMediaToolsInstalled();
  await redis.set(WORKER_HEARTBEAT_KEY, new Date().toISOString());
  const heartbeat = setInterval(() => {
    void redis.set(WORKER_HEARTBEAT_KEY, new Date().toISOString());
  }, 10000);
  heartbeat.unref();

  const recovered = await recoverProcessingJobs();
  if (recovered > 0) {
    console.log(`Recovered ${recovered} stuck video job(s).`);
  }
  const purged = await purgeStaleVideoJobs();
  if (purged > 0) {
    console.log(`Purged ${purged} stale video queue job(s).`);
  }
  const orphanResult = await recoverOrphanProcessingVideos();
  if (orphanResult.recovered > 0) {
    console.log(`Requeued ${orphanResult.recovered} processing video(s).`);
  }
  if (orphanResult.failed > 0) {
    console.log(`Marked ${orphanResult.failed} processing video(s) as failed because source uploads were missing.`);
  }
  for (;;) {
    try {
      await handleOne();
    } catch (error) {
      console.error("Worker loop recovered from error", error);
      await sleep(3000);
    }
  }
}

main().catch((error) => {
  console.error("Video worker crashed", error);
  process.exit(1);
});
