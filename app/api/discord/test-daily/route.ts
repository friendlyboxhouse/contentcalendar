import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildCalendarEvents, CALENDAR_EVENT_META } from "@/lib/calendarEvents";
import {
  formatDailyProgressDigest,
  sendDiscordWebhook,
  type DiscordProgressDigestItem,
} from "@/lib/discord";
import { reviveContentItem } from "@/lib/revive";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

type Body = {
  workspaceId?: string;
  channelId?: string;
};

function getBangkokDateKey(date: Date): { dateKey: string; dateLabel: string } {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [dateKey] = formatter.format(date).split(" ");
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return { dateKey, dateLabel };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const workspaceId = body.workspaceId?.trim() ?? "";
  const channelId = body.channelId?.trim() ?? "";
  if (!workspaceId || !channelId) {
    return NextResponse.json(
      { ok: false, error: "workspaceId and channelId are required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError || member?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { data: channel, error: channelError } = await supabase
    .from("workspace_discord_channels")
    .select("id,workspace_id,channel_name,webhook_url")
    .eq("id", channelId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (channelError || !channel) {
    return NextResponse.json({ ok: false, error: "channel_not_found" }, { status: 404 });
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();

  const { data: contentRows, error: contentError } = await supabase
    .from("content_items")
    .select("payload")
    .eq("workspace_id", workspaceId);
  if (contentError) {
    return NextResponse.json({ ok: false, error: contentError.message }, { status: 500 });
  }

  const now = new Date();
  const { dateKey, dateLabel } = getBangkokDateKey(now);
  const items = (contentRows ?? []).map((row) => reviveContentItem(row.payload as never));
  const events = buildCalendarEvents(items, "workflow");
  const digestItems: DiscordProgressDigestItem[] = events
    .filter((event) => getBangkokDateKey(event.date).dateKey === dateKey)
    .map((event) => ({
      id: event.item.id,
      topic: event.item.topic,
      owner: event.item.owner,
      status: event.item.status,
      milestoneLabel: CALENDAR_EVENT_META[event.kind].label,
      dueAt: event.date,
    }))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const payload = formatDailyProgressDigest({
    workspaceName: workspace?.name ?? workspaceId,
    dateLabel,
    items: digestItems,
  });

  const sent = await sendDiscordWebhook(channel.webhook_url, payload);
  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: sent.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, itemCount: digestItems.length });
}
