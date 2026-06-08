import "dotenv/config";
import { exec } from "child_process";
import { promisify } from "util";
import { ackVideoJob, reserveVideoJob, retryVideoJob } from "@/lib/video-processing/queue";
import { deletePrefix, processVideoJob } from "@/lib/video-processing/processor";

const execAsync = promisify(exec);

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
  const message = error.message.toLowerCase();
  return (
    message.includes("ffprobe") && message.includes("not recognized")
  ) || (
    message.includes("ffmpeg") && message.includes("not recognized")
  ) || message.includes("not found in path");
}

async function handleOne() {
  const job = await reserveVideoJob(5);
  if (!job) return;

  try {
    if (job.kind === "PROCESS_VIDEO") {
      await processVideoJob({
        videoId: job.videoId,
        sourceKey: job.sourceKey,
        cleanupPrefix: job.cleanupPrefix,
      });
    } else if (job.kind === "DELETE_PREFIX") {
      await deletePrefix(job.prefix);
    }

    await ackVideoJob(job);
  } catch (error) {
    const requeued = isNonRetryableError(error)
      ? false
      : await retryVideoJob(job, 3);
    if (!requeued) {
      await ackVideoJob(job);
      console.error("Job permanently failed", job, error);
    }
  }
}

async function main() {
  await assertMediaToolsInstalled();
  for (;;) {
    await handleOne();
  }
}

main().catch((error) => {
  console.error("Video worker crashed", error);
  process.exit(1);
});
