import { AppSidebar } from "@/components/admin/app-sidebar";
import AdminBreadcrumb from "@/components/admin/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 flex h-16 items-center gap-2 border-b bg-background px-4 z-50">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <AdminBreadcrumb />
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
