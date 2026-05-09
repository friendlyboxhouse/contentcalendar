import type { NextRequest } from "next/server";

/** ใช้ใน middleware (Edge) — ไม่ import server-only hostKind */
export function hostLooksProductionLike(request: NextRequest): boolean {
  const raw =
    (
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      ""
    )
      .split(",")[0]
      ?.trim()
      ?.toLowerCase() ?? "";
  const host = raw.split(":")[0];
  if (!host) return false;
  if (host === "localhost") return false;
  if (host === "127.0.0.1") return false;
  if (host.startsWith("192.168.")) return false;
  if (host.startsWith("10.")) return false;
  if (host.startsWith("172.")) return false;
  return true;
}
