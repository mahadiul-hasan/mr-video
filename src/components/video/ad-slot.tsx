"use client";

import { useEffect, useRef } from "react";
import type { AdType } from "@/lib/ads/ad-types";
import type { MonetizationAd } from "@/lib/ads/engine/types";

type AdSlotProps = {
  type: AdType;
  label: string;
  ad?: MonetizationAd | null;
  compact?: boolean;
};

export function AdSlot({ type, label, ad, compact = false }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ad?.script || !ref.current) return;

    const target = ref.current;
    target.innerHTML = "";

    const container = document.createElement("div");
    container.innerHTML = ad.script;

    const scripts = Array.from(container.querySelectorAll("script"));
    scripts.forEach((scriptNode) => scriptNode.remove());

    target.append(...Array.from(container.childNodes));

    for (const scriptNode of scripts) {
      const executableScript = document.createElement("script");

      for (const attribute of Array.from(scriptNode.attributes)) {
        executableScript.setAttribute(attribute.name, attribute.value);
      }

      executableScript.text = scriptNode.text;
      target.appendChild(executableScript);
    }
  }, [ad?.id, ad?.script]);

  if (!ad) return null;

  return (
    <aside
      ref={ref}
      className={[
        "flex items-center justify-center border border-dashed border-border bg-muted/45 text-muted-foreground",
        compact
          ? "min-h-28 rounded-md p-4 text-xs"
          : "min-h-20 rounded-md p-5 text-sm",
      ].join(" ")}
      data-ad-slot={type}
    >
      <span className="sr-only">{label}</span>
    </aside>
  );
}
