// lib/r2/hls-converter.ts
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "./client";

const execAsync = promisify(exec);

export type HLSResult = {
  r2Key: string; // Path to master playlist
  hlsUrl: string; // Public URL to master.m3u8
  thumbnailUrl: string;
  duration: number;
};

export async function convertToHLSAndUpload({
  videoFile,
  title,
  outputPath,
}: {
  videoFile: File;
  title: string;
  outputPath: string; // e.g., "videos/video-id"
}): Promise<HLSResult> {
  const timestamp = Date.now();
  const safeTitle = title
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .slice(0, 50);
  const uniqueId = `${timestamp}-${safeTitle}`;

  // Local temp paths
  const tempDir = join(tmpdir(), `hls-${uniqueId}`);
  const tempVideoPath = join(tempDir, "input.mp4");
  const masterPlaylistPath = join(tempDir, "master.m3u8");
  const thumbnailPath = join(tempDir, "thumbnail.jpg");

  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });

    // Save video file
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempVideoPath, buffer);

    // Get video duration
    const duration = await getVideoDuration(tempVideoPath);

    // Generate thumbnail
    await generateThumbnail(tempVideoPath, thumbnailPath);

    // Convert to HLS with multiple bitrates (adaptive streaming)
    await convertToHLS(tempVideoPath, tempDir, uniqueId);

    // Upload HLS segments to R2
    const r2Key = `${outputPath}/${uniqueId}/master.m3u8`;
    await uploadDirectoryToR2(tempDir, outputPath, uniqueId);

    // Upload thumbnail
    const thumbnailBuffer = await readFile(thumbnailPath);
    const thumbnailKey = `${outputPath}/${uniqueId}/thumbnail.jpg`;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
      }),
    );

    const hlsUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;
    const thumbnailUrl = `${process.env.R2_PUBLIC_URL}/${thumbnailKey}`;

    return {
      r2Key,
      hlsUrl,
      thumbnailUrl,
      duration,
    };
  } finally {
    // Cleanup
    await unlink(tempVideoPath).catch(() => {});
    await unlink(masterPlaylistPath).catch(() => {});
    await unlink(thumbnailPath).catch(() => {});
    await unlink(tempDir).catch(() => {});
  }
}

async function convertToHLS(
  inputPath: string,
  outputDir: string,
  uniqueId: string,
): Promise<void> {
  // Create multiple quality variants
  const qualities = [
    { name: "360p", width: 640, height: 360, bitrate: "800k" },
    { name: "480p", width: 854, height: 480, bitrate: "1500k" },
    { name: "720p", width: 1280, height: 720, bitrate: "2500k" },
    { name: "1080p", width: 1920, height: 1080, bitrate: "4500k" },
  ];

  const variantPlaylists = [];

  for (const quality of qualities) {
    const variantDir = join(outputDir, quality.name);
    await mkdir(variantDir, { recursive: true });

    const playlistPath = join(variantDir, "playlist.m3u8");
    const segmentPattern = join(variantDir, "segment-%03d.ts");

    // FFmpeg command for HLS encoding
    const cmd = `ffmpeg -i "${inputPath}" \
      -vf "scale=${quality.width}:${quality.height}" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a aac -b:a 128k \
      -hls_time 10 \
      -hls_list_size 0 \
      -hls_segment_filename "${segmentPattern}" \
      -f hls \
      "${playlistPath}"`;

    await execAsync(cmd);

    variantPlaylists.push({
      name: quality.name,
      playlist: `${quality.name}/playlist.m3u8`,
      bandwidth: parseInt(quality.bitrate),
      width: quality.width,
      height: quality.height,
    });
  }

  // Generate master playlist
  let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n";
  for (const variant of variantPlaylists) {
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.width}x${variant.height}\n`;
    masterContent += `${variant.playlist}\n`;
  }

  await writeFile(join(outputDir, "master.m3u8"), masterContent);
}

async function uploadDirectoryToR2(
  localDir: string,
  r2Prefix: string,
  uniqueId: string,
): Promise<void> {
  const { readdir, stat } = await import("fs/promises");
  const { join } = await import("path");

  async function uploadRecursive(dir: string, basePath: string) {
    const files = await readdir(dir);

    for (const file of files) {
      const localPath = join(dir, file);
      const fileStat = await stat(localPath);

      if (fileStat.isDirectory()) {
        await uploadRecursive(localPath, join(basePath, file));
      } else {
        const fileBuffer = await readFile(localPath);
        const key = `${r2Prefix}/${uniqueId}/${basePath}/${file}`.replace(
          /\\/g,
          "/",
        );

        let contentType = "application/x-mpegURL";
        if (file.endsWith(".ts")) contentType = "video/MP2T";
        if (file.endsWith(".jpg")) contentType = "image/jpeg";

        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
          }),
        );
      }
    }
  }

  await uploadRecursive(localDir, "");
}

async function getVideoDuration(inputPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
  );
  return Math.round(parseFloat(stdout) || 0);
}

async function generateThumbnail(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await execAsync(
    `ffmpeg -i "${inputPath}" -ss 00:00:05 -vframes 1 -vf "scale=1280:720" "${outputPath}"`,
  );
}
