import { headers } from "next/headers";
import { getPublicSiteOriginFromHeaders } from "@/lib/publicSiteOrigin";

/**
 * Origin สำหรับ OAuth redirectTo (หน้า login)
 * ตั้ง SITE_URL หรือ NEXT_PUBLIC_SITE_URL = https://โดเมนจริง เสมอเมื่อ deploy
 */
export async function resolveAuthRedirectOrigin(): Promise<string> {
  const h = await headers();
  return getPublicSiteOriginFromHeaders(h) ?? "";
}
