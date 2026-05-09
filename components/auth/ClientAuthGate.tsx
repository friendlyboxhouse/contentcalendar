"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { ProductionCloudRequired } from "@/components/auth/ProductionCloudRequired";

/**
 * • บนโดเมนจริงถ้าเซิร์ฟเวอร์ไม่เห็น Supabase env → บล็อกแอป (กันเข้าได้โดยไม่ล็อกอิน)
 * • สำรองเมื่อ middleware (Edge) ไม่มี env แต่ client มี session path — พาไป /login ถ้าไม่มี session
 */
export function ClientAuthGate({
  children,
  blockOpenPlannerWithoutCloud = false,
}: {
  children: React.ReactNode;
  /** จากเซิร์ฟเวอร์: โฮสต์จริง + isSupabaseConfigured() = false */
  blockOpenPlannerWithoutCloud?: boolean;
}) {
  const { configured, session, authHydrated } = useSupabaseApp();
  const router = useRouter();
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (blockOpenPlannerWithoutCloud) return;
    if (!configured || !authHydrated || session) return;
    const search =
      typeof window !== "undefined" ? window.location.search ?? "" : "";
    const nextPath = `${pathname}${search}` || "/";
    const dest = `/login?next=${encodeURIComponent(nextPath)}`;
    router.replace(dest);
  }, [
    blockOpenPlannerWithoutCloud,
    configured,
    authHydrated,
    session,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (blockOpenPlannerWithoutCloud) return;
    if (!configured || !authHydrated || session) return;
    const search =
      typeof window !== "undefined" ? window.location.search ?? "" : "";
    const nextPath = `${pathname}${search}` || "/";
    const dest = `/login?next=${encodeURIComponent(nextPath)}`;
    const t = window.setTimeout(() => {
      if (window.location.pathname !== "/login") {
        window.location.assign(dest);
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [
    blockOpenPlannerWithoutCloud,
    configured,
    authHydrated,
    session,
    pathname,
  ]);

  if (blockOpenPlannerWithoutCloud) {
    return <ProductionCloudRequired />;
  }

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
