import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <AdminSidebar />
      <div className="min-w-0 flex-1 space-y-6">{children}</div>
    </div>
  );
}
