"use client";

import { useEffect } from "react";
import { trackVideoView } from "@/app/actions/view";

export function VideoViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `video-viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(key, "1");
      void trackVideoView(slug);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [slug]);

  return null;
}

