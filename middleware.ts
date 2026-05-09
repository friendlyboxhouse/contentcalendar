import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import {
  evaluateEmailAllowlist,
  allowlistDenialToQueryParam,
} from "@/lib/supabase/emailAllowlist";
import { buildSafeRedirectUrl } from "@/lib/publicSiteOrigin";

function supabaseConfigured(): boolean {
  return isSupabaseConfigured();
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nextParam = `${pathname}${request.nextUrl.search}`;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  /**
   * ไม่มี Supabase env:
   * — redirect ทุกเส้นทางที่ไม่ใช่ login/auth ไป `/login` (รวมโดเมนโปรดักชัน)
   *   เพื่อให้หน้าแรกเห็นฟอร์มล็อกอินหรือการ์ดแจ้งใส่ env — ไม่เปิดแอปหลักแบบว่าง
   */
  if (!supabaseConfigured()) {
    if (!isAuthRoute) {
      const loginUrl = buildSafeRedirectUrl(request, "/login");
      if (loginUrl) {
        loginUrl.searchParams.set("next", nextParam || "/");
        return NextResponse.redirect(loginUrl);
      }
      const nu = request.nextUrl.clone();
      nu.pathname = "/login";
      nu.searchParams.set("next", nextParam || "/");
      return NextResponse.redirect(nu);
    }
    return NextResponse.next();
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return NextResponse.next();
  }

  const invokePath = `${pathname}${request.nextUrl.search}`;

  function headersWithInvokePath() {
    const h = new Headers(request.headers);
    h.set("x-invoke-path", invokePath);
    return h;
  }

  try {
    let supabaseResponse = NextResponse.next({
      request: {
        headers: headersWithInvokePath(),
      },
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
            request: {
              headers: headersWithInvokePath(),
            },
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

    const isAccessBlockedRoute = pathname.startsWith("/access-blocked");

    if (!user && isAccessBlockedRoute) {
      const loginUrl = buildSafeRedirectUrl(request, "/login");
      if (loginUrl) return NextResponse.redirect(loginUrl);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (user) {
      const allow = await evaluateEmailAllowlist(supabase, user);
      if (!allow.ok) {
        const reason = allowlistDenialToQueryParam(allow.error);
        if (!isAccessBlockedRoute) {
          const blocked = buildSafeRedirectUrl(
            request,
            `/access-blocked?reason=${encodeURIComponent(reason)}`
          );
          if (blocked) return NextResponse.redirect(blocked);
          const fb = request.nextUrl.clone();
          fb.pathname = "/access-blocked";
          fb.searchParams.set("reason", reason);
          return NextResponse.redirect(fb);
        }
      } else if (isAccessBlockedRoute) {
        const home = buildSafeRedirectUrl(request, "/");
        if (home) return NextResponse.redirect(home);
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (!user && !isAuthRoute) {
      const loginUrl = buildSafeRedirectUrl(request, "/login");
      if (loginUrl) {
        loginUrl.searchParams.set("next", nextParam || "/");
        return NextResponse.redirect(loginUrl);
      }
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = "/login";
      nextUrl.searchParams.set("next", nextParam || "/");
      return NextResponse.redirect(nextUrl);
    }

    if (user && pathname === "/login") {
      const home = buildSafeRedirectUrl(request, "/");
      if (home) return NextResponse.redirect(home);
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (user && pathname.startsWith("/admin")) {
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
    if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
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
