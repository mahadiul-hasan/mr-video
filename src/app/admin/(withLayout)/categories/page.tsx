import { getCategories, getCategoryCount } from "@/app/actions/category";
import CategoryTable from "@/components/admin/categories/category-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MR Video | Category Management",
  description: "Manage video categories for MR Video.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;

  const page = Number(params.page || 1);
  const search = params.search || "";

  const [data, total] = await Promise.all([
    getCategories({ page, limit: 10, search }),
    getCategoryCount(search),
  ]);

  return (
    <div>
      <CategoryTable data={data} total={total} page={page} search={search} />
    </div>
  );
}
