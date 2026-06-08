"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "./client";
import { deletePrefix } from "@/lib/video-processing/processor";

export async function uploadSourceVideoToR2(videoFile: File, key: string) {
  const body = Buffer.from(await videoFile.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentLength: body.byteLength,
      ContentType: videoFile.type || "video/mp4",
    }),
  );
}

export async function deleteHLSTFromR2(r2Key: string) {
  if (!r2Key) return;
  const prefix = r2Key.substring(0, r2Key.lastIndexOf("/"));
  if (!prefix) return;
  await deletePrefix(prefix);
}
