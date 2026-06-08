// app/admin/ads/page.tsx
import { getAds } from "@/app/actions/ad";
import { AdTable } from "@/components/admin/ads/ad-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function AdsPage() {
  const ads = await getAds();

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ad Manager</h1>

        <Link href="/admin/ads/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Ad
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Ads</CardTitle>
        </CardHeader>
        <CardContent>
          <AdTable data={ads} />
        </CardContent>
      </Card>
    </div>
  );
}
