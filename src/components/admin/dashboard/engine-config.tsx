type EngineSettings = {
  smartlinkEnabled: boolean;
  popunderEnabled: boolean;
  interstitialEnabled: boolean;
  socialBarEnabled: boolean;
  smartlinkMinPerMinute: number;
  smartlinkMaxPerMinute: number;
  interstitialEveryVideos: number;
  interstitialGapSeconds: number;
  popunderCooldownHours: number;
};

export default function EngineConfig({
  settings,
}: {
  settings: EngineSettings | null;
}) {
  if (!settings) {
    return <div className="border p-4 rounded-lg">No settings configured</div>;
  }

  return (
    <div className="border rounded-lg p-4 bg-background space-y-3">
      <h2 className="font-semibold">Ad Engine Config</h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>Smartlink: {settings.smartlinkEnabled ? "ON" : "OFF"}</div>
        <div>Popunder: {settings.popunderEnabled ? "ON" : "OFF"}</div>
        <div>Interstitial: {settings.interstitialEnabled ? "ON" : "OFF"}</div>
        <div>Social Bar: {settings.socialBarEnabled ? "ON" : "OFF"}</div>

        <div>
          Smartlink Rate: {settings.smartlinkMinPerMinute}–
          {settings.smartlinkMaxPerMinute}/min
        </div>

        <div>Interstitial: every {settings.interstitialEveryVideos} videos</div>

        <div>Gap: {settings.interstitialGapSeconds}s</div>

        <div>Popunder Cooldown: {settings.popunderCooldownHours}h</div>
      </div>
    </div>
  );
}
