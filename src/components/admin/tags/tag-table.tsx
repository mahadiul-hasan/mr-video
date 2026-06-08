// components/admin/tags/tag-table.tsx
"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteTag, bulkDeleteTags } from "@/app/actions/tag";
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

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type TagTableProps = {
  tags: Tag[];
  total: number;
  currentPage: number;
  search: string;
};

export function TagTable({ tags, total, currentPage, search }: TagTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search || "");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = () => {
    router.push(`/admin/tags?page=1&search=${encodeURIComponent(searchInput)}`);
  };

  const goToPage = (page: number) => {
    router.push(
      `/admin/tags?page=${page}&search=${encodeURIComponent(search)}`,
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === tags.length) {
      setSelected([]);
    } else {
      setSelected(tags.map((t) => t.id));
    }
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      const result = await bulkDeleteTags(selected);

      if (result.success) {
        toast.success(`Deleted ${result.deletedCount} tag(s) successfully.`, {
          position: "top-right",
        });

        if (result.nonDeletableTags?.length > 0) {
          toast.warning(
            `${result.nonDeletableTags.length} tag(s) couldn't be deleted because they're used in videos.`,
            { position: "top-right" },
          );
        }

        setSelected([]);
        router.refresh();
      } else if (result.error === "TAGS_IN_USE") {
        toast.error(
          result.message ||
            "Cannot delete tags that are associated with videos",
          {
            position: "top-right",
          },
        );
      } else {
        toast.error(result.error || "Failed to delete tags", {
          position: "top-right",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteTag(deleteId);

      if (result.success) {
        toast.success(`Tag "${result.deletedTag}" deleted successfully.`, {
          position: "top-right",
        });
        setDeleteId(null);
        router.refresh();
      } else if (result.error === "TAG_IN_USE") {
        toast.error(
          result.message || "Cannot delete tag that is associated with videos",
          {
            position: "top-right",
          },
        );
        setDeleteId(null);
      } else {
        toast.error(result.error || "Failed to delete tag", {
          position: "top-right",
        });
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search tags..."
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.length === tags.length && tags.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(tag.id)}
                    onCheckedChange={() => toggleSelect(tag.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tag.slug}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/admin/tags/${tag.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(tag.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {tags.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {search
              ? "No tags found matching your search."
              : "No tags yet. Create your first tag!"}
          </div>
        )}
      </div>

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

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
