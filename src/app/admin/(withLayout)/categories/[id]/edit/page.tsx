import { getCategoryById, updateCategory } from "@/app/actions/category";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Edit Category - Admin",
  description: "Edit category",
};

async function updateCategoryAction(
  id: string,
  prevState: any,
  formData: FormData,
) {
  "use server";

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  return updateCategory(id, { name, slug });
}

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  const result = await getCategoryById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const updateAction = updateCategoryAction.bind(null, id);

  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <div className="mb-6">
        <Link href="/admin/categories">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Category: {result.data.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            action={updateAction}
            initialData={result.data}
            submitLabel="Update Category"
            redirectTo="/admin/categories"
          />
        </CardContent>
      </Card>
    </div>
  );
}
