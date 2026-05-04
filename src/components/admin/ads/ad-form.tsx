"use client";

import { useState, useTransition } from "react";
import { createAd, updateAd } from "@/app/actions/ad";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import TypeSelect from "./type-select";
import PlacementSelect from "./placement-select";

import { AdType } from "@/lib/ads/ad-types";
import { requiresPlacement } from "@/lib/ads/ad-rules";

type Ad = {
  id?: string;
  name: string;
  type: AdType;
  script: string;
  placement: string | null;
};

export default function AdForm({
  initialData,
  onSuccess,
}: {
  initialData?: Partial<Ad>;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<AdType>(initialData?.type ?? "BANNER");
  const [placement, setPlacement] = useState<string | null>(
    initialData?.placement ?? null,
  );
  const [script, setScript] = useState(initialData?.script ?? "");

  const isEdit = !!initialData?.id;

  const showPlacement = requiresPlacement(type);

  function handleSubmit() {
    startTransition(async () => {
      const payload = {
        name,
        type,
        script,
        placement: showPlacement ? placement : null,
      };

      if (isEdit && initialData?.id) {
        await updateAd(initialData.id, payload);
      } else {
        await createAd(payload);
      }

      onSuccess?.();
    });
  }

  return (
    <div className="space-y-3 border p-4 rounded bg-background">
      <Input
        placeholder="Ad Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <TypeSelect value={type} onChange={setType} />

      {showPlacement && (
        <PlacementSelect
          value={placement ?? ""}
          onChange={(v) => setPlacement(v)}
        />
      )}

      <Textarea
        placeholder="Paste Adsterra script"
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />

      <Button onClick={handleSubmit} disabled={isPending}>
        {isEdit ? "Update" : "Create"}
      </Button>
    </div>
  );
}
