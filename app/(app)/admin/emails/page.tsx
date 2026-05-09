import { AdminAllowlistPanel } from "@/components/admin/AdminAllowlistPanel";
import { MaterialIcon } from "@/components/ui/material-icon";

export default function AdminEmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
          <MaterialIcon name="mark_email_read" className="text-primary" size={26} />
          อีเมลที่อนุญาต
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          เพิ่มหรือลบอีเมลใน allowlist (เฉพาะเมื่อมีอย่างน้อยหนึ่งแถวในระบบจึงจำกัดการเข้า)
        </p>
      </div>
      <AdminAllowlistPanel />
    </div>
  );
}
