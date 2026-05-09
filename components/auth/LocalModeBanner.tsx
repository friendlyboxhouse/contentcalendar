"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

/** แสดงเมื่อไม่มี NEXT_PUBLIC_SUPABASE_* — แอปจะไม่มีหน้าล็อกอินอัตโนมัติ */
export function LocalModeBanner() {
  const { configured } = useSupabaseApp();
  if (configured) return null;

  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm">
      <MaterialIcon name="info" className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium text-amber-950 dark:text-amber-100">
          โหมดโลคัล — ยังไม่ได้เชื่อม Supabase บนเซิร์ฟเวอร์
        </p>
        <p className="text-muted-foreground">
          เพื่อให้มี<strong>หน้าล็อกอิน Google และซิงค์ข้อมูล</strong> ให้ใส่{" "}
          <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> และ{" "}
          <code className="rounded bg-muted px-1">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          ใน Hostinger → Environment variables แล้ว<strong className="text-foreground">
            Deploy / Build ใหม่ทั้งก้อน
          </strong>{" "}
          (ตัวแปรที่ขึ้นต้น NEXT_PUBLIC ถูกอ่านตอน build — ใส่ก่อนรัน build)
        </p>
        <p>
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            เปิดหน้าทดสอบการเชื่อมต่อ →
          </Link>
        </p>
      </div>
    </div>
  );
}
