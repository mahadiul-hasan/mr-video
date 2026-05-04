import { getTags, getTagCount } from "@/app/actions/tag";
import TagTable from "@/components/admin/tags/tag-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MR Video | Tag Management",
  description: "Manage video tags for MR Video.",
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
    getTags({ page, limit: 10, search }),
    getTagCount(search),
  ]);

  return (
    <div>
      <TagTable data={data} total={total} page={page} search={search} />
    </div>
  );
}
