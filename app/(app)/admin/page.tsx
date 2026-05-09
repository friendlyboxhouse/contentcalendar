import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/material-icon";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="inline-flex rounded-lg bg-primary/10 p-1.5">
            <MaterialIcon name="admin_panel_settings" size={26} className="text-primary" />
          </span>
          หลังบ้าน
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          จัดการอีเมลที่ล็อกอินได้และสิทธิ์ผู้ใช้แยกจากหน้าตั้งค่าทั่วไป
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/emails">
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MaterialIcon name="mark_email_read" size={22} />
                อีเมลที่อนุญาต
              </CardTitle>
              <CardDescription>
                Allowlist — เมลใดล็อกอินได้ (ต้องมีอย่างน้อยหนึ่งแถวเมื่อใช้งานจริง)
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/admins">
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MaterialIcon name="shield_person" size={22} />
                แอดมินหลังบ้าน
              </CardTitle>
              <CardDescription>
                เมลใดเข้า /admin ได้ — ตาราง admin_emails
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/roles">
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MaterialIcon name="group" size={22} />
                สิทธิ์ผู้ใช้
              </CardTitle>
              <CardDescription>
                viewer / editor ในฟีเจอร์แพลนเนอร์ (คนละเรื่องกับแอดมินหลังบ้าน)
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
