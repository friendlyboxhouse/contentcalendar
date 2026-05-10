/** Cursor debug session 895fc8 — NDJSON to ingest + dev file sink. */
export function debugSessionLog(payload: Record<string, unknown>) {
  const body = JSON.stringify({
    ...payload,
    sessionId: "895fc8",
    timestamp: Date.now(),
  })
  void fetch(
    "http://127.0.0.1:7498/ingest/69f5c356-794f-44c5-8fe3-18f8563f0979",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "895fc8",
      },
      body,
    }
  ).catch(() => {})
  if (typeof window !== "undefined") {
    const h = window.location.hostname.toLowerCase()
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "::1"
    ) {
      void fetch("/api/debug-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {})
    }
  }
}
