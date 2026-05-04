"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteVideos, deleteVideo } from "@/app/actions/video";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import VideoForm, { type VideoFormData } from "./video-form";

type Option = {
  id: string;
  name: string;
};

type VideoRow = VideoFormData & {
  thumbnailUrl: string;
  duration: number;
  views: number;
  createdAt: Date;
  category: Option | null;
};

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function VideoTable({
  data,
  total,
  page,
  search,
  categories,
  tags,
  uploadConfig,
}: {
  data: VideoRow[];
  total: number;
  page: number;
  search: string;
  categories: Option[];
  tags: Option[];
  uploadConfig: {
    cloudName: string;
    uploadPreset: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search || "");
  const [selected, setSelected] = useState<string[]>([]);
  const [editItem, setEditItem] = useState<VideoFormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  function handleSearch() {
    router.push(`/admin/videos?page=1&search=${encodeURIComponent(searchInput)}`);
  }

  function goToPage(nextPage: number) {
    router.push(
      `/admin/videos?page=${nextPage}&search=${encodeURIComponent(search)}`,
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.length === data.length ? [] : data.map((video) => video.id ?? ""),
    );
  }

  function handleBulkDelete() {
    startTransition(async () => {
      try {
        await bulkDeleteVideos(selected);
        setSelected([]);
        toast.success("Videos deleted");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Delete failed");
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;

    startTransition(async () => {
      try {
        await deleteVideo(deleteId);
        setDeleteId(null);
        toast.success("Video deleted");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Delete failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Videos</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, publish, search, and remove uploaded videos.
          </p>
        </div>

        <Button
          onClick={() =>
            setEditItem({
              title: "",
              slug: "",
              description: "",
              categoryId: null,
              isPublished: false,
              tags: [],
            })
          }
        >
          + Create
        </Button>
      </div>

      {editItem && (
        <VideoForm
          key={editItem.id ?? "create"}
          initialData={editItem.id ? editItem : null}
          categories={categories}
          tags={tags}
          uploadConfig={uploadConfig}
          onSuccess={() => {
            setEditItem(null);
            router.refresh();
          }}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search videos, categories, tags..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSearch();
          }}
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

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-225 text-sm">
          <thead className="border-b bg-muted">
            <tr>
              <th className="w-10 p-2 text-left">
                <input
                  type="checkbox"
                  checked={selected.length === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-2 text-left">Video</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Tags</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Views</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No videos found.
                </td>
              </tr>
            )}

            {data.map((video) => (
              <tr key={video.id} className="border-b transition hover:bg-muted/50">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(video.id ?? "")}
                    onChange={() => toggleSelect(video.id ?? "")}
                  />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-14 w-24 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{video.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {video.slug} · {formatDuration(video.duration)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-2 text-muted-foreground">
                  {video.category?.name ?? "None"}
                </td>
                <td className="p-2 text-muted-foreground">
                  {video.tags.map((item) => item.tag.name).join(", ") || "None"}
                </td>
                <td className="p-2">
                  <span className="rounded-md border px-2 py-1 text-xs">
                    {video.isPublished ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="p-2 text-muted-foreground">{video.views}</td>
                <td className="p-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditItem(video)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(video.id ?? null)}
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

      {total > limit && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <Button
              key={index}
              variant={page === index + 1 ? "default" : "outline"}
              onClick={() => goToPage(index + 1)}
            >
              {index + 1}
            </Button>
          ))}
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
