"use client";

const DRAFT_PREFIX = "cp:draft:";

export function isLocalhostHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

export function clearPlannerClientStorage(demoKey?: string) {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(DRAFT_PREFIX)) {
        localStorage.removeItem(k);
      }
    }
    localStorage.removeItem("content-planner-store");
    if (demoKey) localStorage.removeItem(demoKey);
  } catch {
    /* ignore storage errors */
  }
}
