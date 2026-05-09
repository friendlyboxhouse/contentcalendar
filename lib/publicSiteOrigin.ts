/**
 * โดเมนสาธารณะสำหรับ redirect (OAuth callback, middleware) — หลีกเลี่ยง 0.0.0.0
 */

function stripTrailingSlash(u: string): string {
  return u.replace(/\/$/, "");
}

function parseHostname(fromHeader: string): string {
  const raw = fromHeader.split(",")[0]?.trim()?.toLowerCase() ?? "";
  const noProto = raw.replace(/^[^:]+:\/\//, "");
  return noProto.split("/")[0].split(":")[0];
}

function isUnsafePublicHost(host: string): boolean {
  if (!host) return true;
  return host === "0.0.0.0";
}

function originFromEnv(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (!raw) return null;
  let candidate = stripTrailingSlash(raw);
  if (!candidate.includes("://")) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (isUnsafePublicHost(parsed.hostname)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * อ่านจาก SITE_URL / NEXT_PUBLIC_SITE_URL ก่อน — แล้วจึง proxy headers
 */
export function getPublicSiteOriginFromHeaders(h: Headers): string | null {
  const envOrigin = originFromEnv();
  if (envOrigin) return envOrigin;

  const host = parseHostname(
    h.get("x-forwarded-host") ?? h.get("host") ?? ""
  );
  if (!host || isUnsafePublicHost(host)) return null;

  const protoRaw =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  const proto =
    protoRaw === "http" || protoRaw === "https" ? protoRaw : "https";

  return `${proto}://${host}`;
}

export function getPublicSiteOriginFromRequest(req: Request): string | null {
  return getPublicSiteOriginFromHeaders(req.headers);
}

/**
 * สร้าง URL redirect ที่ปลอดภัย — ถ้าเป็น 0.0.0.0 และไม่มี SITE_URL จะได้ null
 */
export function buildSafeRedirectUrl(
  req: Request,
  pathnameWithOptionalQuery: string
): URL | null {
  const path = pathnameWithOptionalQuery.startsWith("/")
    ? pathnameWithOptionalQuery
    : `/${pathnameWithOptionalQuery}`;

  const base = getPublicSiteOriginFromRequest(req);
  if (base) {
    return new URL(path, `${stripTrailingSlash(base)}/`);
  }

  const reqUrl = new URL(req.url);
  if (!isUnsafePublicHost(reqUrl.hostname)) {
    return new URL(path, `${reqUrl.origin}/`);
  }

  return null;
}
