"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  useSupabaseApp,
  type PlannerRole,
} from "@/components/supabase/SupabaseAppProvider";
import { usePlannerPermissions } from "@/hooks/usePlannerPermissions";
import { cn } from "@/lib/utils";
import { useContentTypes } from "@/hooks/useContentTypes";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useTaskTypes } from "@/hooks/useTaskTypes";
import { useAssignmentRoles } from "@/hooks/useAssignmentRoles";
import { buildUserInitials } from "@/lib/initials";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const ROLE_HELP: Record<PlannerRole, { title: string; body: string }> = {
  viewer: {
    title: "ผู้ดู",
    body: "ดู Dashboard / ปฏิทิน / Brief / Performance ได้ ไม่สามารถแก้ไขหรือสร้าง Brief ใหม่",
  },
  editor: {
    title: "ผู้แก้ไข",
    body: "สร้างและแก้ไข Brief ซิงค์ข้อมูลคลาวด์ และใช้งานทุกฟีเจอร์หลักยกเว้นจัดการผู้ใช้",
  },
  admin: {
    title: "ผู้ดูแลระบบ (profiles)",
    body: "ถ้าเห็นบทบาทนี้จากข้อมูลเก่า — การเข้าเมนูหลังบ้านควบคุมจากตาราง admin_emails ใน Supabase",
  },
};

type DiscordChannelRow = {
  id: string;
  channel_name: string;
  webhook_url: string;
  is_enabled: boolean;
};

function buildTelegramLinks(botUsername: string, token: string) {
  const username = botUsername.replace(/^@/, "");
  const encodedUsername = encodeURIComponent(username);
  const encodedToken = encodeURIComponent(token);
  return {
    appLink: `tg://resolve?domain=${encodedUsername}&start=${encodedToken}`,
    webLink: `https://t.me/${encodedUsername}?start=${encodedToken}`,
  };
}

