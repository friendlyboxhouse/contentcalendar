import "server-only";

import { headers } from "next/headers";

/** true เมื่อโฮสต์ไม่ใช่ localhost / loopback / LAN ทั่วไป — ใช้บังคับต้องมี Supabase */
export async function isLikelyProductionHost(): Promise<boolean> {
  const h = await headers();
  const raw =
    h.get("x-forwarded-host")?.split(",")[0]?.trim()?.toLowerCase() ??
    h.get("host")?.trim()?.toLowerCase() ??
    "";
  if (!raw) return false;
  const host = raw.split(":")[0];
  if (host === "localhost") return false;
  if (host === "127.0.0.1") return false;
  if (host.startsWith("192.168.")) return false;
  if (host.startsWith("10.")) return false;
  if (host.startsWith("172.")) return false;
  return true;
}
