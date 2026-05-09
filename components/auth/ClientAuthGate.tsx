"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

/**
 * สำรองเมื่อ middleware บนโฮสต์ไม่ทำงาน / env ไม่ถูกฝังตอน build —
 * ถ้ามี Supabase ครบแต่ยังไม่มี session จะพาไป /login
 */
export function ClientAuthGate({ children }: { children: React.ReactNode }) {
  const { configured, session, authHydrated } = useSupabaseApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!configured || !authHydrated || session) return;
    const search =
      typeof window !== "undefined" ? window.location.search ?? "" : "";
    const nextPath = `${pathname}${search}` || "/";
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [configured, authHydrated, session, pathname, router]);

  if (!configured) {
    return <>{children}</>;
  }

  if (!authHydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-muted/40 px-6">
        <p className="text-sm text-muted-foreground">
          กำลังตรวจสอบการเข้าสู่ระบบ…
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-muted/40 px-6">
        <p className="text-sm text-muted-foreground">
          กำลังไปหน้าเข้าสู่ระบบ…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
