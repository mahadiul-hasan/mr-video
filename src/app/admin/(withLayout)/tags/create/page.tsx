// app/admin/tags/create/page.tsx
import { createTag } from "@/app/actions/tag";
import { TagForm } from "@/components/admin/tags/tag-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Create Tag - Admin",
  description: "Create a new tag",
};

async function createTagAction(prevState: any, formData: FormData) {
  "use server";

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  return createTag({ name, slug });
}

export default function CreateTagPage() {
  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <div className="mb-6">
        <Link href="/admin/tags">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tags
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <TagForm
            action={createTagAction}
            submitLabel="Create Tag"
            redirectTo="/admin/tags"
          />
        </CardContent>
      </Card>
    </div>
  );
}
