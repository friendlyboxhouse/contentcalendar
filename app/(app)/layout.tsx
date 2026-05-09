import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { ClientAuthGate } from "@/components/auth/ClientAuthGate";
import { AppShellFrame } from "@/components/shell/AppShellFrame";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import {
  evaluateEmailAllowlist,
  allowlistDenialToQueryParam,
} from "@/lib/supabase/emailAllowlist";
import { isLikelyProductionHost } from "@/lib/hostKind";

export const dynamic = "force-dynamic";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const prodLike = await isLikelyProductionHost();
  const cloudConfigured = isSupabaseConfigured();
  const blockOpenPlannerWithoutCloud = prodLike && !cloudConfigured;

  if (blockOpenPlannerWithoutCloud) {
    return (
      <ClientAuthGate blockOpenPlannerWithoutCloud={blockOpenPlannerWithoutCloud}>
        <AppShellFrame>{children}</AppShellFrame>
      </ClientAuthGate>
    );
  }

  const h = await headers();
  const nextFromMiddleware =
    h.get("x-invoke-path")?.trim() || "/";

  /** โลคัลโดยไม่มี env — middleware ควรพาไป login แล้ว แต่กันบางโฮสต์ที่ไม่รัน middleware */
  if (!cloudConfigured) {
    const qs =
      nextFromMiddleware !== "/"
        ? `?next=${encodeURIComponent(nextFromMiddleware)}`
        : "";
    redirect(`/login${qs}`);
  }

  const cookieStore = await cookies();
  const url = getSupabaseUrl()!;
  const key = getSupabaseAnonKey()!;
  const supabase = createServerClient(url, key, {
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
          /* Server Component / layout — อาจ set cookie ไม่ได้ในบางบริบท */
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const qs =
      nextFromMiddleware !== "/"
        ? `?next=${encodeURIComponent(nextFromMiddleware)}`
        : "";
    redirect(`/login${qs}`);
  }

  const allow = await evaluateEmailAllowlist(supabase, user);
  if (!allow.ok) {
    const reason = allowlistDenialToQueryParam(allow.error);
    redirect(`/access-blocked?reason=${encodeURIComponent(reason)}`);
  }

  return (
    <ClientAuthGate blockOpenPlannerWithoutCloud={false}>
      <AppShellFrame>{children}</AppShellFrame>
    </ClientAuthGate>
  );
}
