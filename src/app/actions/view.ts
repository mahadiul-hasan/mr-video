"use server";

import { incrementVideoViews } from "@/lib/videos/public-videos";

export async function trackVideoView(slug: string) {
  if (!slug) return { success: false };

  await incrementVideoViews(slug);
  return { success: true };
}

