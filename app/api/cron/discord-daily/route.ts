import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { reviveContentItem } from "@/lib/revive";
import { buildCalendarEvents, CALENDAR_EVENT_META } from "@/lib/calendarEvents";
import {
  formatDailyProgressDigest,
  sendDiscordWebhook,
  type DiscordProgressDigestItem,
} from "@/lib/discord";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

type WorkspaceChannelRow = {
  id: string;
  workspace_id: string;
  channel_name: string;
  webhook_url: string;
  is_enabled: boolean;
};

type WorkspaceRow = {
  id: string;
  name: string;
};

type ContentRow = {
  workspace_id: string;
  payload: Record<string, unknown>;
};

type TaskRow = {
  id: string;
  workspace_id: string;
  title: string;
  due_at: string | null;
};

type DailyLogRow = {
  workspace_id: string;
  channel_id: string;
  digest_date: string;
};

function getAdminSupabase() {
  const url = getSupabaseUrl();
  const serviceRole = getSupabaseServiceRoleKey();
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase admin credentials");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

function getBangkokClock(date: Date): {
  dateKey: string;
  minuteOfDay: number;
  dateLabel: string;
} {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hh = Number(values.hour || "0");
  const mm = Number(values.minute || "0");
  const dateKey = `${values.year}-${values.month}-${values.day}`;
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return { dateKey, minuteOfDay: hh * 60 + mm, dateLabel };
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "config_error" },
      { status: 500 }
    );
  }

  const now = new Date();
  const { dateKey, minuteOfDay, dateLabel } = getBangkokClock(now);
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const force = url.searchParams.get("force") === "1";
  const workspaceFilter = url.searchParams.get("workspaceId")?.trim() || null;
  const channelFilter = url.searchParams.get("channelId")?.trim() || null;
  const windowMinutes = Number(process.env.DISCORD_CRON_WINDOW_MINUTES ?? "20");
  const safeWindow = Number.isFinite(windowMinutes)
    ? Math.max(5, Math.min(60, Math.floor(windowMinutes)))
    : 20;
  const targetMinute = 9 * 60;
  const inWindow = minuteOfDay >= targetMinute && minuteOfDay < targetMinute + safeWindow;

  if (!force && !inWindow) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: 0,
      reason: "outside_schedule_window",
      nowMinute: minuteOfDay,
    });
  }

  let channelsQuery = supabase
    .from("workspace_discord_channels")
    .select("id,workspace_id,channel_name,webhook_url,is_enabled")
    .eq("is_enabled", true);
  if (workspaceFilter) channelsQuery = channelsQuery.eq("workspace_id", workspaceFilter);
  if (channelFilter) channelsQuery = channelsQuery.eq("id", channelFilter);

  const { data: channelsData, error: channelsError } = await channelsQuery;
  if (channelsError) {
    return NextResponse.json({ ok: false, error: channelsError.message }, { status: 500 });
  }
  const channels = (channelsData ?? []) as WorkspaceChannelRow[];
  if (!channels.length) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: "no_enabled_channels" });
  }

  const workspaceIds = Array.from(new Set(channels.map((channel) => channel.workspace_id)));
  const channelIds = channels.map((channel) => channel.id);

  const { data: workspacesData, error: workspacesError } = await supabase
    .from("workspaces")
    .select("id,name")
    .in("id", workspaceIds);
  if (workspacesError) {
    return NextResponse.json({ ok: false, error: workspacesError.message }, { status: 500 });
  }
  const workspaceNameById = new Map(
    ((workspacesData ?? []) as WorkspaceRow[]).map((workspace) => [
      workspace.id,
      workspace.name,
    ])
  );

  const { data: contentData, error: contentError } = await supabase
    .from("content_items")
    .select("workspace_id,payload")
    .in("workspace_id", workspaceIds);
  if (contentError) {
    return NextResponse.json({ ok: false, error: contentError.message }, { status: 500 });
  }

  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("id,workspace_id,title,due_at")
    .in("workspace_id", workspaceIds);
  if (taskError) {
    return NextResponse.json({ ok: false, error: taskError.message }, { status: 500 });
  }

  const itemsByWorkspace = new Map<string, ReturnType<typeof reviveContentItem>[]>();
  for (const row of (contentData ?? []) as ContentRow[]) {
    const item = reviveContentItem(row.payload as never);
    const list = itemsByWorkspace.get(row.workspace_id) ?? [];
    list.push(item);
    itemsByWorkspace.set(row.workspace_id, list);
  }
  const taskRows = (taskData ?? []) as TaskRow[];

  const digestItemsByWorkspace = new Map<string, DiscordProgressDigestItem[]>();
  for (const workspaceId of workspaceIds) {
    const events = buildCalendarEvents(itemsByWorkspace.get(workspaceId) ?? [], "workflow");
    const today = events
      .filter((event) => getBangkokClock(event.date).dateKey === dateKey)
      .map((event) => ({
        id: event.item.id,
        topic: event.item.topic,
        owner: event.item.owner,
        status: event.item.status,
        milestoneLabel: CALENDAR_EVENT_META[event.kind].label,
        dueAt: event.date,
      }))
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    const dueTasks = taskRows
      .filter((row) => row.workspace_id === workspaceId && row.due_at)
      .filter((row) => getBangkokClock(new Date(row.due_at as string)).dateKey === dateKey)
      .map((row) => ({
        id: row.id,
        topic: row.title,
        owner: "Task assignees",
        status: "in_brief" as const,
        milestoneLabel: "Task",
        dueAt: new Date(row.due_at as string),
      }));
    digestItemsByWorkspace.set(
      workspaceId,
      [...today, ...dueTasks].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    );
  }

  const alreadySent = new Set<string>();
  if (!dryRun && !force && channelIds.length) {
    const { data: logsData, error: logsError } = await supabase
      .from("workspace_discord_daily_logs")
      .select("workspace_id,channel_id,digest_date")
      .eq("digest_date", dateKey)
      .in("channel_id", channelIds);
    if (logsError) {
      return NextResponse.json({ ok: false, error: logsError.message }, { status: 500 });
    }
    for (const log of (logsData ?? []) as DailyLogRow[]) {
      alreadySent.add(`${log.workspace_id}:${log.channel_id}:${log.digest_date}`);
    }
  }

  let sent = 0;
  let skipped = 0;
  const details: Array<{
    channelId: string;
    workspaceId: string;
    sent: boolean;
    reason?: string;
    itemCount: number;
  }> = [];

  for (const channel of channels) {
    const dedupeKey = `${channel.workspace_id}:${channel.id}:${dateKey}`;
    const digestItems = digestItemsByWorkspace.get(channel.workspace_id) ?? [];
    if (alreadySent.has(dedupeKey)) {
      skipped += 1;
      details.push({
        channelId: channel.id,
        workspaceId: channel.workspace_id,
        sent: false,
        reason: "already_sent_today",
        itemCount: digestItems.length,
      });
      continue;
    }

    const payload = formatDailyProgressDigest({
      workspaceName:
        workspaceNameById.get(channel.workspace_id) ?? channel.workspace_id,
      dateLabel,
      items: digestItems,
    });

    if (dryRun) {
      sent += 1;
      details.push({
        channelId: channel.id,
        workspaceId: channel.workspace_id,
        sent: true,
        reason: "dry_run",
        itemCount: digestItems.length,
      });
      continue;
    }

    const result = await sendDiscordWebhook(channel.webhook_url, payload);
    if (!result.ok) {
      skipped += 1;
      details.push({
        channelId: channel.id,
        workspaceId: channel.workspace_id,
        sent: false,
        reason: result.error,
        itemCount: digestItems.length,
      });
      await supabase.from("workspace_discord_daily_logs").upsert(
        {
          workspace_id: channel.workspace_id,
          channel_id: channel.id,
          digest_date: dateKey,
          status: "failed",
          error_message: result.error,
        },
        { onConflict: "workspace_id,channel_id,digest_date" }
      );
      continue;
    }

    sent += 1;
    details.push({
      channelId: channel.id,
      workspaceId: channel.workspace_id,
      sent: true,
      itemCount: digestItems.length,
    });
    await supabase.from("workspace_discord_daily_logs").upsert(
      {
        workspace_id: channel.workspace_id,
        channel_id: channel.id,
        digest_date: dateKey,
        status: "sent",
        error_message: null,
      },
      { onConflict: "workspace_id,channel_id,digest_date" }
    );
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    sent,
    skipped,
    dateKey,
    details,
  });
}
