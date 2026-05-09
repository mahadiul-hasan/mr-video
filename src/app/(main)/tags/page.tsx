import { getPublicTags } from "@/lib/videos/public-videos";
import { TaxonomyList } from "@/components/site/taxonomy-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Hash } from "lucide-react";

export const revalidate = 3600;

export default async function TagsPage() {
  const tags = await getPublicTags();

  if (!tags || tags.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Alert>
          <Hash className="h-4 w-4" />
          <AlertTitle>No tags found</AlertTitle>
          <AlertDescription>
            There are no tags available at the moment. Please check back later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <TaxonomyList
        title="Tags"
        description="Browse videos by tag."
        items={tags}
        basePath="/tag"
      />
    </div>
  );
}
