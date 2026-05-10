import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import { getTelegramWebhookInfo } from "@/lib/telegram";

async function isPortalAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* noop */
        }
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "unauthorized" };
  const { data, error } = await supabase.rpc("is_admin_email");
  if (error || !data) return { ok: false as const, status: 403, error: "forbidden" };
  return { ok: true as const };
}

export async function GET() {
  const auth = await isPortalAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const result = await getTelegramWebhookInfo();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result.result });
}
