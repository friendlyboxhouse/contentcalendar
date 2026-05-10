import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseBearerKey(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim() || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

export async function GET(request: Request) {
  const key = parseBearerKey(request);
  if (!key || !key.startsWith("ck_")) {
    return NextResponse.json({ ok: false, error: "invalid_api_key" }, { status: 401 });
  }

  const prefix = key.split("_")[1] || "";
  const url = getSupabaseUrl();
  const serviceRole = getSupabaseServiceRoleKey();
  if (!url || !serviceRole) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase admin credentials" },
      { status: 500 }
    );
  }
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("workspace_api_keys")
    .select("id,workspace_id,hashed_key,revoked_at")
    .eq("prefix", prefix)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "api_key_not_found" }, { status: 401 });
  }
  if (hashKey(key) !== data.hashed_key) {
    return NextResponse.json({ ok: false, error: "api_key_mismatch" }, { status: 401 });
  }

  await supabase
    .from("workspace_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return NextResponse.json({
    ok: true,
    workspaceId: data.workspace_id,
    version: "ingest-v1",
  });
}
