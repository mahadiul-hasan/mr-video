// app/admin/tags/page.tsx
import { getTags, getTagCount } from "@/app/actions/tag";
import { TagTable } from "@/components/admin/tags/tag-table";
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
  title: "Tags - Admin",
  description: "Manage tags",
};

export default async function TagsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const search = params.search || "";
  const limit = 10;

  const tags = await getTags({ page, limit, search });
  const total = await getTagCount(search);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tag Manager</h1>

        <Link href="/admin/tags/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Tag
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <TagTable
            tags={tags}
            total={total}
            currentPage={page}
            search={search}
          />
        </CardContent>
      </Card>
    </div>
  );
}
