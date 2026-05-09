import { AccessAdminClient } from "@/components/admin/AccessAdminClient";
import { MaterialIcon } from "@/components/ui/material-icon";

export default function AdminAccessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="inline-flex rounded-lg bg-primary/10 p-1.5">
            <MaterialIcon name="manage_accounts" size={26} className="text-primary" />
          </span>
          จัดการการเข้าถึง
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          กำหนดว่าใครเข้าแอปได้ (allowlist) และบทบาทของผู้ใช้แต่ละคน
        </p>
      </div>
      <AccessAdminClient />
    </div>
  );
}
