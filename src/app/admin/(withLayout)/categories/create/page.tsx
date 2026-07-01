import { createCategory } from "@/app/actions/category";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Create Category - Admin",
  description: "Create a new category",
};

async function createCategoryAction(prevState: unknown, formData: FormData) {
  "use server";

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  return createCategory({ name, slug });
}

export default function CreateCategoryPage() {
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
          <CardTitle>Create New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            action={createCategoryAction}
            submitLabel="Create Category"
            redirectTo="/admin/categories"
          />
        </CardContent>
      </Card>
    </div>
  );
}

