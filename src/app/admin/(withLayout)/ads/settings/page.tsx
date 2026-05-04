import { getAdSettings } from "@/app/actions/ad";
import AdSettingsForm from "@/components/admin/ads/ad-settings-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MR Video | Ads Settings Management",
  description: "Configure monetization engine settings for MR Video.",
};

export default async function Page() {
  const settings = await getAdSettings();

  return (
    <div>
      <AdSettingsForm initialData={settings} />
    </div>
  );
}
