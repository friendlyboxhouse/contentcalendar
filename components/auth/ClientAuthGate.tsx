"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { ProductionCloudRequired } from "@/components/auth/ProductionCloudRequired";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";

/**
 * • โปรดักชันโดเมนจริงแต่เซิร์ฟเวอร์ไม่เห็น Supabase env → ProductionCloudRequired
 * • ไม่มี env / ไม่มี session → ไม่เรนเดอร์แอปโฟลเดอร์ (พาไป /login)
 * • เมลไม่ผ่าน allowlist → middleware พาไป /access-blocked (มี session อยู่)
 */
function loginRedirectDest(pathname: string, search: string): string {
  if (pathname === "/" && !search) return "/login";
  const nextPath = `${pathname}${search}` || "/";
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

function AuthWaiting({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-6">
      <PageSpinner label={label} />
    </div>
  );
}

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
    if (!authHydrated) return;
    /** ไม่มี Supabase = ไม่ให้เปิดแผนที่เครื่องมือแพลนเนอร์โดยไม่ผ่านหน้า login */
    if (!configured || !session) {
      const search =
        typeof window !== "undefined" ? window.location.search ?? "" : "";
      router.replace(loginRedirectDest(pathname, search));
    }
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
    if (!authHydrated) return;
    if (configured && session) return;
    const search =
      typeof window !== "undefined" ? window.location.search ?? "" : "";
    const dest = loginRedirectDest(pathname, search);
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

  /** บังคับให้ไป /login ก่อน — ห้ามโชว์แดชบอร์ดจนกว่าจะตั้งค่า Supabase + มี session */
  if (!configured) {
    if (!authHydrated) {
      return <AuthWaiting label="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
    }
    return <AuthWaiting label="กำลังไปหน้าเข้าสู่ระบบ…" />;
  }

  if (!authHydrated) {
    return <AuthWaiting label="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
  }

  if (!session) {
    return <AuthWaiting label="กำลังไปหน้าเข้าสู่ระบบ…" />;
  }

  return <>{children}</>;
}
