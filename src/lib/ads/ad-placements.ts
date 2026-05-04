export const AD_PLACEMENTS = {
  VIDEO_TOP: "video_top",
  VIDEO_BOTTOM: "video_bottom",

  SIDEBAR: "sidebar",
  HEADER: "header",
  FOOTER: "footer",

  HOME_GRID: "home_grid_native",

  GRID_NATIVE_EVERY_6: "grid_native_every_6",
  VIDEO_RELATED_LIST: "video_related_list",
  CATEGORY_FEED: "category_feed",
  SEARCH_RESULTS_FEED: "search_results_feed",
} as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];
