"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeMap: Record<string, string> = {
  videos: "Videos",
  categories: "Categories",
  tags: "Tags",
  ads: "Ads Manager",
  settings: "Settings",
};

export default function AdminBreadcrumb() {
  const pathname = usePathname();

  const segments = pathname.replace("/admin/", "").split("/").filter(Boolean);

  const last = segments[segments.length - 1] || "dashboard";

  const title = routeMap[segments.join("/")] || routeMap[last] || "Dashboard";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="hidden md:block align-middle" />

        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
