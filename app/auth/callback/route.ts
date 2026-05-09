import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import { buildSafeRedirectUrl } from "@/lib/publicSiteOrigin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  const toLogin = (query: string) => {
    const dest = buildSafeRedirectUrl(request, `/login?${query}`);
    if (dest) return NextResponse.redirect(dest);
    return new NextResponse(
      "ตั้งค่า SITE_URL หรือ NEXT_PUBLIC_SITE_URL ใน environment ให้เป็น https://โดเมนจริง และอย่าเข้าแอปผ่าน 0.0.0.0 — จากนั้น deploy ใหม่",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  };

  if (!code) {
    return toLogin("error=missing_code");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* ignore when called outside mutable cookie context */
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return toLogin(`error=${encodeURIComponent(error.message)}`);
  }

  const safeNext = next.startsWith("/") ? next : "/";
  const dest = buildSafeRedirectUrl(request, safeNext);
  if (dest) return NextResponse.redirect(dest);

  return new NextResponse(
    "ไม่สามารถสร้าง URL หลังล็อกอินได้ — ตั้งค่า SITE_URL=https://โดเมนของคุณ และให้ Supabase redirect มาที่โดเมนนั้น",
    { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
  );
}
