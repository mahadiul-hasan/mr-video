import "server-only";

type UploadResult = {
  providerId: string;
  playbackUrl: string;
  thumbnailUrl: string;
  duration: number;
};

const CLOUDINARY_UPLOAD_URL = (resourceType: "image" | "video") => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("Missing CLOUDINARY_CLOUD_NAME");
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
};

export async function uploadVideoAsset({
  videoFile,
  thumbnailFile,
  title,
}: {
  videoFile: File;
  thumbnailFile?: File | null;
  title: string;
}): Promise<UploadResult> {
  return uploadToCloudinary({ videoFile, thumbnailFile, title });
}

export async function deleteVideoAsset(providerId: string) {
  if (!providerId) return;

  try {
    await deleteFromCloudinary(providerId, "video");
  } catch {
    // Storage cleanup should not block database cleanup in admin workflows.
  }
}

async function uploadToCloudinary({
  videoFile,
  thumbnailFile,
  title,
}: {
  videoFile: File;
  thumbnailFile?: File | null;
  title: string;
}) {
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!uploadPreset) throw new Error("Missing CLOUDINARY_UPLOAD_PRESET");

  const videoForm = new FormData();
  videoForm.append("file", videoFile);
  videoForm.append("upload_preset", uploadPreset);
  videoForm.append("folder", "mr-video/videos");
  videoForm.append("context", `caption=${title}`);

  const videoResponse = await fetch(CLOUDINARY_UPLOAD_URL("video"), {
    method: "POST",
    body: videoForm,
  });

  if (!videoResponse.ok) {
    throw new Error(
      await readCloudinaryError(
        videoResponse,
        "Cloudinary video upload failed",
      ),
    );
  }

  const video = (await videoResponse.json()) as {
    public_id: string;
    secure_url: string;
    duration?: number;
  };

  let thumbnailUrl = video.secure_url.replace(
    "/video/upload/",
    "/video/upload/so_1,w_1280,h_720,c_fill/",
  );

  if (thumbnailFile?.size) {
    const thumbnailForm = new FormData();
    thumbnailForm.append("file", thumbnailFile);
    thumbnailForm.append("upload_preset", uploadPreset);
    thumbnailForm.append("folder", "mr-video/thumbnails");

    const thumbnailResponse = await fetch(CLOUDINARY_UPLOAD_URL("image"), {
      method: "POST",
      body: thumbnailForm,
    });

    if (!thumbnailResponse.ok) {
      throw new Error(
        await readCloudinaryError(
          thumbnailResponse,
          "Cloudinary thumbnail upload failed",
        ),
      );
    }

    const thumbnail = (await thumbnailResponse.json()) as {
      secure_url: string;
    };
    thumbnailUrl = thumbnail.secure_url;
  }

  return {
    providerId: video.public_id,
    playbackUrl: video.secure_url,
    thumbnailUrl,
    duration: Math.round(video.duration ?? 0),
  };
}

async function readCloudinaryError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };

    return [
      fallback,
      `status ${response.status}`,
      body.error?.message || body.message,
    ]
      .filter(Boolean)
      .join(": ");
  } catch {
    return `${fallback}: status ${response.status}`;
  }
}

async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video",
) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await createCloudinarySignature(
    `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`,
  );

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    {
      method: "POST",
      body: form,
    },
  );
}

async function createCloudinarySignature(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
