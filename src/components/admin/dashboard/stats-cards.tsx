export default function StatsCards({
  totalVideos,
  publishedVideos,
  totalCategories,
  totalTags,
}: {
  totalVideos: number;
  publishedVideos: number;
  totalCategories: number;
  totalTags: number;
}) {
  const items = [
    { label: "Total Videos", value: totalVideos },
    { label: "Published Videos", value: publishedVideos },
    { label: "Categories", value: totalCategories },
    { label: "Tags", value: totalTags },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="border rounded-lg p-4 bg-background">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className="text-2xl font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
