"use client";

import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/command-palette";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

/** ไม่โหลด Cmd+K / palette บนหน้าที่ยังไม่เข้าระบบหรือยังไม่ได้ตั้งคลาวด์ */
const AUTH_STYLE_PREFIXES = ["/login", "/auth", "/access-blocked"];

export function CommandPaletteGate() {
  const pathname = usePathname();
  const { configured, session, authHydrated } = useSupabaseApp();

  if (!authHydrated) return null;
  if (!configured || !session) return null;
  if (
    pathname &&
    AUTH_STYLE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return <CommandPalette />;
}
