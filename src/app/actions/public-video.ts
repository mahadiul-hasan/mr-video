"use server";

import {
  getPublicVideos,
  getPublicVideosByCategory,
  getPublicVideosByTag,
  searchPublicVideos,
} from "@/lib/videos/public-videos";

const PAGE_SIZE = 12;

export async function loadMoreHomeVideos(page: number) {
  try {
    return await getPublicVideos({ page, limit: PAGE_SIZE });
  } catch {
    return [];
  }
}

export async function loadMoreSearchVideos(query: string, page: number) {
  if (!query || query.trim() === "") {
    return [];
  }

  try {
    return await searchPublicVideos({ query, page, limit: PAGE_SIZE });
  } catch {
    return [];
  }
}

export async function loadMoreCategoryVideos(slug: string, page: number) {
  if (!slug) {
    return [];
  }

  try {
    const result = await getPublicVideosByCategory({
      slug,
      page,
      limit: PAGE_SIZE,
    });
    return result?.videos ?? [];
  } catch {
    return [];
  }
}

export async function loadMoreTagVideos(slug: string, page: number) {
  if (!slug) {
    return [];
  }

  try {
    const result = await getPublicVideosByTag({ slug, page, limit: PAGE_SIZE });
    return result?.videos ?? [];
  } catch {
    return [];
  }
}
