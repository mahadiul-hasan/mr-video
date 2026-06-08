"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AdType } from "@/lib/ads/ad-types";

const TYPES: AdType[] = [
  "POPUNDER",
  "SOCIAL_BAR",
  "NATIVE_BANNER",
  "BANNER",
  "SMARTLINK",
];

export default function TypeSelect({
  value,
  onChange,
}: {
  value: AdType;
  onChange: (v: AdType) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select ad type" />
      </SelectTrigger>

      <SelectContent>
        {TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
