import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";
import { setTelegramWebhook } from "@/lib/telegram";

function resolveSiteUrl(): string | null {
  const base =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (!base) return null;
  return (base.includes("://") ? base : `https://${base}`).replace(/\/$/, "");
}

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

export async function POST() {
  const auth = await isPortalAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const siteUrl = resolveSiteUrl();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "";
  if (!siteUrl || !secret) {
    return NextResponse.json(
      { ok: false, error: "Missing SITE_URL or TELEGRAM_WEBHOOK_SECRET" },
      { status: 400 }
    );
  }

  const webhookUrl = `${siteUrl}/api/telegram/webhook`;
  const result = await setTelegramWebhook({ webhookUrl, secretToken: secret });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: result.result });
}
