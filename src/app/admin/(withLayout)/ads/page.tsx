import { getAds } from "@/app/actions/ad";
import AdTable from "@/components/admin/ads/ad-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MR Video | Ads Management",
  description: "Manage monetization ad units for MR Video.",
};

export default async function Page() {
  const ads = await getAds();

  return (
    <div>
      <AdTable data={ads} />
    </div>
  );
}
