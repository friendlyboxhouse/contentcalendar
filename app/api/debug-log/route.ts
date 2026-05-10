import { appendFileSync } from "fs"
import { join } from "path"
import { NextResponse } from "next/server"

function isLocalLoopbackRequest(req: Request) {
  const host = (req.headers.get("host") ?? "").toLowerCase()
  if (host.startsWith("[")) {
    return host.startsWith("[::1]") || host.startsWith("[0:0:0:0:0:0:0:1]")
  }
  const hostname = host.split(":")[0] ?? ""
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  )
}

/** Local-only NDJSON sink for Cursor debug sessions (ไม่เปิดบนโฮสต์โปรดักชัน). */
export async function POST(req: Request) {
  if (!isLocalLoopbackRequest(req)) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }
  const text = await req.text()
  const cwd = process.cwd()
  const candidates = [
    join(cwd, "..", "debug-895fc8.log"),
    join(cwd, "debug-895fc8.log"),
  ]
  let written: string | null = null
  let lastCode = "none"
  for (const logPath of candidates) {
    try {
      appendFileSync(logPath, `${text.trim()}\n`, "utf8")
      written = logPath
      break
    } catch (e) {
      lastCode = e instanceof Error ? e.name : "unknown"
    }
  }
  if (!written) {
    return NextResponse.json(
      { ok: false, error: "write_failed", lastCode },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}
