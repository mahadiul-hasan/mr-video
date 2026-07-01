"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DeleteDialog from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search, Eye, Plus } from "lucide-react";
import { bulkDeleteVideos, deleteVideo } from "@/app/actions/video";

type Option = { id: string; name: string };

type VideoRow = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  duration: number;
  status: "PROCESSING" | "READY" | "FAILED";
  processingError?: string | null;
  views: number;
  createdAt: Date;
  isPublished: boolean;
  category: Option | null;
  tags: { tag: Option }[];
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoTable({
  data,
  total,
  page,
  search,
}: {
  data: VideoRow[];
  total: number;
  page: number;
  search: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search || "");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = () =>
    router.push(
      `/admin/videos?page=1&search=${encodeURIComponent(searchInput)}`,
    );
  const goToPage = (p: number) =>
    router.push(`/admin/videos?page=${p}&search=${encodeURIComponent(search)}`);

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  const toggleSelectAll = () =>
    setSelected((prev) =>
      prev.length === data.length ? [] : data.map((v) => v.id),
    );

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await bulkDeleteVideos(selected);
        setSelected([]);
        toast.success(`Deleted ${selected.length} video(s) successfully`, {
          position: "top-right",
        });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Delete failed", {
          position: "top-right",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteVideo(deleteId);
        setDeleteId(null);
        toast.success("Video deleted successfully", { position: "top-right" });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Delete failed", {
          position: "top-right",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search videos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Link href="/admin/videos/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Upload Video
          </Button>
        </Link>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-destructive">
            {selected.length} video{selected.length === 1 ? "" : "s"} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete selected
          </Button>
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.length === data.length && data.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((video) => (
              <TableRow key={video.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(video.id)}
                    onCheckedChange={() => toggleSelect(video.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-24 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={video.thumbnailUrl}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-48">
                        {video.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(video.duration)}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {video.category?.name ?? "None"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-48 truncate">
                  {video.tags.map((t) => t.tag.name).join(", ") || "-"}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={video.isPublished ? "default" : "secondary"}>
                      {video.isPublished ? "Published" : "Draft"}
                    </Badge>
                    <div>
                      <Badge
                        variant={
                          video.status === "READY"
                            ? "default"
                            : video.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {video.status.toLowerCase()}
                      </Badge>
                    </div>
                    {video.status === "FAILED" && video.processingError && (
                      <p
                        className="text-xs text-destructive max-w-56 truncate"
                        title={video.processingError}
                      >
                        {video.processingError}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{video.views.toLocaleString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/admin/videos/${video.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/watch/${video.slug}`} target="_blank">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(video.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No videos found. Click Upload Video to get started.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const pageNum =
              totalPages <= 5
                ? i + 1
                : page <= 3
                  ? i + 1
                  : page >= totalPages - 2
                    ? totalPages - 4 + i
                    : page - 2 + i;
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                onClick={() => goToPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
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

