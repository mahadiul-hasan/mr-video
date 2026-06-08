// components/admin/ads/ad-table.tsx
"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAd } from "@/app/actions/ad";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import DeleteDialog from "@/components/ui/delete-dialog";
import { toast } from "sonner";

type Ad = {
  id: string;
  name: string;
  type: string;
  placement: string | null;
  isActive: boolean;
  priority: number;
};

type AdTableProps = {
  data: Ad[];
};

export function AdTable({ data }: AdTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (!deleteId) return;

    startTransition(async () => {
      try {
        await deleteAd(deleteId);
        toast.success("Ad deleted successfully.", {
          position: "top-right",
        });
        setDeleteId(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete ad",
          {
            position: "top-right",
          },
        );
        setDeleteId(null);
      }
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Placement</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((ad) => (
            <TableRow key={ad.id}>
              <TableCell className="font-medium">{ad.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{ad.type}</Badge>
              </TableCell>
              <TableCell>{ad.placement || "—"}</TableCell>
              <TableCell>{ad.priority}</TableCell>
              <TableCell>
                <Badge variant={ad.isActive ? "default" : "secondary"}>
                  {ad.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Link href={`/admin/ads/${ad.id}/edit`}>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteId(ad.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
