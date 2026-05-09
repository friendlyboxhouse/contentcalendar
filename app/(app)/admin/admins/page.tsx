import { AdminEmailsPanel } from "@/components/admin/AdminEmailsPanel";

export default function AdminEmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">แอดมินหลังบ้าน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ควบคุมว่าเมลใดเข้าเมนูหลังบ้านได้ — คนละตารางกับรายการอีเมลที่ล็อกอินได้
        </p>
      </div>
      <AdminEmailsPanel />
    </div>
  );
}
