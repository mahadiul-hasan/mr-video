import { exec } from "child_process";
import { promisify } from "util";
import { createWriteStream, createReadStream } from "fs";
import { mkdtemp, mkdir, readdir, rm } from "fs/promises";
import { join, resolve } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { tmpdir } from "os";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { r2Client, R2_BUCKET, R2_CDN_URL } from "@/lib/r2/client";

const execAsync = promisify(exec);

function isMissingR2Source(error: unknown) {
  if (!(error instanceof Error)) return false;
  const errorWithCode = error as Error & { Code?: string; code?: string };
  const code = (errorWithCode.Code || errorWithCode.code || "").toLowerCase();
  const message = error.message.toLowerCase();

  return (
    code === "nosuchkey" ||
    message.includes("nosuchkey") ||
    message.includes("specified key does not exist")
  );
}

function processingErrorMessage(error: unknown) {
  if (isMissingR2Source(error)) {
    return "Source upload missing in R2. Re-upload the video to process it again.";
  }

  return error instanceof Error
    ? error.message.slice(0, 1000)
    : "Unknown processing error";
}

function toNodeReadable(body: unknown): Readable {
  if (body instanceof Readable) return body;
  if (
    body &&
    typeof (body as { transformToWebStream?: () => ReadableStream })
      .transformToWebStream === "function"
  ) {
    return Readable.fromWeb(
      (body as { transformToWebStream: () => ReadableStream })
        .transformToWebStream() as NodeReadableStream,
    );
  }
  throw new Error("Unsupported R2 body stream");
}

async function getVideoDuration(inputPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
  );
  return Math.round(parseFloat(stdout) || 0);
}

async function videoHasAudio(inputPath: string): Promise<boolean> {
  const { stdout } = await execAsync(
    `ffprobe -v error -select_streams a:0 -show_entries stream=index -of csv=p=0 "${inputPath}"`,
  );
  return stdout.trim().length > 0;
}

async function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await execAsync(
    `ffmpeg -y -i "${inputPath}" -ss 00:00:05 -vframes 1 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" "${outputPath}"`,
  );
}

async function convertToAdaptiveHls(inputPath: string, outputDir: string): Promise<void> {
  const hasAudio = await videoHasAudio(inputPath);
  const filterComplex =
    "[0:v]split=4[v1][v2][v3][v4];" +
    "[v1]scale=w=640:h=360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[v360];" +
    "[v2]scale=w=854:h=480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2[v480];" +
    "[v3]scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v720];" +
    "[v4]scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v1080]";
  const audioMaps = hasAudio
    ? [
        "-map a:0",
        "-map a:0",
        "-map a:0",
        "-map a:0",
        "-c:a aac",
        "-ar 48000",
        "-ac 2",
        "-b:a 128k",
      ]
    : [];
  const variantMap = hasAudio
    ? "v:0,a:0,name:360p v:1,a:1,name:480p v:2,a:2,name:720p v:3,a:3,name:1080p"
    : "v:0,name:360p v:1,name:480p v:2,name:720p v:3,name:1080p";
  const cmd = [
    "ffmpeg",
    "-y",
    `-i "${inputPath}"`,
    `-filter_complex "${filterComplex}"`,
    '-map "[v360]"',
    hasAudio ? audioMaps[0] : "",
    "-c:v:0 libx264 -preset medium -profile:v:0 main -crf:v:0 23 -b:v:0 800k -maxrate:v:0 856k -bufsize:v:0 1200k -g 48 -keyint_min 48",
    '-map "[v480]"',
    hasAudio ? audioMaps[1] : "",
    "-c:v:1 libx264 -preset medium -profile:v:1 main -crf:v:1 22 -b:v:1 1400k -maxrate:v:1 1498k -bufsize:v:1 2100k -g 48 -keyint_min 48",
    '-map "[v720]"',
    hasAudio ? audioMaps[2] : "",
    "-c:v:2 libx264 -preset medium -profile:v:2 high -crf:v:2 21 -b:v:2 2800k -maxrate:v:2 2996k -bufsize:v:2 4200k -g 48 -keyint_min 48",
    '-map "[v1080]"',
    hasAudio ? audioMaps[3] : "",
    "-c:v:3 libx264 -preset medium -profile:v:3 high -crf:v:3 20 -b:v:3 5000k -maxrate:v:3 5350k -bufsize:v:3 7500k -g 48 -keyint_min 48",
    hasAudio ? audioMaps.slice(4).join(" ") : "",
    `-var_stream_map "${variantMap}"`,
    "-master_pl_name master.m3u8",
    "-hls_time 6 -hls_playlist_type vod -hls_list_size 0",
    "-hls_flags independent_segments",
    `-hls_segment_filename "${outputDir}/%v/segment_%06d.ts"`,
    `"${outputDir}/%v/playlist.m3u8"`,
  ]
    .filter(Boolean)
    .join(" ");

  await execAsync(cmd);
}

