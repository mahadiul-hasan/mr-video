"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteCategory, bulkDeleteCategories } from "@/app/actions/category";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import CategoryForm from "@/components/admin/categories/category-form";
import DeleteDialog from "@/components/ui/delete-dialog";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function CategoryTable({
  data,
  total,
  page,
  search,
}: {
  data: Category[];
  total: number;
  page: number;
  search: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(search || "");
  const [selected, setSelected] = useState<string[]>([]);

  const [editItem, setEditItem] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  // ---------------- SEARCH ----------------
  function handleSearch() {
    router.push(`/admin/categories?page=1&search=${searchInput}`);
  }

  // ---------------- PAGINATION ----------------
  function goToPage(p: number) {
    router.push(`/admin/categories?page=${p}&search=${search}`);
  }

  // ---------------- SELECT ----------------
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

  // ---------------- BULK DELETE ----------------
  function handleBulkDelete() {
    startTransition(async () => {
      await bulkDeleteCategories(selected);
      setSelected([]);
      router.refresh();
    });
  }

  // ---------------- SINGLE DELETE ----------------
  function handleDelete() {
    if (!deleteId) return;

    startTransition(async () => {
      await deleteCategory(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg font-semibold">Categories</h1>

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
        <CategoryForm
          key={editItem.id || "create"}
          initialData={editItem?.id ? editItem : null}
          onSuccess={() => {
            setEditItem(null);
            router.refresh();
          }}
        />
      )}

      {/* SEARCH + BULK */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          placeholder="Search categories..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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

      {/* TABLE WRAPPER (RESPONSIVE CORE FIX) */}
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead className="bg-muted border-b">
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
            {data.map((cat) => (
              <tr
                key={cat.id}
                className="border-b hover:bg-muted/50 transition"
              >
                {/* SELECT */}
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(cat.id)}
                    onChange={() => toggleSelect(cat.id)}
                  />
                </td>

                {/* DATA */}
                <td className="p-2 font-medium">{cat.name}</td>

                <td className="p-2 text-muted-foreground">{cat.slug}</td>

                {/* ACTIONS */}
                <td className="p-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditItem(cat)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(cat.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {total > limit && (
        <div className="flex flex-wrap gap-2">
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

      {/* DELETE CONFIRM */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
