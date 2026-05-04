import "server-only";

type UploadResult = {
  providerId: string;
  playbackUrl: string;
  thumbnailUrl: string;
  duration: number;
};

export async function uploadVideoAssetR2({
  videoFile,
  thumbnailFile,
  title,
}: {
  videoFile: File;
  thumbnailFile?: File | null;
  title: string;
}): Promise<UploadResult> {
  void videoFile;
  void thumbnailFile;
  void title;

  /*
  Future R2 flow:

  1. Install AWS-compatible client:
     npm install @aws-sdk/client-s3

  2. Configure env:
     R2_ENDPOINT=
     R2_BUCKET=
     R2_ACCESS_KEY_ID=
     R2_SECRET_ACCESS_KEY=
     R2_PUBLIC_CDN_URL=

  3. Upload original video and thumbnail:
     const client = new S3Client({
       region: "auto",
       endpoint: process.env.R2_ENDPOINT,
       credentials: {
         accessKeyId: process.env.R2_ACCESS_KEY_ID!,
         secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
       },
     });

     const key = `videos/${crypto.randomUUID()}/source.mp4`;
     await client.send(new PutObjectCommand({
       Bucket: process.env.R2_BUCKET!,
       Key: key,
       Body: Buffer.from(await videoFile.arrayBuffer()),
       ContentType: videoFile.type,
     }));

  4. Transcode to HLS with your encoder/queue.
     Store generated master.m3u8 under:
     videos/{id}/hls/master.m3u8

  5. Return:
     {
       providerId: key,
       playbackUrl: `${process.env.R2_PUBLIC_CDN_URL}/videos/{id}/hls/master.m3u8`,
       thumbnailUrl: `${process.env.R2_PUBLIC_CDN_URL}/videos/{id}/thumb.jpg`,
       duration,
     }

  To switch from Cloudinary later:
  - Import uploadVideoAssetR2/deleteVideoAssetR2 where storage is used.
  - Replace the function names only.
  */

  throw new Error("Cloudflare R2 upload is not configured yet");
}

export async function deleteVideoAssetR2(providerId: string) {
  void providerId;

  /*
  Future delete:
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: providerId,
  }));
  */
}
