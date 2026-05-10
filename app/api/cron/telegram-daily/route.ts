import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { reviveContentItem } from "@/lib/revive";
import { buildCalendarEvents, CALENDAR_EVENT_META } from "@/lib/calendarEvents";
import { resolveOwnerUserId } from "@/lib/ownerMapping";
import { STATUS_CONFIG } from "@/lib/constants";
import {
  formatDailyDigest,
  sendTelegramMessage,
  type TelegramDigestTask,
} from "@/lib/telegram";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

type MembershipRow = {
  workspace_id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_notifications_enabled: boolean;
  telegram_daily_time: string;
  telegram_timezone: string;
  telegram_last_digest_on: string | null;
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
  payload: Record<string, unknown> | null;
};

type AssignmentRoleRow = {
  id: string;
  workspace_id: string;
  label: string;
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

function siteOrigin(): string | null {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (!origin) return null;
  const withProto = origin.includes("://") ? origin : `https://${origin}`;
  return withProto.replace(/\/$/, "");
}

function getLocalParts(date: Date, timezone: string): {
  dateKey: string;
  minuteOfDay: number;
  dateLabel: string;
} {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
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
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return { dateKey, minuteOfDay: hh * 60 + mm, dateLabel };
}

function parseDailyTimeToMinute(value: string): number {
  const match = /^([0-2]\d):([0-5]\d)$/.exec(value.trim());
  if (!match) return 8 * 60;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23) return 8 * 60;
  return hh * 60 + mm;
}

