"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteTag, bulkDeleteTags } from "@/app/actions/tag";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import TagForm from "./tag-form";
import DeleteDialog from "@/components/ui/delete-dialog";

type Tag = {
  id: string;
  name: string;
  slug: string;
};

export default function TagTable({
  data,
  total,
  page,
  search,
}: {
  data: Tag[];
  total: number;
  page: number;
  search: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(search || "");
  const [selected, setSelected] = useState<string[]>([]);

  const [editItem, setEditItem] = useState<Tag | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  // SEARCH
  function handleSearch() {
    router.push(`/admin/tags?page=1&search=${searchInput}`);
  }

  // PAGINATION
  function goToPage(p: number) {
    router.push(`/admin/tags?page=${p}&search=${search}`);
  }

  // SELECT
  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (selected.length === data.length) {
      setSelected([]);
    } else {
      setSelected(data.map((d) => d.id));
    }
  }

  // BULK DELETE
  function handleBulkDelete() {
    startTransition(async () => {
      await bulkDeleteTags(selected);
      setSelected([]);
      router.refresh();
    });
  }

  // SINGLE DELETE
  function handleDelete() {
    if (!deleteId) return;

    startTransition(async () => {
      await deleteTag(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Tags</h1>

        <Button
          onClick={() =>
            setEditItem({
              id: "",
              name: "",
              slug: "",
            })
          }
        >
          + Create
        </Button>
      </div>

      {/* FORM */}
      {editItem && (
        <TagForm
          key={editItem.id || "create"}
          initialData={editItem?.id ? editItem : null}
          onSuccess={() => {
            setEditItem(null);
            router.refresh();
          }}
        />
      )}

      {/* SEARCH */}
      <div className="flex gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search tags..."
        />

        <Button onClick={handleSearch}>Search</Button>

        {selected.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            Delete ({selected.length})
          </Button>
        )}
      </div>

      {/* TABLE */}
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left w-10">
                <input
                  type="checkbox"
                  checked={selected.length === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>

              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Slug</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((tag) => (
              <tr key={tag.id} className="border-b">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(tag.id)}
                    onChange={() => toggleSelect(tag.id)}
                  />
                </td>

                <td className="p-2">{tag.name}</td>
                <td className="p-2 text-muted-foreground">{tag.slug}</td>

                <td className="p-2 text-right flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditItem(tag)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(tag.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {total > limit && (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i}
              variant={page === i + 1 ? "default" : "outline"}
              onClick={() => goToPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* DELETE CONFIRM (REUSED) */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
