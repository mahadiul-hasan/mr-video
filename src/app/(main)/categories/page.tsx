import { getPublicCategories } from "@/lib/videos/public-videos";
import { TaxonomyList } from "@/components/site/taxonomy-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await getPublicCategories();

  if (!categories || categories.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No categories found</AlertTitle>
          <AlertDescription>
            There are no categories available at the moment. Please check back
            later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <TaxonomyList
        title="Categories"
        description="Browse videos by category."
        items={categories}
        basePath="/category"
      />
    </div>
  );
}
