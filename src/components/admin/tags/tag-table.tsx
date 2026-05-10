"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteTag, bulkDeleteTags } from "@/app/actions/tag";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  // Add this state for the alert dialog
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: "error" | "warning" | "success";
  }>({
    open: false,
    title: "",
    message: "",
    type: "error",
  });

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
      try {
        const result = await bulkDeleteTags(selected);

        // Show success message
        setAlertDialog({
          open: true,
          title: "Success",
          type: "success",
          message: `Successfully deleted ${selected.length} tag(s) and removed them from all videos.`,
        });

        setSelected([]);
        router.refresh();
      } catch (error) {
        setAlertDialog({
          open: true,
          title: "Error",
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to delete tags",
        });
      }
    });
  }

  // SINGLE DELETE
  function handleDelete() {
    if (!deleteId) return;

    startTransition(async () => {
      try {
        await deleteTag(deleteId);

        setAlertDialog({
          open: true,
          title: "Success",
          type: "success",
          message: "Tag deleted successfully and removed from all videos.",
        });

        setDeleteId(null);
        router.refresh();
      } catch (error) {
        setAlertDialog({
          open: true,
          title: "Error",
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to delete tag",
        });
        setDeleteId(null);
      }
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
            {isPending ? "Deleting..." : `Delete (${selected.length})`}
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

      {/* DELETE CONFIRM */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        loading={isPending}
        onConfirm={handleDelete}
      />

      {/* ALERT DIALOG FOR FEEDBACK */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={
                alertDialog.type === "error"
                  ? "text-destructive"
                  : alertDialog.type === "warning"
                    ? "text-yellow-600"
                    : "text-green-600"
              }
            >
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