function contentTypeForFile(file: string): string {
  if (file.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (file.endsWith(".ts")) return "video/mp2t";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

async function uploadDir(localDir: string, keyPrefix: string): Promise<void> {
  async function walk(dir: string, rel = ""): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(abs, nextRel);
      } else {
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: `${keyPrefix}/${nextRel}`.replace(/\\/g, "/"),
            Body: createReadStream(abs),
            ContentType: contentTypeForFile(entry.name),
          }),
        );
      }
    }
  }

  await walk(localDir);
}

export async function deletePrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined;
  do {
    const listed = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = (listed.Contents ?? [])
      .map((obj) => obj.Key)
      .filter((key): key is string => Boolean(key));
    for (const key of objects) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function processVideoJob(input: {
  videoId: string;
  sourceKey: string;
  cleanupPrefix?: string;
}) {
  const baseTmp = await mkdtemp(join(tmpdir(), "video-worker-"));
  const sourcePath = join(baseTmp, "input.mp4");
  const workDir = join(baseTmp, "hls");
  const thumbnailPath = join(workDir, "thumbnail.jpg");
  const videoPrefix = `videos/${input.videoId}`;

  try {
    await mkdir(workDir, { recursive: true });
    for (const dir of ["360p", "480p", "720p", "1080p"]) {
      await mkdir(join(workDir, dir), { recursive: true });
    }

    const object = await r2Client.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: input.sourceKey }),
    );

    if (!object.Body) throw new Error("Source video body missing");
    await pipeline(toNodeReadable(object.Body), createWriteStream(sourcePath));

    const duration = await getVideoDuration(sourcePath);
    await generateThumbnail(sourcePath, thumbnailPath);
    await convertToAdaptiveHls(sourcePath, workDir);
    await uploadDir(workDir, videoPrefix);

    const hlsUrl = `${R2_CDN_URL}/${videoPrefix}/master.m3u8`;
    const thumbnailUrl = `${R2_CDN_URL}/${videoPrefix}/thumbnail.jpg`;

    await prisma.video.update({
      where: { id: input.videoId },
      data: {
        r2Key: `${videoPrefix}/master.m3u8`,
        hlsUrl,
        thumbnailUrl,
        duration,
        status: "READY",
        processingError: null,
      },
    });

    if (input.cleanupPrefix && input.cleanupPrefix !== videoPrefix) {
      await deletePrefix(input.cleanupPrefix);
    }

    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: input.sourceKey }));
  } catch (error) {
    await prisma.video.update({
      where: { id: input.videoId },
      data: {
        status: "FAILED",
        processingError: processingErrorMessage(error),
      },
    });
    throw error;
  } finally {
    const resolvedTmp = resolve(baseTmp);
    if (resolvedTmp.startsWith(resolve(tmpdir()))) {
      await rm(baseTmp, { recursive: true, force: true });
    }
  }
}

