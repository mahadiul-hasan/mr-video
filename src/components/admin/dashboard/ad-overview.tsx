type AdEngineView = {
  id: string;
  name: string;
  type: string;
  placement: string | null;
  isActive: boolean;
  weight: number;
  cooldownSeconds: number | null;
  frequencyCap: number | null;
  priority: number;
};

export default function AdOverview({ ads }: { ads: AdEngineView[] }) {
  const grouped = ads.reduce<Record<string, AdEngineView[]>>((acc, ad) => {
    if (!acc[ad.type]) acc[ad.type] = [];
    acc[ad.type].push(ad);
    return acc;
  }, {});

  return (
    <div className="border rounded-lg p-4 bg-background">
      <h2 className="font-semibold mb-4">Ad Inventory</h2>

      <div className="space-y-3">
        {Object.entries(grouped).map(([type, list]) => (
          <div key={type} className="flex justify-between">
            <span>{type}</span>
            <span className="text-muted-foreground">{list.length} ads</span>
          </div>
        ))}
      </div>
    </div>
  );
}
