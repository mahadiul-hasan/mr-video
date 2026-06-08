// app/admin/ads/[id]/edit/page.tsx
import { getAdById, updateAd } from "@/app/actions/ad";
import { AdForm } from "@/components/admin/ads/ad-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Edit Ad - Admin",
  description: "Edit advertisement",
};

async function updateAdAction(id: string, prevState: any, formData: FormData) {
  "use server";

  const data = {
    name: formData.get("name") as string,
    type: formData.get("type") as any,
    script: formData.get("script") as string,
    placement: formData.get("placement") as string | null,
    weight: formData.get("weight")
      ? parseInt(formData.get("weight") as string)
      : undefined,
    priority: formData.get("priority") // ✅ Add priority
      ? parseInt(formData.get("priority") as string)
      : undefined,
    isActive: formData.get("isActive") === "on", // ✅ Fix: Switch sends "on" when checked
  };

  try {
    const result = await updateAd(id, data);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update ad",
    };
  }
}

export default async function EditAdPage({ params }: Props) {
  const { id } = await params;
  const ad = await getAdById(id);

  if (!ad) {
    notFound();
  }

  // Create a bound action with the id
  const updateAction = updateAdAction.bind(null, id);

  return (
    <div className="container max-w-3xl py-8 mx-auto">
      <div className="mb-6">
        <Link href="/admin/ads">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Ads
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Ad: {ad.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdForm
            action={updateAction}
            initialData={ad}
            submitLabel="Update Ad"
            redirectTo="/admin/ads"
          />
        </CardContent>
      </Card>
    </div>
  );
}
