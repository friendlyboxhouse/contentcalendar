import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import {
  evaluateEmailAllowlist,
  type AllowlistDenialReason,
} from "@/lib/supabase/emailAllowlist";
import { buildSafeRedirectUrl } from "@/lib/publicSiteOrigin";

function supabaseConfigured(): boolean {
  return isSupabaseConfigured();
}

function allowlistErrorQueryParam(reason: AllowlistDenialReason): string {
  switch (reason) {
    case "allowlist_empty":
      return "allowlist_empty";
    case "rpc_error":
      return "allowlist_check_failed";
    case "no_email":
    case "email_not_allowlisted":
      return "email_not_allowlisted";
  }
}

export async function middleware(request: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.next();
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return NextResponse.next();
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isAuthRoute =
      path.startsWith("/login") ||
      path.startsWith("/auth");

    if (user) {
      const allow = await evaluateEmailAllowlist(supabase, user);
      if (!allow.ok) {
        await supabase.auth.signOut();
        const code = allowlistErrorQueryParam(allow.error);
        const denied = buildSafeRedirectUrl(request, "/login");
        if (denied) {
          denied.searchParams.set("error", code);
          return NextResponse.redirect(denied);
        }
        const fallback = request.nextUrl.clone();
        fallback.pathname = "/login";
        fallback.searchParams.set("error", code);
        return NextResponse.redirect(fallback);
      }
    }

    if (!user && !isAuthRoute) {
      const loginUrl = buildSafeRedirectUrl(request, "/login");
      if (loginUrl) {
        loginUrl.searchParams.set(
          "next",
          `${path}${request.nextUrl.search}`
        );
        return NextResponse.redirect(loginUrl);
      }
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = "/login";
      nextUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(nextUrl);
    }

    if (user && path === "/login") {
      const home = buildSafeRedirectUrl(request, "/");
      if (home) return NextResponse.redirect(home);
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (user && path.startsWith("/admin")) {
      const { data: portalAdmin, error: adminRpcErr } =
        await supabase.rpc("is_admin_email");
      if (adminRpcErr || !portalAdmin) {
        const home = buildSafeRedirectUrl(request, "/");
        if (home) return NextResponse.redirect(home);
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return supabaseResponse;
  } catch (e) {
    console.error("[middleware] auth:", e);
    const path = request.nextUrl.pathname;
    if (path.startsWith("/login") || path.startsWith("/auth")) {
      return NextResponse.next();
    }
    const loginUrl = buildSafeRedirectUrl(request, "/login");
    if (loginUrl) return NextResponse.redirect(loginUrl);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