function shouldSendNow(profile: ProfileRow, now: Date, windowMinutes: number) {
  const timezone = profile.telegram_timezone?.trim() || "Asia/Bangkok";
  try {
    const local = getLocalParts(now, timezone);
    const targetMinute = parseDailyTimeToMinute(profile.telegram_daily_time);
    const withinWindow =
      local.minuteOfDay >= targetMinute &&
      local.minuteOfDay < targetMinute + windowMinutes;
    const notSentToday = profile.telegram_last_digest_on !== local.dateKey;
    return {
      due: withinWindow && notSentToday,
      timezone,
      localDateKey: local.dateKey,
      dateLabel: local.dateLabel,
    };
  } catch {
    const fallbackLocal = getLocalParts(now, "Asia/Bangkok");
    const targetMinute = parseDailyTimeToMinute(profile.telegram_daily_time);
    const withinWindow =
      fallbackLocal.minuteOfDay >= targetMinute &&
      fallbackLocal.minuteOfDay < targetMinute + windowMinutes;
    const notSentToday = profile.telegram_last_digest_on !== fallbackLocal.dateKey;
    return {
      due: withinWindow && notSentToday,
      timezone: "Asia/Bangkok",
      localDateKey: fallbackLocal.dateKey,
      dateLabel: fallbackLocal.dateLabel,
    };
  }
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
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const windowMinutes = Number(process.env.TELEGRAM_CRON_WINDOW_MINUTES ?? "20");
  const safeWindow = Number.isFinite(windowMinutes)
    ? Math.max(5, Math.min(60, Math.floor(windowMinutes)))
    : 20;

  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id");
  if (membershipsError) {
    return NextResponse.json(
      { ok: false, error: membershipsError.message },
      { status: 500 }
    );
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];
  if (!membershipRows.length) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: "no_memberships" });
  }

  const userIds = Array.from(
    new Set(membershipRows.map((row) => row.user_id))
  );
  const workspaceIds = Array.from(
    new Set(membershipRows.map((row) => row.workspace_id))
  );

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id,email,display_name,telegram_chat_id,telegram_username,telegram_notifications_enabled,telegram_daily_time,telegram_timezone,telegram_last_digest_on"
    )
    .in("id", userIds);
  if (profilesError) {
    return NextResponse.json({ ok: false, error: profilesError.message }, { status: 500 });
  }

  const profiles = (profilesData ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const eligibleUsers = profiles
    .filter(
      (profile) =>
        profile.telegram_notifications_enabled && Boolean(profile.telegram_chat_id)
    )
    .map((profile) => {
      const timing = shouldSendNow(profile, now, safeWindow);
      return { profile, timing };
    })
    .filter((entry) => entry.timing.due);

  if (!eligibleUsers.length) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: "no_due_users" });
  }

  const { data: workspaceData, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id,name")
    .in("id", workspaceIds);
  if (workspaceError) {
    return NextResponse.json({ ok: false, error: workspaceError.message }, { status: 500 });
  }

  const workspaceNameById = new Map(
    (workspaceData ?? []).map((workspace) => [workspace.id as string, workspace.name as string])
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
    .select("id,workspace_id,title,due_at,payload")
    .in("workspace_id", workspaceIds);
  if (taskError) {
    return NextResponse.json({ ok: false, error: taskError.message }, { status: 500 });
  }

  const { data: roleData, error: roleError } = await supabase
    .from("assignment_roles")
    .select("id,workspace_id,label")
    .in("workspace_id", workspaceIds);
  if (roleError) {
    return NextResponse.json({ ok: false, error: roleError.message }, { status: 500 });
  }
  const roleLabelById = new Map(
    ((roleData ?? []) as AssignmentRoleRow[]).map((row) => [row.id, row.label])
  );

  const contentRows = (contentData ?? []) as ContentRow[];
  const taskRows = (taskData ?? []) as TaskRow[];
  const itemsByWorkspace = new Map<string, ReturnType<typeof reviveContentItem>[]>();
  for (const row of contentRows) {
    const item = reviveContentItem(row.payload as never);
    const items = itemsByWorkspace.get(row.workspace_id) ?? [];
    items.push(item);
    itemsByWorkspace.set(row.workspace_id, items);
  }

  const eventsByWorkspace = new Map<
    string,
    ReturnType<typeof buildCalendarEvents>
  >();
  for (const workspaceId of workspaceIds) {
    const items = itemsByWorkspace.get(workspaceId) ?? [];
    eventsByWorkspace.set(workspaceId, buildCalendarEvents(items, "workflow"));
  }

  const baseSite = siteOrigin();
  let sent = 0;
  let skipped = 0;
  const details: Array<{
    userId: string;
    chatId: string;
    tasks: number;
    sent: boolean;
    reason?: string;
  }> = [];

  for (const { profile, timing } of eligibleUsers) {
    const userMemberships = membershipRows.filter(
      (row) => row.user_id === profile.id
    );

    const userTasks: TelegramDigestTask[] = [];
    for (const membership of userMemberships) {
      const workspaceMembers = membershipRows
        .filter((row) => row.workspace_id === membership.workspace_id)
        .map((row) => {
          const memberProfile = profileById.get(row.user_id);
          return {
            user_id: row.user_id,
            display_name: memberProfile?.display_name ?? null,
            email: memberProfile?.email ?? null,
          };
        });

      const events = eventsByWorkspace.get(membership.workspace_id) ?? [];
      const todayEvents = events.filter((event) => {
        const local = getLocalParts(event.date, timing.timezone);
        return local.dateKey === timing.localDateKey;
      });

      for (const event of todayEvents) {
        const ownerUserId = resolveOwnerUserId(event.item.owner, workspaceMembers);
        const milestoneAssignees =
          event.item.assignees?.map((entry) => entry.userId) ?? [];
        const isAssignee = milestoneAssignees.includes(profile.id);
        if (!isAssignee && (!ownerUserId || ownerUserId !== profile.id)) continue;
        userTasks.push({
          id: event.item.id,
          topic: event.item.topic,
          milestoneLabel: CALENDAR_EVENT_META[event.kind].label,
          dueAt: event.date,
          statusLabel: STATUS_CONFIG[event.item.status].label,
          source: "content",
          briefUrl: baseSite ? `${baseSite}/briefs/${event.item.id}` : undefined,
        });
      }

      const workspaceTasks = taskRows.filter(
        (task) => task.workspace_id === membership.workspace_id
      );
      for (const task of workspaceTasks) {
        if (!task.due_at) continue;
        const local = getLocalParts(new Date(task.due_at), timing.timezone);
        if (local.dateKey !== timing.localDateKey) continue;
        const assignees = Array.isArray(task.payload?.assignees)
          ? (task.payload?.assignees as Array<{
              userId?: string;
              roleId?: string;
            }>)
          : [];
        const myRoles = assignees.filter((entry) => entry.userId === profile.id);
        if (!myRoles.length) continue;
        userTasks.push({
          id: task.id,
          topic: task.title,
          milestoneLabel: "Task",
          dueAt: new Date(task.due_at),
          statusLabel: "Open",
          source: "task",
          roleLabel: myRoles
            .map((entry) => (entry.roleId ? roleLabelById.get(entry.roleId) : null))
            .filter(Boolean)
            .join(", "),
          briefUrl: baseSite ? `${baseSite}/tasks/${task.id}` : undefined,
        });
      }
    }

    userTasks.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    const recipientName =
      profile.display_name?.trim() ||
      profile.email?.trim() ||
      profile.telegram_username?.trim() ||
      "ทีมงาน";
    const workspaceText =
      userMemberships.length === 1
        ? workspaceNameById.get(userMemberships[0].workspace_id) ?? undefined
        : undefined;

    const digest = formatDailyDigest({
      recipientName,
      workspaceName: workspaceText,
      dateLabel: timing.dateLabel,
      tasks: userTasks,
    });

    const chatId = profile.telegram_chat_id?.trim();
    if (!chatId) {
      skipped += 1;
      details.push({
        userId: profile.id,
        chatId: "",
        tasks: userTasks.length,
        sent: false,
        reason: "missing_chat_id",
      });
      continue;
    }

    if (dryRun) {
      sent += 1;
      details.push({
        userId: profile.id,
        chatId,
        tasks: userTasks.length,
        sent: true,
        reason: "dry_run",
      });
      continue;
    }

    const sendResult = await sendTelegramMessage(chatId, digest);
    if (!sendResult.ok) {
      skipped += 1;
      details.push({
        userId: profile.id,
        chatId,
        tasks: userTasks.length,
        sent: false,
        reason: sendResult.error,
      });
      continue;
    }

    sent += 1;
    details.push({
      userId: profile.id,
      chatId,
      tasks: userTasks.length,
      sent: true,
    });

    await supabase
      .from("profiles")
      .update({
        telegram_last_digest_on: timing.localDateKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    sent,
    skipped,
    checkedUsers: eligibleUsers.length,
    details,
  });
}
