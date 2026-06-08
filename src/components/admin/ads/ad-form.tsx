// components/admin/ads/ad-form.tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdType } from "@/generated/prisma/enums";
import { toast } from "sonner";
import TypeSelect from "./type-select";
import PlacementSelect from "./placement-select";
import { requiresPlacement } from "@/lib/ads/ad-rules";

type AdFormProps = {
  action: (prevState: any, formData: FormData) => Promise<any>;
  initialData?: {
    id?: string;
    name?: string;
    type?: AdType;
    script?: string;
    placement?: string | null;
    cooldownSeconds?: number | null;
    frequencyCap?: number | null;
    weight?: number | null;
    isActive?: boolean;
    priority?: number;
  };
  submitLabel: string;
  redirectTo?: string;
};

export function AdForm({
  action,
  initialData,
  submitLabel,
  redirectTo,
}: AdFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, {
    success: false,
    error: null,
    errors: null,
    data: null,
  });

  // Local state for form fields
  const [selectedType, setSelectedType] = useState<AdType>(
    initialData?.type || "BANNER",
  );
  const [placement, setPlacement] = useState<string>(
    initialData?.placement || "",
  );

  const showPlacement = requiresPlacement(selectedType);

  // Handle redirect after success
  useEffect(() => {
    if (state?.success && redirectTo) {
      toast.success(
        `Ad ${initialData?.id ? "updated" : "created"} successfully.`,
        {
          position: "top-right",
        },
      );
      router.push(redirectTo);
      router.refresh();
    }

    if (state?.error) {
      toast.error(state.error, {
        position: "top-right",
      });
    }
  }, [state?.success, state?.error, redirectTo, router, initialData?.id]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Ad Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Ad Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter ad name"
          defaultValue={initialData?.name || ""}
          required
          className="w-full"
        />
      </div>

      {/* Ad Type - Using TypeSelect component */}
      <div className="space-y-2">
        <Label htmlFor="type">Ad Type</Label>
        <input type="hidden" name="type" value={selectedType} />
        <TypeSelect
          value={selectedType}
          onChange={(value) => setSelectedType(value)}
        />
      </div>

      {/* Placement - Only show if required by ad type */}
      {showPlacement && (
        <div className="space-y-2">
          <Label htmlFor="placement">Placement</Label>
          <input type="hidden" name="placement" value={placement} />
          <PlacementSelect
            value={placement}
            onChange={(value) => setPlacement(value)}
          />
        </div>
      )}

      {/* If placement not required, send null */}
      {!showPlacement && <input type="hidden" name="placement" value="" />}

      {/* Script */}
      <div className="space-y-2">
        <Label htmlFor="script">Script</Label>
        <Textarea
          id="script"
          name="script"
          placeholder="Paste ad script here"
          defaultValue={initialData?.script || ""}
          rows={6}
          required
          className="w-full font-mono text-sm"
        />
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <Label htmlFor="weight">Weight (Priority)</Label>
        <Input
          id="weight"
          name="weight"
          type="number"
          placeholder="Higher weight = higher priority"
          defaultValue={initialData?.weight || 1}
          min={1}
          max={1000}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Controls how often this ad is shown relative to others
        </p>
      </div>

      {/* Cooldown Seconds (for popunders) */}
      {selectedType === "POPUNDER" && (
        <div className="space-y-2">
          <Label htmlFor="cooldownSeconds">Cooldown (seconds)</Label>
          <Input
            id="cooldownSeconds"
            name="cooldownSeconds"
            type="number"
            placeholder="Time between showing this ad"
            defaultValue={initialData?.cooldownSeconds || ""}
            min={0}
            max={86400}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            How many seconds to wait before showing this ad again
          </p>
        </div>
      )}

      {/* Frequency Cap */}
      <div className="space-y-2">
        <Label htmlFor="frequencyCap">Frequency Cap</Label>
        <Input
          id="frequencyCap"
          name="frequencyCap"
          type="number"
          placeholder="Max times per user"
          defaultValue={initialData?.frequencyCap || ""}
          min={1}
          max={1000}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Maximum number of times this ad can be shown to a single user
        </p>
      </div>

      {/* Priority (for ordering) */}
      <div className="space-y-2">
        <Label htmlFor="priority">Display Priority</Label>
        <Input
          id="priority"
          name="priority"
          type="number"
          placeholder="Order priority (higher = shows first)"
          defaultValue={initialData?.priority || 0}
          min={0}
          max={1000}
          className="w-full"
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label htmlFor="isActive" className="cursor-pointer">
          Active
        </Label>
        <Switch
          className="cursor-pointer"
          id="isActive"
          name="isActive"
          defaultChecked={initialData?.isActive ?? true}
          value="on"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Processing..." : submitLabel}
      </Button>
    </form>
  );
}
