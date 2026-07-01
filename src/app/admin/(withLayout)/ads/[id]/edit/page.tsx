import { getAdById, updateAd } from "@/app/actions/ad";
import { AdForm } from "@/components/admin/ads/ad-form";
import { AdType } from "@/generated/prisma/enums";
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

type AdActionState = {
  success: boolean;
  data?: unknown;
  error?: string | null;
};

async function updateAdAction(
  id: string,
  prevState: AdActionState,
  formData: FormData,
) {
  "use server";

  const optionalInt = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string" || value.trim() === "") return null;
    return parseInt(value, 10);
  };

  const data = {
    name: formData.get("name") as string,
    type: formData.get("type") as AdType,
    script: formData.get("script") as string,
    placement: formData.get("placement") as string | null,
    weight: optionalInt("weight"),
    cooldownSeconds: optionalInt("cooldownSeconds"),
    frequencyCap: optionalInt("frequencyCap"),
    priority: optionalInt("priority"),
    isActive: formData.get("isActive") === "on",
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
