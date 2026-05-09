import { AdminProfilesRolesPanel } from "@/components/admin/AdminProfilesRolesPanel";
import { MaterialIcon } from "@/components/ui/material-icon";

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
          <MaterialIcon name="group" className="text-primary" size={26} />
          สิทธิ์ผู้ใช้
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ปรับบทบาทหลังผู้ใช้ล็อกอินครั้งแรกแล้วมีแถวใน profiles
        </p>
      </div>
      <AdminProfilesRolesPanel />
    </div>
  );
}
