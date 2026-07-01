export const AD_PLACEMENTS = {
  HEADER: "header",
  GRID_NATIVE_EVERY_6: "grid_native_every_6",
} as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];
