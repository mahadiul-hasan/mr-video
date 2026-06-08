// app/admin/ads/create/page.tsx
import { createAd } from "@/app/actions/ad";
import { AdForm } from "@/components/admin/ads/ad-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Create Ad - Admin",
  description: "Create a new advertisement",
};

// Fix the server action wrapper
async function createAdAction(prevState: any, formData: FormData) {
  "use server";

  const data = {
    name: formData.get("name") as string,
    type: formData.get("type") as any,
    script: formData.get("script") as string,
    placement: formData.get("placement") as string | null,
    weight: formData.get("weight")
      ? parseInt(formData.get("weight") as string)
      : 1,
    isActive: formData.get("isActive") === "true",
  };

  try {
    const result = await createAd(data);

    // ✅ Return proper success response
    return {
      success: true,
      data: result,
      error: null,
      errors: null,
    };
  } catch (error) {
    // ✅ Return proper error response
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ad",
      errors: null,
      data: null,
    };
  }
}

export default function CreateAdPage() {
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
          <CardTitle>Create New Ad</CardTitle>
        </CardHeader>
        <CardContent>
          <AdForm
            action={createAdAction}
            submitLabel="Create Ad"
            redirectTo="/admin/ads" // Redirect here after success
          />
        </CardContent>
      </Card>
    </div>
  );
}
