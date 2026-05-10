import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createEmptyBrief } from "@/lib/createBrief";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getAdminClient() {
  const url = getSupabaseUrl();
  const serviceRole = getSupabaseServiceRoleKey();
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function parseBearerKey(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim() || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const key = auth.slice(7).trim();
  return key || null;
}

export async function POST(request: Request) {
  const apiKey = parseBearerKey(request);
  if (!apiKey || !apiKey.startsWith("ck_")) {
    return NextResponse.json({ ok: false, error: "invalid_api_key" }, { status: 401 });
  }
  const parts = apiKey.split("_");
  const prefix = parts[1] || "";
  if (!prefix) {
    return NextResponse.json({ ok: false, error: "invalid_api_key_format" }, { status: 401 });
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase admin credentials" },
      { status: 500 }
    );
  }

  const { data: keyRow, error: keyError } = await supabase
    .from("workspace_api_keys")
    .select("id,workspace_id,hashed_key,created_by,revoked_at,scopes")
    .eq("prefix", prefix)
    .is("revoked_at", null)
    .maybeSingle();
  if (keyError || !keyRow) {
    return NextResponse.json({ ok: false, error: "api_key_not_found" }, { status: 401 });
  }
  if (hashKey(apiKey) !== keyRow.hashed_key) {
    return NextResponse.json({ ok: false, error: "api_key_mismatch" }, { status: 401 });
  }
  if (!Array.isArray(keyRow.scopes) || !keyRow.scopes.includes("ingest:write")) {
    return NextResponse.json({ ok: false, error: "scope_denied" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string;
    source?: string;
    brief?: {
      topic?: string;
      angle?: string;
      targetAudience?: string;
      owner?: string;
      pillar?: string;
      format?: string;
      platforms?: string[];
      contentType?: string;
      publishTime?: string;
      strategicNotes?: string;
    };
  };
  const workspaceId = body.workspaceId?.trim() || String(keyRow.workspace_id);
  if (workspaceId !== keyRow.workspace_id) {
    return NextResponse.json({ ok: false, error: "workspace_mismatch" }, { status: 403 });
  }

  const { data: ownerMember } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const ownerUserId = String(ownerMember?.user_id || keyRow.created_by || "");
  if (!ownerUserId) {
    return NextResponse.json(
      { ok: false, error: "workspace_owner_not_found" },
      { status: 400 }
    );
  }

  const seed = createEmptyBrief([]);
  seed.id = `ING-${Date.now().toString(36).toUpperCase()}`;
  seed.updatedAt = new Date();
  seed.createdAt = new Date();
  seed.topic = body.brief?.topic?.trim() || "OpenClaw brief";
  seed.angle = body.brief?.angle?.trim() || "";
  seed.targetAudience = body.brief?.targetAudience?.trim() || "";
  seed.owner = body.brief?.owner?.trim() || "OpenClaw";
  seed.strategicNotes = body.brief?.strategicNotes?.trim() || "";
  seed.contentType = body.brief?.contentType?.trim() || seed.contentType;
  seed.publishTime = body.brief?.publishTime?.trim() || seed.publishTime;
  if (body.brief?.format) seed.format = body.brief.format as typeof seed.format;
  if (body.brief?.pillar) seed.pillar = body.brief.pillar as typeof seed.pillar;
  if (body.brief?.platforms?.length) {
    seed.platform = body.brief.platforms as typeof seed.platform;
  }

  const payload = JSON.parse(JSON.stringify(seed)) as Record<string, unknown>;
  const nowIso = new Date().toISOString();

  const { error: insertError } = await supabase.from("content_items").upsert(
    {
      post_id: seed.id,
      user_id: ownerUserId,
      workspace_id: workspaceId,
      payload,
      updated_at: nowIso,
    },
    { onConflict: "post_id" }
  );
  if (insertError) {
    await supabase.from("ingest_events").insert({
      workspace_id: workspaceId,
      api_key_id: keyRow.id,
      source: body.source?.trim() || "openclaw",
      payload: body,
      status: "failed",
      error: insertError.message,
    });
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  await supabase
    .from("workspace_api_keys")
    .update({ last_used_at: nowIso })
    .eq("id", keyRow.id);
  await supabase.from("ingest_events").insert({
    workspace_id: workspaceId,
    api_key_id: keyRow.id,
    source: body.source?.trim() || "openclaw",
    payload: body,
    status: "success",
  });

  return NextResponse.json({ ok: true, id: seed.id });
}
