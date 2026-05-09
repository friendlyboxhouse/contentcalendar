"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/ui/material-icon";

/** เมื่อรันบนโดเมนจริงแต่เซิร์ฟเวอร์ไม่เห็นค่า Supabase — กันเปิดแอปแบบไม่ล็อกอิน */
export function ProductionCloudRequired() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex max-w-lg flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <span className="inline-flex rounded-full bg-destructive/15 p-3 text-destructive">
          <MaterialIcon name="cloud_off" size={40} />
        </span>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">ยังตั้งค่า Supabase บนเซิร์ฟเวอร์ไม่ครบ</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            บนโฮสต์จริงจำเป็นต้องมี URL และ anon key ของ Supabase ใน{" "}
            <strong className="text-foreground">environment variables</strong>{" "}
            ของแอป (ทั้งฝั่ง build และ middleware)
          </p>
        </div>
        <ul className="w-full space-y-2 rounded-lg bg-muted/50 p-4 text-left text-xs text-muted-foreground">
          <li>
            • ใส่ <code className="rounded bg-muted px-1">SUPABASE_URL</code> +{" "}
            <code className="rounded bg-muted px-1">SUPABASE_ANON_KEY</code>
          </li>
          <li>
            • แนะนำเพิ่ม{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> +{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            ค่าเดียวกัน เพื่อให้ middleware (Edge) พาไปล็อกอินได้ถูกต้อง
          </li>
          <li>• แก้แล้วให้ <strong className="text-foreground">deploy / build ใหม่</strong></li>
        </ul>
        <Link
          href="/login"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ไปหน้าเข้าสู่ระบบ (หลังแก้ env)
        </Link>
      </div>
    </div>
  );
}
