"use client";

import { useState, useTransition } from "react";
import { updateAdSettings } from "@/app/actions/ad";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";

type AdSettingsState = {
  popunderEnabled: boolean;
  smartlinkEnabled: boolean;
  interstitialEnabled: boolean;
  socialBarEnabled: boolean;
  bannerEnabled: boolean;
  nativeEnabled: boolean;

  smartlinkMinPerMinute: number;
  smartlinkMaxPerMinute: number;
  interstitialGapSeconds: number;
  interstitialEveryVideos: number;
  popunderCooldownHours: number;
};

export default function AdSettingsForm({
  initialData,
}: {
  initialData: Partial<AdSettingsState> | null;
}) {
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<AdSettingsState>({
    popunderEnabled: initialData?.popunderEnabled ?? true,
    smartlinkEnabled: initialData?.smartlinkEnabled ?? true,
    interstitialEnabled: initialData?.interstitialEnabled ?? true,
    socialBarEnabled: initialData?.socialBarEnabled ?? true,
    bannerEnabled: initialData?.bannerEnabled ?? true,
    nativeEnabled: initialData?.nativeEnabled ?? true,

    smartlinkMinPerMinute: initialData?.smartlinkMinPerMinute ?? 2,
    smartlinkMaxPerMinute: initialData?.smartlinkMaxPerMinute ?? 3,
    interstitialGapSeconds: initialData?.interstitialGapSeconds ?? 60,
    interstitialEveryVideos: initialData?.interstitialEveryVideos ?? 3,
    popunderCooldownHours: initialData?.popunderCooldownHours ?? 24,
  });

  function updateField<K extends keyof AdSettingsState>(
    key: K,
    value: AdSettingsState[K],
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSave() {
    // 🔥 simple validation (important for engine stability)
    if (settings.smartlinkMinPerMinute > settings.smartlinkMaxPerMinute) {
      toast.error("Smartlink min cannot exceed max");
      return;
    }

    startTransition(async () => {
      try {
        await updateAdSettings(settings);

        toast.success("Settings saved", {
          position: "top-right",
        });
      } catch {
        toast.error("Failed to save settings");
      }
    });
  }

  const TOGGLES: {
    key: keyof Pick<
      AdSettingsState,
      | "popunderEnabled"
      | "smartlinkEnabled"
      | "interstitialEnabled"
      | "socialBarEnabled"
      | "bannerEnabled"
      | "nativeEnabled"
    >;
    label: string;
    id: string;
  }[] = [
    { key: "popunderEnabled", label: "Popunder", id: "pop" },
    { key: "smartlinkEnabled", label: "SmartLink", id: "smart" },
    { key: "interstitialEnabled", label: "Interstitial", id: "inter" },
    { key: "socialBarEnabled", label: "Social Bar", id: "social" },
    { key: "bannerEnabled", label: "Banner", id: "banner" },
    { key: "nativeEnabled", label: "Native", id: "native" },
  ];

  const NUMBERS: {
    key: keyof Pick<
      AdSettingsState,
      | "smartlinkMinPerMinute"
      | "smartlinkMaxPerMinute"
      | "interstitialGapSeconds"
      | "interstitialEveryVideos"
      | "popunderCooldownHours"
    >;
    label: string;
  }[] = [
    { key: "smartlinkMinPerMinute", label: "Smartlink Min/min" },
    { key: "smartlinkMaxPerMinute", label: "Smartlink Max/min" },
    { key: "interstitialGapSeconds", label: "Interstitial Gap (sec)" },
    { key: "interstitialEveryVideos", label: "Every X Videos" },
    { key: "popunderCooldownHours", label: "Popunder Cooldown (hrs)" },
  ];

  return (
    <div className="space-y-6 border p-6 rounded-lg bg-background">
      {/* ================= TOGGLES ================= */}
      <div>
        <h2 className="font-semibold mb-3">Global Ad Controls</h2>

        {TOGGLES.map(({ key, label, id }) => (
          <div key={id} className="flex items-center gap-2 py-2">
            <Checkbox
              id={id}
              checked={settings[key] ?? false}
              onCheckedChange={(v) => updateField(key, v === true)}
            />
            <Label htmlFor={id}>{label}</Label>
          </div>
        ))}
      </div>

      {/* ================= ENGINE RULES ================= */}
      <div>
        <h2 className="font-semibold mb-3">Engine Tuning</h2>

        <div className="grid grid-cols-2 gap-3">
          {NUMBERS.map(({ key, label }) => (
            <div key={key}>
              <Label className="mb-3">{label}</Label>
              <Input
                type="number"
                value={settings[key] ?? 0}
                onChange={(e) => updateField(key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
