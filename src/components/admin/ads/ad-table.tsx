"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteAd } from "@/app/actions/ad";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import AdForm from "./ad-form";
import DeleteDialog from "@/components/ui/delete-dialog";
import { AdType } from "@/generated/prisma/enums";

type Ad = {
  id: string;
  name: string;
  type: AdType;
  placement: string | null;
};

export default function AdTable({ data }: { data: Ad[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editItem, setEditItem] = useState<Ad | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleDelete() {
    if (!deleteId) return;

    startTransition(async () => {
      await deleteAd(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Ads Manager</h1>

        <Button onClick={() => setEditItem({} as Ad)}>+ Create Ad</Button>
      </div>

      {editItem && (
        <Card>
          <CardHeader>
            <CardTitle>{editItem.id ? "Edit Ad" : "Create Ad"}</CardTitle>
          </CardHeader>

          <CardContent>
            <AdForm
              key={editItem.id || "create"}
              initialData={editItem}
              onSuccess={() => {
                setEditItem(null);
                router.refresh();
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>{ad.name}</TableCell>

                  <TableCell>
                    <Badge>{ad.type}</Badge>
                  </TableCell>

                  <TableCell>{ad.placement ?? "—"}</TableCell>

                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditItem(ad)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(ad.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
