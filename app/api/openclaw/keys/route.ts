import { createHash, randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* noop */
        }
      },
    },
  });
}

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function requireWorkspaceAdmin(workspaceId: string) {
  const supabase = await getClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const { data: member, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || member?.role !== "admin") {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const, supabase, user };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId")?.trim() || "";
  if (!workspaceId) {
    return NextResponse.json({ ok: false, error: "workspaceId is required" }, { status: 400 });
  }
  const auth = await requireWorkspaceAdmin(workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const { data, error } = await auth.supabase
    .from("workspace_api_keys")
    .select("id,name,prefix,scopes,last_used_at,revoked_at,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, keys: data ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string;
    name?: string;
  };
  const workspaceId = body.workspaceId?.trim() || "";
  const name = body.name?.trim() || "";
  if (!workspaceId || !name) {
    return NextResponse.json(
      { ok: false, error: "workspaceId and name are required" },
      { status: 400 }
    );
  }
  const auth = await requireWorkspaceAdmin(workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const prefix = randomBytes(4).toString("hex");
  const secret = randomBytes(24).toString("hex");
  const key = `ck_${prefix}_${secret}`;
  const hashed = hashKey(key);

  const { error } = await auth.supabase.from("workspace_api_keys").insert({
    workspace_id: workspaceId,
    name,
    prefix,
    hashed_key: hashed,
    scopes: ["ingest:write"],
    created_by: auth.user.id,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, key });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  const id = body.id?.trim() || "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  const supabase = await getClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error: rowError } = await supabase
    .from("workspace_api_keys")
    .select("id, workspace_id")
    .eq("id", id)
    .maybeSingle();
  if (rowError || !row?.workspace_id) {
    return NextResponse.json({ ok: false, error: "key_not_found" }, { status: 404 });
  }

  const auth = await requireWorkspaceAdmin(String(row.workspace_id));
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { error } = await auth.supabase
    .from("workspace_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
