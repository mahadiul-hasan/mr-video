// app/admin/categories/page.tsx
import { getCategories, getCategoryCount } from "@/app/actions/category";
import { CategoryTable } from "@/components/admin/categories/category-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
};

export const metadata = {
  title: "Categories - Admin",
  description: "Manage categories",
};

export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const search = params.search || "";
  const limit = 10;

  // Get categories and total count using your existing functions
  const categories = await getCategories({ page, limit, search });
  const total = await getCategoryCount(search);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Category Manager</h1>

        <Link href="/admin/categories/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Category
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryTable
            categories={categories}
            total={total}
            currentPage={page}
            search={search}
          />
        </CardContent>
      </Card>
    </div>
  );
}
