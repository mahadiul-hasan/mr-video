"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteCategory, bulkDeleteCategories } from "@/app/actions/category";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search } from "lucide-react";
import DeleteDialog from "@/components/ui/delete-dialog";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type CategoryTableProps = {
  categories: Category[];
  total: number;
  currentPage: number;
  search: string;
};

export function CategoryTable({
  categories,
  total,
  currentPage,
  search,
}: CategoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search || "");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = () => {
    router.push(
      `/admin/categories?page=1&search=${encodeURIComponent(searchInput)}`,
    );
  };

  const goToPage = (page: number) => {
    router.push(
      `/admin/categories?page=${page}&search=${encodeURIComponent(search)}`,
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === categories.length) {
      setSelected([]);
    } else {
      setSelected(categories.map((c) => c.id));
    }
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      const result = await bulkDeleteCategories(selected);
      if (result.success) {
        toast.success(
          `Deleted ${selected.length} category${selected.length > 1 ? "ies" : "y"} successfully.`,
          {
            position: "top-right",
          },
        );
        setSelected([]);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete categories", {
          position: "top-right",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteCategory(deleteId);
      if (result.success) {
        toast.success("Category deleted successfully.", {
          position: "top-right",
        });
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete category", {
          position: "top-right",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search categories..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} variant="secondary" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {selected.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            Delete Selected ({selected.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    selected.length === categories.length &&
                    categories.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(category.id)}
                    onCheckedChange={() => toggleSelect(category.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{category.slug}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/admin/categories/${category.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(category.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {categories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {search
              ? "No categories found matching your search."
              : "No categories yet. Create your first category!"}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                onClick={() => goToPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            variant="outline"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
