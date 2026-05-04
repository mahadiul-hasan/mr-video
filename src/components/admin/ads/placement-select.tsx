"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type AdPlacement } from "@/lib/ads/ad-placements";

const PLACEMENT_LABELS: Partial<Record<AdPlacement, string>> = {
  video_top: "Video Player - Top (Pre-play)",
  video_bottom: "Video Player - Bottom",
  sidebar: "Sidebar",
  header: "Header",
  footer: "Footer",
  home_grid_native: "Home Grid Native",

  grid_native_every_6: "Feed - Every 6 Items",
  video_related_list: "Related Videos",
  category_feed: "Category Feed",
  search_results_feed: "Search Results",
};

const ALLOWED_PLACEMENTS: AdPlacement[] = [
  "video_top",
  "video_bottom",
  "sidebar",
  "header",
  "footer",
  "home_grid_native",
  "grid_native_every_6",
  "video_related_list",
  "category_feed",
  "search_results_feed",
];

export default function PlacementSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select placement" />
      </SelectTrigger>

      <SelectContent>
        {ALLOWED_PLACEMENTS.map((p) => (
          <SelectItem key={p} value={p}>
            {PLACEMENT_LABELS[p] ?? p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