export function SettingsPageClient() {
  const {
    supabase,
    session,
    role,
    workspaceId,
    workspaceRole,
    workspaces,
    workspaceMembers,
    workspaceLoading,
    setActiveWorkspace,
    refreshWorkspace,
    canAccessAdmin,
    displayName,
    avatarUrl,
    avatarColor,
    telegramChatId,
    telegramUsername,
    telegramNotificationsEnabled,
    telegramDailyTime,
    telegramTimezone,
    organizationName,
    organizationTagline,
    loadingProfile,
    refreshProfile,
    refreshOrganizationSettings,
    signOut,
  } = useSupabaseApp();

  const { isWorkspaceAdmin } = usePlannerPermissions();
  const {
    items: contentTypeRows,
    activeItems: activeContentTypes,
    loading: contentTypeLoading,
    refresh: refreshContentTypes,
  } = useContentTypes();
  const {
    items: taskListRows,
    activeItems: activeTaskLists,
    refresh: refreshTaskLists,
  } = useTaskLists();
  const {
    items: taskTypeRows,
    activeItems: activeTaskTypes,
    refresh: refreshTaskTypes,
  } = useTaskTypes();
  const {
    items: assignmentRoleRows,
    activeItems: activeAssignmentRoles,
    refresh: refreshAssignmentRoles,
  } = useAssignmentRoles();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [nameDraft, setNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [telegramEnabledDraft, setTelegramEnabledDraft] = useState(false);
  const [telegramTimeDraft, setTelegramTimeDraft] = useState("08:00");
  const [telegramTimezoneDraft, setTelegramTimezoneDraft] = useState("Asia/Bangkok");

  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [taglineDraft, setTaglineDraft] = useState("");
  const [reportNoteDraft, setReportNoteDraft] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PlannerRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [memberActionBusy, setMemberActionBusy] = useState<string | null>(null);
  const [mergeSourceWorkspace, setMergeSourceWorkspace] = useState<string>("");
  const [mergingWorkspace, setMergingWorkspace] = useState(false);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannelRow[]>([]);
  const [discordChannelNameDraft, setDiscordChannelNameDraft] = useState("");
  const [discordWebhookDraft, setDiscordWebhookDraft] = useState("");
  const [discordBusyId, setDiscordBusyId] = useState<string | null>(null);
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordTesting, setDiscordTesting] = useState<string | null>(null);

  const [telegramPopupOpen, setTelegramPopupOpen] = useState(false);
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramAppLink, setTelegramAppLink] = useState<string>("");
  const [telegramWebLink, setTelegramWebLink] = useState<string>("");
  const [telegramWebhookInfo, setTelegramWebhookInfo] = useState<{
    ok: boolean;
    url?: string;
    last_error_message?: string;
    pending_update_count?: number;
    error?: string;
  } | null>(null);
  const [telegramWebhookBusy, setTelegramWebhookBusy] = useState(false);

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceSlug, setNewWorkspaceSlug] = useState("");
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceRenameDraft, setWorkspaceRenameDraft] = useState("");
  const [workspaceSlugDraft, setWorkspaceSlugDraft] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const [ctLabelDraft, setCtLabelDraft] = useState("");
  const [ctSlugDraft, setCtSlugDraft] = useState("");
  const [ctColorDraft, setCtColorDraft] = useState("#5B6CFF");
  const [contentTypeBusy, setContentTypeBusy] = useState<string | null>(null);
  const [taskListLabelDraft, setTaskListLabelDraft] = useState("");
  const [taskListSlugDraft, setTaskListSlugDraft] = useState("");
  const [taskListBusy, setTaskListBusy] = useState<string | null>(null);
  const [taskTypeLabelDraft, setTaskTypeLabelDraft] = useState("");
  const [taskTypeSlugDraft, setTaskTypeSlugDraft] = useState("");
  const [taskTypeColorDraft, setTaskTypeColorDraft] = useState("#0EA5E9");
  const [taskTypeBusyId, setTaskTypeBusyId] = useState<string | null>(null);
  const [assignmentRoleLabelDraft, setAssignmentRoleLabelDraft] = useState("");
  const [assignmentRoleSlugDraft, setAssignmentRoleSlugDraft] = useState("");
  const [assignmentRoleBusy, setAssignmentRoleBusy] = useState<string | null>(null);

  const [apiKeys, setApiKeys] = useState<
    Array<{
      id: string;
      name: string;
      prefix: string;
      scopes: string[];
      last_used_at: string | null;
      revoked_at: string | null;
      created_at: string;
    }>
  >([]);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyBusy, setApiKeyBusy] = useState(false);
  const [newlyIssuedKey, setNewlyIssuedKey] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setNameDraft(displayName ?? "");
  }, [displayName]);

  useEffect(() => {
    setTelegramEnabledDraft(telegramNotificationsEnabled);
    setTelegramTimeDraft(telegramDailyTime || "08:00");
    setTelegramTimezoneDraft(telegramTimezone || "Asia/Bangkok");
  }, [telegramNotificationsEnabled, telegramDailyTime, telegramTimezone]);

  useEffect(() => {
    setOrgNameDraft(organizationName);
    setTaglineDraft(organizationTagline);
  }, [organizationName, organizationTagline]);

  useEffect(() => {
    setMergeSourceWorkspace("");
  }, [workspaceId]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId) ?? null,
    [workspaces, workspaceId]
  );
  const identityInitials = useMemo(
    () => buildUserInitials(displayName, session?.user?.email ?? null),
    [displayName, session?.user?.email]
  );

  useEffect(() => {
    setWorkspaceRenameDraft(activeWorkspace?.name ?? "");
    setWorkspaceSlugDraft(activeWorkspace?.slug ?? "");
  }, [activeWorkspace?.id, activeWorkspace?.name, activeWorkspace?.slug]);

  useEffect(() => {
    if (!supabase || !workspaceId || !session?.user) {
      setDiscordChannels([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("workspace_discord_channels")
        .select("id, channel_name, webhook_url, is_enabled")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setDiscordChannels([]);
        return;
      }
      setDiscordChannels((data ?? []) as DiscordChannelRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, workspaceId, session?.user]);

  useEffect(() => {
    if (!supabase || !session?.user || !canAccessAdmin) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("report_footer_note")
        .eq("id", "global")
        .maybeSingle();
      if (cancelled) return;
      if (!error && data?.report_footer_note != null) {
        setReportNoteDraft(String(data.report_footer_note));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, session?.user, canAccessAdmin]);

  const email = session?.user?.email ?? "—";

  const saveProfile = async () => {
    if (!supabase || !session?.user) return;
    setSavingProfile(true);
    const trimmed = nameDraft.trim();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmed || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (error) {
      toast.error(error.message);
      setSavingProfile(false);
      return;
    }
    toast.success("บันทึกโปรไฟล์แล้ว");
    await refreshProfile();
    setSavingProfile(false);
  };

  const saveTelegramSettings = async () => {
    if (!supabase || !session?.user) return;
    setSavingTelegram(true);
    const hhmm = /^\d{2}:\d{2}$/.test(telegramTimeDraft)
      ? telegramTimeDraft
      : "08:00";
    const { error } = await supabase
      .from("profiles")
      .update({
        telegram_notifications_enabled: telegramEnabledDraft,
        telegram_daily_time: hhmm,
        telegram_timezone: telegramTimezoneDraft || "Asia/Bangkok",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (error) {
      toast.error(error.message);
      setSavingTelegram(false);
      return;
    }
    toast.success("บันทึกการแจ้งเตือน Telegram แล้ว");
    await refreshProfile();
    setSavingTelegram(false);
  };

  const connectTelegram = async () => {
    if (!supabase || !session?.user) return;
    setLinkingTelegram(true);
    const { data, error } = await supabase.rpc("issue_telegram_link_token", {
      p_ttl_minutes: 30,
    });
    if (error || !data) {
      toast.error(error?.message || "สร้างโค้ดเชื่อมต่อไม่สำเร็จ");
      setLinkingTelegram(false);
      return;
    }
    const token = String(data);
    const botUsername =
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "";
    if (!botUsername) {
      toast.info(
        `ตั้งค่า NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ก่อน แล้วส่งคำสั่งนี้ให้บอท: /start ${token}`
      );
      setLinkingTelegram(false);
      return;
    }
    const links = buildTelegramLinks(botUsername, token);
    setTelegramToken(token);
    setTelegramAppLink(links.appLink);
    setTelegramWebLink(links.webLink);
    setTelegramPopupOpen(true);
    toast.success("สร้างโค้ดเชื่อมต่อแล้ว");
    setLinkingTelegram(false);
  };

  const saveOrganization = async () => {
    if (!supabase || !canAccessAdmin) return;
    setSavingOrg(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        organization_name: orgNameDraft.trim() || "DINKR",
        organization_tagline: taglineDraft.trim(),
        report_footer_note: reportNoteDraft.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", "global");

    if (error) {
      toast.error(error.message);
      setSavingOrg(false);
      return;
    }
    toast.success("บันทึกการตั้งค่าโปรเจกต์แล้ว");
    await refreshOrganizationSettings();
    setSavingOrg(false);
  };

  const rh = ROLE_HELP[role];

  const inviteMember = async () => {
    if (!supabase || !workspaceId || !inviteEmail.trim()) return;
    setInviting(true);
    const { error } = await supabase.rpc("invite_to_workspace", {
      p_workspace: workspaceId,
      p_email: inviteEmail.trim(),
      p_role: inviteRole,
    });
    setInviting(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email_not_registered")) {
        toast.error(
          "ไม่พบอีเมลนี้ในระบบ — ผู้ถูกเชิญต้องล็อกอินครั้งแรกให้มีโปรไฟล์ก่อน"
        );
      } else if (msg.includes("invite denied")) {
        toast.error("คุณไม่ใช่แอดมินของทีม workspace นี้");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("เชิญสมาชิกเข้าทีมแล้ว");
    setInviteEmail("");
    await refreshWorkspace();
  };

  const updateMemberRole = async (memberUserId: string, nextRole: PlannerRole) => {
    if (!supabase || !workspaceId) return;
    setMemberActionBusy(`role:${memberUserId}`);
    const { error } = await supabase
      .from("workspace_members")
      .update({ role: nextRole })
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberUserId);
    setMemberActionBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("อัปเดตบทบาทสมาชิกแล้ว");
    await refreshWorkspace();
  };

  const removeMember = async (memberUserId: string) => {
    if (!supabase || !workspaceId) return;
    const me = session?.user?.id;
    if (memberUserId === me) {
      toast.error("ยังไม่รองรับการลบตัวเองออกจากทีมในหน้านี้");
      return;
    }
    setMemberActionBusy(`remove:${memberUserId}`);
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberUserId);
    setMemberActionBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ลบสมาชิกออกจากทีมแล้ว");
    await refreshWorkspace();
  };

  const mergeWorkspaceIntoCurrent = async () => {
    if (!supabase || !workspaceId || !mergeSourceWorkspace) return;
    if (mergeSourceWorkspace === workspaceId) return;
    setMergingWorkspace(true);
    const { data, error } = await supabase.rpc("merge_workspace_content", {
      p_source_workspace: mergeSourceWorkspace,
      p_target_workspace: workspaceId,
    });
    setMergingWorkspace(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const moved = Number(data ?? 0);
    toast.success(`ย้ายคอนเทนต์ ${moved} รายการเข้า workspace ปัจจุบันแล้ว`);
    setMergeSourceWorkspace("");
    await refreshWorkspace();
  };

  const refreshDiscordChannels = async () => {
    if (!supabase || !workspaceId) return;
    const { data, error } = await supabase
      .from("workspace_discord_channels")
      .select("id, channel_name, webhook_url, is_enabled")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDiscordChannels((data ?? []) as DiscordChannelRow[]);
  };

  const addDiscordChannel = async () => {
    if (!supabase || !workspaceId) return;
    const channelName = discordChannelNameDraft.trim();
    const webhookUrl = discordWebhookDraft.trim();
    if (!channelName || !webhookUrl) {
      toast.error("กรอกชื่อห้องและ webhook URL ให้ครบ");
      return;
    }
    setDiscordSaving(true);
    const { error } = await supabase.from("workspace_discord_channels").insert({
      workspace_id: workspaceId,
      channel_name: channelName,
      webhook_url: webhookUrl,
      is_enabled: true,
      created_by: session?.user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    setDiscordSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDiscordChannelNameDraft("");
    setDiscordWebhookDraft("");
    toast.success("เพิ่ม Discord channel แล้ว");
    await refreshDiscordChannels();
  };

  const toggleDiscordChannel = async (id: string, enabled: boolean) => {
    if (!supabase) return;
    setDiscordBusyId(id);
    const { error } = await supabase
      .from("workspace_discord_channels")
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("id", id);
    setDiscordBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshDiscordChannels();
  };

  const removeDiscordChannel = async (id: string) => {
    if (!supabase) return;
    setDiscordBusyId(id);
    const { error } = await supabase
      .from("workspace_discord_channels")
      .delete()
      .eq("id", id);
    setDiscordBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ลบ Discord channel แล้ว");
    await refreshDiscordChannels();
  };

  const sendDiscordTest = async (channelId: string) => {
    setDiscordTesting(channelId);
    try {
      const response = await fetch("/api/discord/test-daily", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          channelId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        toast.error(payload.error || "ส่งข้อความทดสอบไม่สำเร็จ");
        return;
      }
      toast.success("ส่งข้อความทดสอบไป Discord แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งทดสอบไม่สำเร็จ");
    } finally {
      setDiscordTesting(null);
    }
  };

  const openTelegramPopup = () => {
    if (!telegramAppLink) return;
    const popup = window.open(
      telegramAppLink,
      "telegram-connect",
      "noopener,noreferrer,width=560,height=760"
    );
    window.setTimeout(() => {
      if (!popup || popup.closed) {
        window.open(telegramWebLink, "_blank", "noopener,noreferrer");
      }
    }, 1200);
  };

  const loadTelegramWebhookStatus = async () => {
    setTelegramWebhookBusy(true);
    try {
      const response = await fetch("/api/admin/telegram/status", {
        method: "GET",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        last_error_message?: string;
        pending_update_count?: number;
        error?: string;
      };
      setTelegramWebhookInfo({ ...payload, ok: Boolean(payload.ok) });
      if (!response.ok || !payload.ok) {
        toast.error(payload.error || "โหลดสถานะ Telegram bot ไม่สำเร็จ");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "โหลดสถานะ Telegram bot ไม่สำเร็จ");
    } finally {
      setTelegramWebhookBusy(false);
    }
  };

  const setupTelegramWebhook = async () => {
    setTelegramWebhookBusy(true);
    try {
      const response = await fetch("/api/admin/telegram/setup-webhook", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        result?: { description?: string };
      };
      if (!response.ok || !payload.ok) {
        toast.error(payload.error || "ตั้งค่า Telegram webhook ไม่สำเร็จ");
        return;
      }
      toast.success("ตั้งค่า Telegram webhook แล้ว");
      await loadTelegramWebhookStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ตั้งค่า Telegram webhook ไม่สำเร็จ");
    } finally {
      setTelegramWebhookBusy(false);
    }
  };

  const createWorkspace = async () => {
    if (!supabase || !session?.user) return;
    const name = newWorkspaceName.trim();
    if (!name) {
      toast.error("กรอกชื่อ workspace ก่อน");
      return;
    }
    setWorkspaceBusy(true);
    const slug = newWorkspaceSlug.trim().toLowerCase() || null;
    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        name,
        slug,
        created_by: session.user.id,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error || !data?.id) {
      toast.error(error?.message || "สร้าง workspace ไม่สำเร็จ");
      setWorkspaceBusy(false);
      return;
    }
    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: data.id,
      user_id: session.user.id,
      role: "admin",
    });
    setWorkspaceBusy(false);
    if (memberError) {
      toast.error(memberError.message);
      return;
    }
    toast.success("สร้าง workspace ใหม่แล้ว");
    setNewWorkspaceName("");
    setNewWorkspaceSlug("");
    await refreshWorkspace();
    setActiveWorkspace(data.id);
  };

  const renameWorkspace = async () => {
    if (!supabase || !workspaceId) return;
    const name = workspaceRenameDraft.trim();
    if (!name) {
      toast.error("กรอกชื่อ workspace ก่อนบันทึก");
      return;
    }
    setWorkspaceBusy(true);
    const { error } = await supabase
      .from("workspaces")
      .update({
        name,
        slug: workspaceSlugDraft.trim().toLowerCase() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);
    setWorkspaceBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("บันทึกข้อมูล workspace แล้ว");
    await refreshWorkspace();
  };

  const archiveWorkspace = async () => {
    if (!supabase || !workspaceId) return;
    setWorkspaceBusy(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", workspaceId);
    setWorkspaceBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ย้าย workspace เข้าคลังแล้ว");
    await refreshWorkspace();
  };

  const leaveWorkspace = async () => {
    if (!supabase || !workspaceId || !session?.user) return;
    setWorkspaceBusy(true);
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", session.user.id);
    setWorkspaceBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ออกจาก workspace แล้ว");
    await refreshWorkspace();
  };

  const createWorkspaceInviteLink = async () => {
    if (!supabase || !workspaceId) return;
    setWorkspaceBusy(true);
    const { data, error } = await supabase.rpc("issue_workspace_invite", {
      p_workspace: workspaceId,
      p_ttl_minutes: 1440,
    });
    setWorkspaceBusy(false);
    if (error || !data) {
      toast.error(error?.message || "สร้างลิงก์เชิญไม่สำเร็จ");
      return;
    }
    const origin =
      (typeof window !== "undefined" ? window.location.origin : "") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";
    const url = `${origin.replace(/\/$/, "")}/join?token=${encodeURIComponent(String(data))}`;
    setInviteLink(url);
    toast.success("สร้างลิงก์เชิญแล้ว");
  };

  const upsertContentType = async () => {
    if (!supabase || !workspaceId) return;
    const label = ctLabelDraft.trim();
    const slug =
      ctSlugDraft.trim().toLowerCase() ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!label || !slug) {
      toast.error("กรอกชื่อประเภทคอนเทนต์");
      return;
    }
    setContentTypeBusy("create");
    const nextOrder =
      Math.max(0, ...contentTypeRows.map((row) => Number(row.sort_order || 0))) + 10;
    const { error } = await supabase.from("content_types").upsert(
      {
        workspace_id: workspaceId,
        slug,
        label,
        color: ctColorDraft.trim() || null,
        sort_order: nextOrder,
        is_archived: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,slug" }
    );
    setContentTypeBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCtLabelDraft("");
    setCtSlugDraft("");
    toast.success("บันทึก content type แล้ว");
    await refreshContentTypes();
  };

  const moveContentType = async (id: string, direction: "up" | "down") => {
    if (!supabase) return;
    const list = [...activeContentTypes];
    const idx = list.findIndex((row) => row.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;
    const current = list[idx];
    const target = list[swapWith];
    setContentTypeBusy(id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("content_types")
      .upsert([
        { id: current.id, sort_order: target.sort_order, updated_at: now },
        { id: target.id, sort_order: current.sort_order, updated_at: now },
      ]);
    setContentTypeBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("จัดลำดับ content type แล้ว");
    await refreshContentTypes();
  };

  const archiveContentType = async (id: string) => {
    if (!supabase) return;
    setContentTypeBusy(id);
    const { error } = await supabase
      .from("content_types")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    setContentTypeBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("เก็บประเภทคอนเทนต์แล้ว");
    await refreshContentTypes();
  };

  const upsertTaskList = async () => {
    if (!supabase || !workspaceId) return;
    const label = taskListLabelDraft.trim();
    const slug =
      taskListSlugDraft.trim().toLowerCase() ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!label || !slug) {
      toast.error("กรอกชื่อคอลัมน์งาน");
      return;
    }
    setTaskListBusy("create");
    const nextOrder =
      Math.max(0, ...taskListRows.map((row) => Number(row.position || 0))) + 10;
    const { error } = await supabase.from("task_lists").upsert(
      {
        workspace_id: workspaceId,
        slug,
        label,
        position: nextOrder,
        archived_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,slug" }
    );
    setTaskListBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTaskListLabelDraft("");
    setTaskListSlugDraft("");
    toast.success("บันทึก task list แล้ว");
    await refreshTaskLists();
  };

  const moveTaskList = async (id: string, direction: "up" | "down") => {
    if (!supabase) return;
    const list = [...activeTaskLists];
    const idx = list.findIndex((row) => row.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;
    const current = list[idx];
    const target = list[swapWith];
    setTaskListBusy(id);
    const now = new Date().toISOString();
    const { error } = await supabase.from("task_lists").upsert([
      { id: current.id, position: target.position, updated_at: now },
      { id: target.id, position: current.position, updated_at: now },
    ]);
    setTaskListBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshTaskLists();
  };

  const archiveTaskList = async (id: string) => {
    if (!supabase) return;
    setTaskListBusy(id);
    const { error } = await supabase
      .from("task_lists")
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    setTaskListBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshTaskLists();
  };

  const upsertTaskType = async () => {
    if (!supabase || !workspaceId) return;
    const label = taskTypeLabelDraft.trim();
    const slug =
      taskTypeSlugDraft.trim().toLowerCase() ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!label || !slug) {
      toast.error("กรอกชื่อประเภทงาน");
      return;
    }
    setTaskTypeBusyId("create");
    const nextOrder =
      Math.max(0, ...taskTypeRows.map((row) => Number(row.position || 0))) + 10;
    const { error } = await supabase.from("task_types").upsert(
      {
        workspace_id: workspaceId,
        slug,
        label,
        color: taskTypeColorDraft.trim() || null,
        position: nextOrder,
        archived_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,slug" }
    );
    setTaskTypeBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTaskTypeLabelDraft("");
    setTaskTypeSlugDraft("");
    toast.success("บันทึก task type แล้ว");
    await refreshTaskTypes();
  };

  const moveTaskType = async (id: string, direction: "up" | "down") => {
    if (!supabase) return;
    const list = [...activeTaskTypes];
    const idx = list.findIndex((row) => row.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;
    const current = list[idx];
    const target = list[swapWith];
    setTaskTypeBusyId(id);
    const now = new Date().toISOString();
    const { error } = await supabase.from("task_types").upsert([
      { id: current.id, position: target.position, updated_at: now },
      { id: target.id, position: current.position, updated_at: now },
    ]);
    setTaskTypeBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshTaskTypes();
  };

  const archiveTaskType = async (id: string) => {
    if (!supabase) return;
    setTaskTypeBusyId(id);
    const { error } = await supabase
      .from("task_types")
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    setTaskTypeBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshTaskTypes();
  };

  const upsertAssignmentRole = async () => {
    if (!supabase || !workspaceId) return;
    const label = assignmentRoleLabelDraft.trim();
    const slug =
      assignmentRoleSlugDraft.trim().toLowerCase() ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!label || !slug) {
      toast.error("กรอกชื่อบทบาท");
      return;
    }
    setAssignmentRoleBusy("create");
    const nextOrder =
      Math.max(0, ...assignmentRoleRows.map((row) => Number(row.position || 0))) + 10;
    const { error } = await supabase.from("assignment_roles").upsert(
      {
        workspace_id: workspaceId,
        slug,
        label,
        position: nextOrder,
        archived_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,slug" }
    );
    setAssignmentRoleBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAssignmentRoleLabelDraft("");
    setAssignmentRoleSlugDraft("");
    await refreshAssignmentRoles();
  };

  const moveAssignmentRole = async (id: string, direction: "up" | "down") => {
    if (!supabase) return;
    const list = [...activeAssignmentRoles];
    const idx = list.findIndex((row) => row.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;
    const current = list[idx];
    const target = list[swapWith];
    setAssignmentRoleBusy(id);
    const now = new Date().toISOString();
    const { error } = await supabase.from("assignment_roles").upsert([
      { id: current.id, position: target.position, updated_at: now },
      { id: target.id, position: current.position, updated_at: now },
    ]);
    setAssignmentRoleBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshAssignmentRoles();
  };

  const archiveAssignmentRole = async (id: string) => {
    if (!supabase) return;
    setAssignmentRoleBusy(id);
    const { error } = await supabase
      .from("assignment_roles")
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    setAssignmentRoleBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshAssignmentRoles();
  };

  const loadApiKeys = useCallback(async () => {
    if (!workspaceId) return;
    setApiKeyBusy(true);
    try {
      const response = await fetch(`/api/openclaw/keys?workspaceId=${encodeURIComponent(workspaceId)}`);
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        keys?: Array<{
          id: string;
          name: string;
          prefix: string;
          scopes: string[];
          last_used_at: string | null;
          revoked_at: string | null;
          created_at: string;
        }>;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        toast.error(payload.error || "โหลด API keys ไม่สำเร็จ");
        return;
      }
      setApiKeys(payload.keys ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "โหลด API keys ไม่สำเร็จ");
    } finally {
      setApiKeyBusy(false);
    }
  }, [workspaceId]);

  const createApiKey = async () => {
    if (!workspaceId) return;
    const name = apiKeyName.trim();
    if (!name) {
      toast.error("กรอกชื่อ API key");
      return;
    }
    setApiKeyBusy(true);
    try {
      const response = await fetch("/api/openclaw/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, name }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        key?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.key) {
        toast.error(payload.error || "สร้าง API key ไม่สำเร็จ");
        return;
      }
      setNewlyIssuedKey(payload.key);
      setApiKeyName("");
      toast.success("สร้าง API key แล้ว (จะแสดงครั้งเดียว)");
      await loadApiKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สร้าง API key ไม่สำเร็จ");
    } finally {
      setApiKeyBusy(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    setApiKeyBusy(true);
    try {
      const response = await fetch("/api/openclaw/keys", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        toast.error(payload.error || "ยกเลิก API key ไม่สำเร็จ");
        return;
      }
      toast.success("ยกเลิก API key แล้ว");
      await loadApiKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ยกเลิก API key ไม่สำเร็จ");
    } finally {
      setApiKeyBusy(false);
    }
  };

  useEffect(() => {
    if (!canAccessAdmin || !workspaceId) return;
    void loadApiKeys();
  }, [canAccessAdmin, workspaceId, loadApiKeys]);

  useEffect(() => {
    if (!telegramPopupOpen || telegramChatId) return;
    const timer = window.setInterval(() => {
      void refreshProfile();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [telegramPopupOpen, telegramChatId, refreshProfile]);

  useEffect(() => {
    if (telegramPopupOpen && telegramChatId) {
      setTelegramPopupOpen(false);
      toast.success("เชื่อม Telegram สำเร็จแล้ว");
    }
  }, [telegramPopupOpen, telegramChatId]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="inline-flex rounded-lg bg-primary/10 p-1.5">
            <MaterialIcon name="settings" size={26} className="text-primary" />
          </span>
          ตั้งค่า
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          โปรไฟล์ การตั้งค่าโปรเจกต์ สิทธิ์ และรูปลักษณ์ของแอป — การแจ้งเตือน Telegram
          อยู่ในแท็บ «โปรไฟล์» (เลื่อนลงใต้บัญชี) · Discord Daily Summary อยู่ในแท็บ «ทีม
          Workspace»
        </p>
      </div>

      <Tabs defaultValue="profile" className="gap-6">
        <TabsList variant="line" className="w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="profile">โปรไฟล์</TabsTrigger>
          <TabsTrigger value="project">โปรเจกต์</TabsTrigger>
          <TabsTrigger value="access">การเข้าถึง</TabsTrigger>
          <TabsTrigger value="content-types">Content Types</TabsTrigger>
          <TabsTrigger value="task-lists">Task Lists</TabsTrigger>
          <TabsTrigger value="assignment-roles">Assignment Roles</TabsTrigger>
          <TabsTrigger value="task-types">Task Types</TabsTrigger>
          <TabsTrigger value="workspace">ทีม Workspace</TabsTrigger>
          <TabsTrigger value="integrations">OpenClaw/API</TabsTrigger>
          <TabsTrigger value="appearance">รูปลักษณ์</TabsTrigger>
          <TabsTrigger value="about">เกี่ยวกับ</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">บัญชีของคุณ</CardTitle>
              <CardDescription>
                ชื่อที่แสดงในแอปและอีเมลจากบัญชี Google (แก้อีเมลได้ที่บัญชี Google)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <Avatar
                  src={avatarUrl}
                  fallback={identityInitials}
                  colorClassName={avatarColor}
                  className="h-11 w-11 text-sm"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayName || email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    initials: {identityInitials}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name">ชื่อที่แสดง</Label>
                <Input
                  id="display-name"
                  placeholder="เช่น คุณนภัสสร"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  disabled={loadingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label>อีเมล</Label>
                <Input value={email} readOnly className="bg-muted/50" />
              </div>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  บทบาทในระบบ (profiles)
                </p>
                <p className="mt-1 font-medium capitalize">{role}</p>
                <p className="mt-2 text-sm text-muted-foreground">{rh.body}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  บทบาทใน workspace (ซิงค์คอนเทนต์)
                </p>
                <p className="mt-1 font-medium capitalize">
                  {workspaceRole ?? (workspaceLoading ? "กำลังโหลด…" : "—")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={savingProfile || loadingProfile}
                >
                  บันทึกโปรไฟล์
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void signOut()}
                >
                  ออกจากระบบ
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Telegram Notifications</CardTitle>
              <CardDescription>
                รับสรุปงานรายวันผ่าน DM โดยส่งตาม owner ของงานในแต่ละ workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <p className="font-medium">
                  สถานะการเชื่อมต่อ:{" "}
                  <span className={telegramChatId ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-300"}>
                    {telegramChatId ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
                  </span>
                </p>
                {telegramUsername ? (
                  <p className="mt-1 text-muted-foreground">
                    Telegram username: @{telegramUsername}
                  </p>
                ) : null}
                {telegramChatId ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    chat id: {telegramChatId}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>เชื่อมต่อบัญชี Telegram</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void connectTelegram()}
                  disabled={linkingTelegram}
                  className="gap-2"
                >
                  <MaterialIcon name="send" size={16} />
                  {linkingTelegram ? "กำลังสร้างลิงก์…" : "เชื่อมต่อ Telegram (Popup)"}
                </Button>
              </div>

              {canAccessAdmin ? (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>สถานะ Telegram Webhook</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={telegramWebhookBusy}
                        onClick={() => void loadTelegramWebhookStatus()}
                      >
                        ตรวจสอบสถานะ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={telegramWebhookBusy}
                        onClick={() => void setupTelegramWebhook()}
                      >
                        ตั้งค่า/รีเซ็ต Webhook
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ต้องตั้งค่า webhook อย่างน้อย 1 ครั้งเพื่อให้คำสั่ง `/start` ถูกส่งเข้าเว็บ
                  </p>
                  {telegramWebhookInfo ? (
                    <div className="text-xs text-muted-foreground">
                      <p>url: {telegramWebhookInfo.url || "—"}</p>
                      <p>pending updates: {telegramWebhookInfo.pending_update_count ?? 0}</p>
                      {telegramWebhookInfo.last_error_message ? (
                        <p className="text-destructive">
                          last error: {telegramWebhookInfo.last_error_message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="telegram-enabled">เปิดแจ้งเตือนรายวัน</Label>
                <Select
                  value={telegramEnabledDraft ? "on" : "off"}
                  onValueChange={(v) => setTelegramEnabledDraft(v === "on")}
                >
                  <SelectTrigger id="telegram-enabled" className="w-full sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">เปิด</SelectItem>
                    <SelectItem value="off">ปิด</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telegram-time">เวลาแจ้งเตือนรายวัน</Label>
                  <Input
                    id="telegram-time"
                    type="time"
                    value={telegramTimeDraft}
                    onChange={(e) => setTelegramTimeDraft(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-timezone">Timezone</Label>
                  <Select
                    value={telegramTimezoneDraft}
                    onValueChange={(v) =>
                      setTelegramTimezoneDraft(v || "Asia/Bangkok")
                    }
                  >
                    <SelectTrigger id="telegram-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                      <SelectItem value="Asia/Jakarta">Asia/Jakarta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => void saveTelegramSettings()}
                disabled={savingTelegram}
              >
                {savingTelegram ? "กำลังบันทึก…" : "บันทึก Telegram Notifications"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project" className="space-y-4">
          {!canAccessAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">โปรเจกต์และแบรนด์</CardTitle>
                <CardDescription>
                  เฉพาะผู้ดูแลระบบสามารถแก้ชื่อองค์กรและข้อความที่ใช้ในรายงาน
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                ชื่อโปรเจกต์ปัจจุบันในระบบ:{" "}
                <span className="font-medium text-foreground">
                  {organizationName}
                </span>
                {organizationTagline ? (
                  <>
                    {" "}
                    · <span>{organizationTagline}</span>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">โปรเจกต์และแบรนด์</CardTitle>
                <CardDescription>
                  ใช้เป็นชื่อในแถบด้านข้าง Export Report และข้อความท้ายรายงาน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">ชื่อองค์กร / แบรนด์</Label>
                  <Input
                    id="org-name"
                    value={orgNameDraft}
                    onChange={(e) => setOrgNameDraft(e.target.value)}
                    placeholder="DINKR"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">คำบรรยายสั้น (ใต้ชื่อแอปในเมนู)</Label>
                  <Input
                    id="tagline"
                    value={taglineDraft}
                    onChange={(e) => setTaglineDraft(e.target.value)}
                    placeholder="เช่น ทีมคอนเทนต์ 2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-note">
                    ข้อความเพิ่มท้ายรายงาน (ถ้ามี)
                  </Label>
                  <Textarea
                    id="report-note"
                    value={reportNoteDraft}
                    onChange={(e) => setReportNoteDraft(e.target.value)}
                    placeholder="บรรทัดเล็กๆ ใต้ส่วนท้ายรายงาน เช่น ภายในวงเล็บลับ"
                    rows={3}
                    className="resize-y min-h-[72px]"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void saveOrganization()}
                  disabled={savingOrg}
                >
                  บันทึกการตั้งค่าโปรเจกต์
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">การเข้าถึงและความปลอดภัย</CardTitle>
              <CardDescription>
                สิทธิ์ของคุณและการจัดการว่าใครล็อกอินได้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border px-4 py-3">
                <p className="font-medium">{rh.title}</p>
                <p className="mt-1 text-muted-foreground">{rh.body}</p>
              </div>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>
                  รายการอีเมลที่อนุญาต (allowlist) ควบคุมว่าใครล็อกอินได้เมื่อมีการตั้งค่าในระบบ
                </li>
                <li>
                  ผู้ที่อยู่ในรายการแอดมินหลังบ้าน (ตาราง admin_emails) เปิดเมนู «หลังบ้าน»
                  จัดการ allowlist · แอดมินพอร์ทัล · และสิทธิ์ viewer/editor ได้
                </li>
              </ul>
              {canAccessAdmin ? (
                <Link
                  href="/admin"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "inline-flex gap-2"
                  )}
                >
                  <MaterialIcon name="admin_panel_settings" size={18} />
                  เปิดหลังบ้าน
                </Link>
              ) : (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-muted-foreground">
                  ต้องการเพิ่มเมลหรือเปลี่ยนสิทธิ์ — ติดต่อผู้ดูแลที่อยู่ในรายการแอดมินหลังบ้าน
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Type of Content</CardTitle>
              <CardDescription>
                เพิ่ม/แก้ไขประเภทคอนเทนต์ระดับ workspace และจัดลำดับการแสดงผลในหน้า Brief
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_180px_120px_auto]">
                <Input
                  placeholder="Label เช่น Educational"
                  value={ctLabelDraft}
                  onChange={(e) => setCtLabelDraft(e.target.value)}
                />
                <Input
                  placeholder="slug เช่น educational"
                  value={ctSlugDraft}
                  onChange={(e) => setCtSlugDraft(e.target.value)}
                />
                <Input
                  type="color"
                  value={ctColorDraft}
                  onChange={(e) => setCtColorDraft(e.target.value)}
                />
                <Button
                  type="button"
                  disabled={contentTypeBusy === "create"}
                  onClick={() => void upsertContentType()}
                >
                  เพิ่ม
                </Button>
              </div>
              <ul className="divide-y rounded-lg border text-sm">
                {contentTypeLoading ? (
                  <li className="px-3 py-2 text-muted-foreground">กำลังโหลด…</li>
                ) : activeContentTypes.length ? (
                  activeContentTypes.map((row, idx) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: row.color ?? "#5B6CFF" }}
                          />
                          {row.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.slug}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={contentTypeBusy === row.id || idx === 0}
                          onClick={() => void moveContentType(row.id, "up")}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            contentTypeBusy === row.id ||
                            idx === activeContentTypes.length - 1
                          }
                          onClick={() => void moveContentType(row.id, "down")}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={contentTypeBusy === row.id}
                          onClick={() => void archiveContentType(row.id)}
                        >
                          archive
                        </Button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-muted-foreground">ยังไม่มี content type</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="task-lists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Lists</CardTitle>
              <CardDescription>จัดการคอลัมน์บน Trello board</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                <Input
                  placeholder="Label เช่น Doing"
                  value={taskListLabelDraft}
                  onChange={(e) => setTaskListLabelDraft(e.target.value)}
                />
                <Input
                  placeholder="slug เช่น in_progress"
                  value={taskListSlugDraft}
                  onChange={(e) => setTaskListSlugDraft(e.target.value)}
                />
                <Button type="button" onClick={() => void upsertTaskList()}>
                  เพิ่ม
                </Button>
              </div>
              <ul className="divide-y rounded-lg border text-sm">
                {activeTaskLists.map((row, idx) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={taskListBusy === row.id || idx === 0}
                        onClick={() => void moveTaskList(row.id, "up")}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          taskListBusy === row.id || idx === activeTaskLists.length - 1
                        }
                        onClick={() => void moveTaskList(row.id, "down")}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => void archiveTaskList(row.id)}
                      >
                        archive
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment-roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Roles</CardTitle>
              <CardDescription>บทบาทสำหรับ assign หลายคนในงานเดียว</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                <Input
                  placeholder="Label เช่น ตัดต่อ"
                  value={assignmentRoleLabelDraft}
                  onChange={(e) => setAssignmentRoleLabelDraft(e.target.value)}
                />
                <Input
                  placeholder="slug เช่น editor"
                  value={assignmentRoleSlugDraft}
                  onChange={(e) => setAssignmentRoleSlugDraft(e.target.value)}
                />
                <Button type="button" onClick={() => void upsertAssignmentRole()}>
                  เพิ่ม
                </Button>
              </div>
              <ul className="divide-y rounded-lg border text-sm">
                {activeAssignmentRoles.map((row, idx) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={assignmentRoleBusy === row.id || idx === 0}
                        onClick={() => void moveAssignmentRole(row.id, "up")}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          assignmentRoleBusy === row.id ||
                          idx === activeAssignmentRoles.length - 1
                        }
                        onClick={() => void moveAssignmentRole(row.id, "down")}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => void archiveAssignmentRole(row.id)}
                      >
                        archive
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="task-types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Types</CardTitle>
              <CardDescription>ประเภทงานสำหรับแยกสี/ฟิลเตอร์บน board</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_180px_120px_auto]">
                <Input
                  placeholder="Label เช่น Marketing"
                  value={taskTypeLabelDraft}
                  onChange={(e) => setTaskTypeLabelDraft(e.target.value)}
                />
                <Input
                  placeholder="slug เช่น marketing"
                  value={taskTypeSlugDraft}
                  onChange={(e) => setTaskTypeSlugDraft(e.target.value)}
                />
                <Input
                  type="color"
                  value={taskTypeColorDraft}
                  onChange={(e) => setTaskTypeColorDraft(e.target.value)}
                />
                <Button type="button" onClick={() => void upsertTaskType()}>
                  เพิ่ม
                </Button>
              </div>
              <ul className="divide-y rounded-lg border text-sm">
                {activeTaskTypes.map((row, idx) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: row.color ?? "#0EA5E9" }}
                        />
                        {row.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={taskTypeBusyId === row.id || idx === 0}
                        onClick={() => void moveTaskType(row.id, "up")}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          taskTypeBusyId === row.id || idx === activeTaskTypes.length - 1
                        }
                        onClick={() => void moveTaskType(row.id, "down")}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => void archiveTaskType(row.id)}
                      >
                        archive
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ทีม Workspace</CardTitle>
              <CardDescription>
                คอนเทนต์และปฏิทินซิงค์ตาม workspace เดียวกัน — สิทธิ์ viewer / editor /
                admin ควบคุมที่ระดับสมาชิกทีมนี้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!session?.user ? (
                <p className="text-sm text-muted-foreground">
                  ล็อกอินเพื่อดูสมาชิกและเชิญทีม
                </p>
              ) : workspaceLoading ? (
                <p className="text-sm text-muted-foreground">กำลังโหลดทีม…</p>
              ) : !workspaceId ? (
                <p className="text-sm text-muted-foreground">
                  ยังไม่พบ workspace — ตรวจสอบว่าได้รัน migration 008 (workspaces)
                  ใน Supabase แล้วหรือไม่
                </p>
              ) : (
                <>
                  {workspaces.length > 1 ? (
                    <div className="space-y-2">
                      <Label>Workspace ที่กำลังใช้งาน</Label>
                      <Select
                        value={workspaceId}
                        onValueChange={(v) => {
                          if (v) setActiveWorkspace(v);
                        }}
                      >
                        <SelectTrigger className="w-full sm:max-w-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaces.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              <span className="truncate">{w.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({w.role})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium">Workspace lifecycle</p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        placeholder="ชื่อ workspace ใหม่"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                      />
                      <Input
                        placeholder="slug (optional)"
                        value={newWorkspaceSlug}
                        onChange={(e) => setNewWorkspaceSlug(e.target.value)}
                      />
                      <Button
                        type="button"
                        disabled={workspaceBusy || !session?.user}
                        onClick={() => void createWorkspace()}
                      >
                        สร้าง Workspace
                      </Button>
                    </div>

                    {isWorkspaceAdmin ? (
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <Input
                          placeholder="ชื่อ workspace ปัจจุบัน"
                          value={workspaceRenameDraft}
                          onChange={(e) => setWorkspaceRenameDraft(e.target.value)}
                        />
                        <Input
                          placeholder="slug"
                          value={workspaceSlugDraft}
                          onChange={(e) => setWorkspaceSlugDraft(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={workspaceBusy}
                          onClick={() => void renameWorkspace()}
                        >
                          บันทึกชื่อ
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {isWorkspaceAdmin ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={workspaceBusy || !workspaceId}
                            onClick={() => void createWorkspaceInviteLink()}
                          >
                            สร้าง Invite Link
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={workspaceBusy || !workspaceId}
                            onClick={() => void archiveWorkspace()}
                          >
                            เก็บเข้าคลัง
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={workspaceBusy || !workspaceId}
                          onClick={() => void leaveWorkspace()}
                        >
                          ออกจากทีม
                        </Button>
                      )}
                    </div>
                    {inviteLink ? (
                      <div className="rounded-md border bg-background px-3 py-2 text-xs">
                        <p className="font-medium">Invite URL</p>
                        <p className="mt-1 break-all text-muted-foreground">{inviteLink}</p>
                      </div>
                    ) : null}
                  </div>
                  {isWorkspaceAdmin ? (
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium">เชิญสมาชิกด้วยอีเมล</p>
                      <p className="text-xs text-muted-foreground">
                        ผู้ถูกเชิญต้องล็อกอินแอปอย่างน้อยหนึ่งครั้งเพื่อให้มีแถวใน
                        profiles — จากนั้นจึงเชิญด้วยอีเมลที่ตรงกับโปรไฟล์
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="invite-email">อีเมล</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <div className="w-full space-y-2 sm:w-40">
                          <Label>บทบาทในทีม</Label>
                          <Select
                            value={inviteRole}
                            onValueChange={(v) =>
                              setInviteRole(v as PlannerRole)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">viewer</SelectItem>
                              <SelectItem value="editor">editor</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          className="sm:mb-0.5"
                          disabled={inviting || !inviteEmail.trim()}
                          onClick={() => void inviteMember()}
                        >
                          {inviting ? "กำลังเชิญ…" : "เชิญ"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      เฉพาะแอดมินของ workspace เท่านั้นที่เชิญสมาชิกได้ — ติดต่อแอดมินทีมของคุณ
                    </p>
                  )}
                  {isWorkspaceAdmin && workspaces.length > 1 ? (
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium">
                        ย้ายคอนเทนต์จาก workspace อื่นเข้า workspace ปัจจุบัน
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ใช้สำหรับรวมข้อมูลที่กระจายอยู่ใน personal workspace หลังเปิดใช้
                        multi-tenant ครั้งแรก
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Workspace ต้นทาง</Label>
                          <Select
                            value={mergeSourceWorkspace}
                            onValueChange={(v) =>
                              setMergeSourceWorkspace(v ?? "")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือก workspace ต้นทาง" />
                            </SelectTrigger>
                            <SelectContent>
                              {workspaces
                                .filter((w) => w.id !== workspaceId)
                                .map((w) => (
                                  <SelectItem key={w.id} value={w.id}>
                                    {w.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={mergingWorkspace || !mergeSourceWorkspace}
                          onClick={() => void mergeWorkspaceIntoCurrent()}
                        >
                          {mergingWorkspace ? "กำลังย้าย…" : "ย้ายคอนเทนต์"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium">Discord Daily Summary</p>
                    <p className="text-xs text-muted-foreground">
                      ส่งสรุปความคืบหน้ารายวันไปหลายห้อง Discord ของ workspace นี้
                    </p>
                    {isWorkspaceAdmin ? (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="discord-channel-name">ชื่อห้อง</Label>
                            <Input
                              id="discord-channel-name"
                              placeholder="เช่น #content-daily"
                              value={discordChannelNameDraft}
                              onChange={(e) =>
                                setDiscordChannelNameDraft(e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="discord-webhook-url">Webhook URL</Label>
                            <Input
                              id="discord-webhook-url"
                              placeholder="https://discord.com/api/webhooks/..."
                              value={discordWebhookDraft}
                              onChange={(e) => setDiscordWebhookDraft(e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={discordSaving}
                          onClick={() => void addDiscordChannel()}
                        >
                          {discordSaving ? "กำลังเพิ่ม…" : "เพิ่มห้อง Discord"}
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        เฉพาะแอดมิน workspace เท่านั้นที่จัดการ Discord channels ได้
                      </p>
                    )}

                    <ul className="divide-y rounded-lg border text-sm">
                      {discordChannels.length ? (
                        discordChannels.map((channel) => (
                          <li
                            key={channel.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{channel.channel_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {channel.webhook_url}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isWorkspaceAdmin ? (
                                <Select
                                  value={channel.is_enabled ? "enabled" : "disabled"}
                                  onValueChange={(v) =>
                                    void toggleDiscordChannel(
                                      channel.id,
                                      v === "enabled"
                                    )
                                  }
                                  disabled={discordBusyId === channel.id}
                                >
                                  <SelectTrigger className="h-8 min-w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="enabled">เปิด</SelectItem>
                                    <SelectItem value="disabled">ปิด</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                                  {channel.is_enabled ? "เปิด" : "ปิด"}
                                </span>
                              )}
                              {isWorkspaceAdmin ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={discordTesting === channel.id}
                                    onClick={() => void sendDiscordTest(channel.id)}
                                  >
                                    {discordTesting === channel.id
                                      ? "กำลังส่ง…"
                                      : "Send test now"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    disabled={discordBusyId === channel.id}
                                    onClick={() => void removeDiscordChannel(channel.id)}
                                  >
                                    ลบ
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-2 text-muted-foreground">
                          ยังไม่มี Discord channel ใน workspace นี้
                        </li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      สมาชิกปัจจุบัน ({workspaceMembers.length})
                    </p>
                    <ul className="divide-y rounded-lg border text-sm">
                      {workspaceMembers.map((m) => (
                        <li
                          key={m.user_id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Avatar
                              fallback={buildUserInitials(
                                m.display_name?.trim() || null,
                                m.email?.trim() || null
                              )}
                              className="h-7 w-7 text-[10px]"
                            />
                            <span className="min-w-0">
                              <span className="truncate">
                                {m.display_name?.trim() ||
                                  m.email?.trim() ||
                                  buildUserInitials(null, null)}
                              </span>
                              {m.email ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {m.email}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            {isWorkspaceAdmin ? (
                              <Select
                                value={m.role}
                                onValueChange={(v) =>
                                  void updateMemberRole(
                                    m.user_id,
                                    v as PlannerRole
                                  )
                                }
                                disabled={
                                  memberActionBusy === `role:${m.user_id}`
                                }
                              >
                                <SelectTrigger className="h-8 min-w-28 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer">viewer</SelectItem>
                                  <SelectItem value="editor">editor</SelectItem>
                                  <SelectItem value="admin">admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">
                                {m.role}
                              </span>
                            )}
                            {isWorkspaceAdmin ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-destructive hover:text-destructive"
                                disabled={
                                  memberActionBusy === `remove:${m.user_id}` ||
                                  m.user_id === session?.user?.id
                                }
                                onClick={() => void removeMember(m.user_id)}
                              >
                                <MaterialIcon name="person_remove" size={16} />
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">OpenClaw API Keys</CardTitle>
              <CardDescription>
                ใช้เชื่อม OpenClaw เพื่อส่งข้อมูลเข้าเว็บอัตโนมัติผ่าน Ingest API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canAccessAdmin ? (
                <p className="text-sm text-muted-foreground">
                  เฉพาะผู้ดูแลระบบสามารถจัดการ API keys
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      placeholder="ชื่อ key เช่น OpenClaw production"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button
                      type="button"
                      disabled={apiKeyBusy}
                      onClick={() => void createApiKey()}
                    >
                      สร้าง API key
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={apiKeyBusy}
                      onClick={() => void loadApiKeys()}
                    >
                      รีเฟรช
                    </Button>
                  </div>
                  {newlyIssuedKey ? (
                    <div className="rounded-lg border border-amber-400/60 bg-amber-50/80 p-3 text-xs dark:border-amber-400/40 dark:bg-amber-950/20">
                      <p className="font-semibold">คีย์นี้จะแสดงครั้งเดียว</p>
                      <p className="mt-1 break-all">{newlyIssuedKey}</p>
                    </div>
                  ) : null}

                  <ul className="divide-y rounded-lg border text-sm">
                    {apiKeys.length ? (
                      apiKeys.map((key) => (
                        <li
                          key={key.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{key.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {key.prefix} · last used:{" "}
                              {key.last_used_at
                                ? new Date(key.last_used_at).toLocaleString("th-TH")
                                : "never"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={apiKeyBusy || !!key.revoked_at}
                            onClick={() => void revokeApiKey(key.id)}
                          >
                            {key.revoked_at ? "revoked" : "revoke"}
                          </Button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-muted-foreground">
                        ยังไม่มี API key
                      </li>
                    )}
                  </ul>

                  {workspaceId ? (
                    <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                      <p className="font-medium">ตัวอย่างเรียก Ingest API</p>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "$SITE_URL/api/ingest/briefs" \\
  -H "Authorization: Bearer <YOUR_KEY>" \\
  -H "content-type: application/json" \\
  -d '{"workspaceId":"${workspaceId}","source":"openclaw","brief":{"topic":"New campaign"}}'`}
                      </pre>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ธีม</CardTitle>
              <CardDescription>โหมดสว่าง / มืด (เก็บในเบราว์เซอร์)</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {mounted ? (
                <>
                  <Button
                    type="button"
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                  >
                    สว่าง
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                  >
                    มืด
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                  >
                    ตามระบบ ({resolvedTheme === "dark" ? "มืด" : "สว่าง"})
                  </Button>
                </>
              ) : (
                <span className="text-muted-foreground text-sm">กำลังโหลด…</span>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">เกี่ยวกับแอป</CardTitle>
              <CardDescription>
                Content Planner — วางแผน Brief ปฏิทิน และ Performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                ซิงค์ข้อมูลผ่าน Supabase เมื่อล็อกอินแล้ว ข้อมูลอยู่ในบัญชีของคุณตามนโยบายที่ทีมตั้งไว้
              </p>
              <p className="text-xs">
                เวอร์ชัน UI v1.1 · การตั้งค่าเซิร์ฟเวอร์ (SITE_URL, Supabase)
                อยู่ที่แผงโฮสต์และ Supabase Dashboard
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={telegramPopupOpen} onOpenChange={setTelegramPopupOpen}>
        <DialogContent showCloseButton className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>เชื่อมต่อ Telegram</DialogTitle>
            <DialogDescription>
              คลิกปุ่มเพื่อเปิด Telegram Desktop แบบ popup หรือสแกน QR จากมือถือ แล้วส่ง
              คำสั่ง `/start` ตาม token นี้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Token</p>
              <p className="mt-1 break-all font-mono text-xs">{telegramToken || "—"}</p>
            </div>
            {telegramWebLink ? (
              <div className="flex justify-center rounded-lg border bg-white p-3">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    telegramWebLink
                  )}`}
                  alt="Telegram deep-link QR"
                  className="h-[220px] w-[220px]"
                  width={220}
                  height={220}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={openTelegramPopup} className="gap-2">
                <MaterialIcon name="open_in_new" size={16} />
                เปิด Telegram Desktop (Popup)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!telegramToken) return;
                  void navigator.clipboard.writeText(`/start ${telegramToken}`);
                  toast.success("คัดลอกคำสั่ง /start แล้ว");
                }}
              >
                Copy /start command
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              สถานะปัจจุบัน:{" "}
              <span className={telegramChatId ? "text-emerald-600" : "text-amber-600"}>
                {telegramChatId ? "เชื่อมต่อแล้ว" : "รอยืนยันจาก Telegram..."}
              </span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
