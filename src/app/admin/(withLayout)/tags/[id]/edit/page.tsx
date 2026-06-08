// app/admin/tags/[id]/edit/page.tsx
import { getTagById, updateTag } from "@/app/actions/tag";
import { TagForm } from "@/components/admin/tags/tag-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Edit Tag - Admin",
  description: "Edit tag",
};

async function updateTagAction(id: string, prevState: any, formData: FormData) {
  "use server";

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  return updateTag(id, { name, slug });
}

export default async function EditTagPage({ params }: Props) {
  const { id } = await params;
  const tag = await getTagById(id);

  const updateAction = updateTagAction.bind(null, id);

  return (
    <div className="container max-w-2xl py-8">
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
          <CardTitle>Edit Tag: {tag.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <TagForm
            action={updateAction}
            initialData={tag}
            submitLabel="Update Tag"
            redirectTo="/admin/tags"
          />
        </CardContent>
      </Card>
    </div>
  );
}
