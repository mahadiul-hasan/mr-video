"use server";

import {
  getPublicVideos,
  getPublicVideosByCategory,
  getPublicVideosByTag,
  searchPublicVideos,
} from "@/lib/videos/public-videos";

const PAGE_SIZE = 12;

export async function loadMoreHomeVideos(page: number) {
  return getPublicVideos({ page, limit: PAGE_SIZE });
}

export async function loadMoreSearchVideos(query: string, page: number) {
  return searchPublicVideos({ query, page, limit: PAGE_SIZE });
}

export async function loadMoreCategoryVideos(slug: string, page: number) {
  const result = await getPublicVideosByCategory({
    slug,
    page,
    limit: PAGE_SIZE,
  });

  return result?.videos ?? [];
}

export async function loadMoreTagVideos(slug: string, page: number) {
  const result = await getPublicVideosByTag({ slug, page, limit: PAGE_SIZE });
  return result?.videos ?? [];
}
