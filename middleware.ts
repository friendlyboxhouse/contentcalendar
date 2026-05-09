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

/** หน้าแรกล้วนๆ (`/`) → `/login` ไม่ติด `next` (หลัง OAuth ใช้ค่าเริ่มต้น `/` จาก LoginContent) */
function isBareHome(pathname: string, search: string): boolean {
  return pathname === "/" && !search;
}

function redirectAnonymousToLogin(
  request: NextRequest,
  pathname: string,
  search: string,
  nextParam: string,
  withNoStore: (res: NextResponse) => NextResponse,
): NextResponse {
  const bare = isBareHome(pathname, search);
  const loginUrl = buildSafeRedirectUrl(request, "/login");
  if (loginUrl) {
    if (!bare) {
      loginUrl.searchParams.set("next", nextParam || "/");
    }
    return withNoStore(NextResponse.redirect(loginUrl));
  }
  const nu = request.nextUrl.clone();
  nu.pathname = "/login";
  nu.search = "";
  if (!bare) {
    nu.searchParams.set("next", nextParam || "/");
  }
  return withNoStore(NextResponse.redirect(nu));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nextParam = `${pathname}${request.nextUrl.search}`;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  const withNoStore = (res: NextResponse) => {
    /**
     * private — บอกแคชระดับโปรซี่/CDN ว่าอย่าเก็บ HTML/RSC ของหน้าที่ผูกกับ session ไว้แชร์กัน
     * Vary: Cookie — กัน CDN ที่แคชตาม URL อย่างเดียว เสิร์ฟ HTML ที่คนละสถานะล็อกอินให้กัน
     */
    res.headers.set(
      "Cache-Control",
      "private, no-store, must-revalidate",
    );
    res.headers.set("Vary", "Cookie, Accept-Encoding");
    return res;
  };

  /**
   * ไม่มี Supabase env:
   * — redirect ทุกเส้นทางที่ไม่ใช่ login/auth ไป `/login` (รวมโดเมนโปรดักชัน)
   *   เพื่อให้หน้าแรกเห็นฟอร์มล็อกอินหรือการ์ดแจ้งใส่ env — ไม่เปิดแอปหลักแบบว่าง
   */
  if (!supabaseConfigured()) {
    if (!isAuthRoute) {
      return redirectAnonymousToLogin(
        request,
        pathname,
        request.nextUrl.search,
        nextParam,
        withNoStore,
      );
    }
    return withNoStore(NextResponse.next());
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  /** ป้องกันกรณี env ไม่สมบูรณ์ระหว่างรัน — ห้ามเปิดแอปหลักโดยไม่ผ่าน login */
  if (!url || !key) {
    if (!isAuthRoute) {
      return redirectAnonymousToLogin(
        request,
        pathname,
        request.nextUrl.search,
        nextParam,
        withNoStore,
      );
    }
    return withNoStore(NextResponse.next());
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
      if (loginUrl) return withNoStore(NextResponse.redirect(loginUrl));
      return withNoStore(NextResponse.redirect(new URL("/login", request.url)));
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
          if (blocked) return withNoStore(NextResponse.redirect(blocked));
          const fb = request.nextUrl.clone();
          fb.pathname = "/access-blocked";
          fb.searchParams.set("reason", reason);
          return withNoStore(NextResponse.redirect(fb));
        }
      } else if (isAccessBlockedRoute) {
        const home = buildSafeRedirectUrl(request, "/");
        if (home) return withNoStore(NextResponse.redirect(home));
        return withNoStore(NextResponse.redirect(new URL("/", request.url)));
      }
    }

    if (!user && !isAuthRoute) {
      return redirectAnonymousToLogin(
        request,
        pathname,
        request.nextUrl.search,
        nextParam,
        withNoStore,
      );
    }

    if (user && pathname === "/login") {
      const home = buildSafeRedirectUrl(request, "/");
      if (home) return withNoStore(NextResponse.redirect(home));
      return withNoStore(NextResponse.redirect(new URL("/", request.url)));
    }

    if (user && pathname.startsWith("/admin")) {
      const { data: portalAdmin, error: adminRpcErr } =
        await supabase.rpc("is_admin_email");
      if (adminRpcErr || !portalAdmin) {
        const home = buildSafeRedirectUrl(request, "/");
        if (home) return withNoStore(NextResponse.redirect(home));
        return withNoStore(NextResponse.redirect(new URL("/", request.url)));
      }
    }

    return withNoStore(supabaseResponse);
  } catch (e) {
    console.error("[middleware] auth:", e);
    if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
      return withNoStore(NextResponse.next());
    }
    const loginUrl = buildSafeRedirectUrl(request, "/login");
    if (loginUrl) return withNoStore(NextResponse.redirect(loginUrl));
    return withNoStore(NextResponse.redirect(new URL("/login", request.url)));
  }
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
