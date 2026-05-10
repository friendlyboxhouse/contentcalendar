"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { RealtimeChannel, Session, SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { ContentItem, TaskItem } from "@/lib/types";
import { reviveContentItems, reviveTaskItems } from "@/lib/revive";
import { useContentStore } from "@/store/contentStore";
import { useTaskStore } from "@/store/taskStore";
import {
  clearSyncHandlers,
  runAsRemoteApply,
  setSyncHandlers,
} from "@/lib/syncBridge";
import type { SupabasePublicEnv } from "@/lib/supabase/config";
import { toastSupabasePersistError } from "@/lib/supabase/persistErrors";
import { DEMO_KEY } from "@/components/shared/SideNav";
import { clearPlannerClientStorage } from "@/lib/clientStorage";
import { deterministicAvatarColor } from "@/lib/initials";

export type PlannerRole = "viewer" | "editor" | "admin";
const ACTIVE_WORKSPACE_KEY = "cp:active-workspace";

export type WorkspaceMemberRow = {
  user_id: string;
  role: PlannerRole;
  email: string | null;
  display_name: string | null;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string | null;
  role: PlannerRole;
};

type Ctx = {
  configured: boolean;
  supabase: SupabaseClient | null;
  /** false จนกว่าจะ getSession ครั้งแรกเสร็จ — ใช้หลีกเลี่ยงพาไปหน้าแอปก่อนรู้ว่าล็อกอินหรือยัง */
  authHydrated: boolean;
  session: Session | null;
  /** บทบาทจากตาราง profiles (fallback เมื่อยังไม่มี workspace context) */
  role: PlannerRole;
  /** Workspace ที่ใช้ซิงค์คอนเทนต์ — null เมื่อยังไม่โหลดหรือไม่ได้ตั้งค่า Supabase */
  workspaceId: string | null;
  /** บทบาทในทีม workspace ปัจจุบัน */
  workspaceRole: PlannerRole | null;
  workspaces: WorkspaceSummary[];
  workspaceMembers: WorkspaceMemberRow[];
  workspaceLoading: boolean;
  /** true หลังโหลด content_items รอบแรกของ workspace ปัจจุบันเสร็จ (หรือไม่มี cloud sync) */
  contentSyncedOnce: boolean;
  setActiveWorkspace: (workspaceId: string) => void;
  refreshWorkspace: () => Promise<void>;
  /** เข้าเมนูหลังบ้านได้จากตาราง admin_emails (ไม่ใช้ profiles.role) */
  canAccessAdmin: boolean;
  /** ชื่อที่ใช้ในแอป (จาก profiles.display_name) */
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string;
  telegramChatId: string | null;
  telegramUsername: string | null;
  telegramNotificationsEnabled: boolean;
  telegramDailyTime: string;
  telegramTimezone: string;
  organizationName: string;
  organizationTagline: string;
  reportFooterNote: string;
  loadingProfile: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshOrganizationSettings: () => Promise<void>;
};

const SupabaseAppContext = createContext<Ctx>({
  configured: false,
  supabase: null,
  authHydrated: false,
  session: null,
  role: "editor",
  workspaceId: null,
  workspaceRole: null,
  workspaces: [],
  workspaceMembers: [],
  workspaceLoading: false,
  contentSyncedOnce: true,
  setActiveWorkspace: () => {},
  refreshWorkspace: async () => {},
  canAccessAdmin: false,
  displayName: null,
  avatarUrl: null,
  avatarColor: deterministicAvatarColor(null),
  telegramChatId: null,
  telegramUsername: null,
  telegramNotificationsEnabled: false,
  telegramDailyTime: "08:00",
  telegramTimezone: "Asia/Bangkok",
  organizationName: "DINKR",
  organizationTagline: "",
  reportFooterNote: "",
  loadingProfile: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshOrganizationSettings: async () => {},
});

export function useSupabaseApp() {
  return useContext(SupabaseAppContext);
}

export function SupabaseAppProvider({
  children,
  supabasePublic,
}: {
  children: React.ReactNode;
  supabasePublic: SupabasePublicEnv;
}) {
  const url = supabasePublic.url?.trim() ?? "";
  const anon = supabasePublic.anon?.trim() ?? "";
  const configured = Boolean(url && anon);

  const supabase = useMemo(() => {
    if (!configured) return null;
    return createBrowserClient(url, anon);
  }, [configured, url, anon]);

  const [session, setSession] = useState<Session | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [role, setRole] = useState<PlannerRole>("editor");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>(
    deterministicAvatarColor(null)
  );
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(false);
  const [telegramDailyTime, setTelegramDailyTime] = useState("08:00");
  const [telegramTimezone, setTelegramTimezone] = useState("Asia/Bangkok");
  const [organizationName, setOrganizationName] = useState("DINKR");
  const [organizationTagline, setOrganizationTagline] = useState("");
  const [reportFooterNote, setReportFooterNote] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<PlannerRole | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberRow[]>(
    []
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [contentSyncedOnce, setContentSyncedOnce] = useState(!configured);

  useEffect(() => {
    if (!supabase) {
      setAuthHydrated(true);
      return;
    }

    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSession(data.session ?? null);
      })
      .finally(() => {
        if (!cancelled) setAuthHydrated(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    if (!session?.user) {
      setRole("editor");
      setCanAccessAdmin(false);
      setDisplayName(null);
      setAvatarUrl(null);
      setAvatarColor(deterministicAvatarColor(null));
      setTelegramChatId(null);
      setTelegramUsername(null);
      setTelegramNotificationsEnabled(false);
      setTelegramDailyTime("08:00");
      setTelegramTimezone("Asia/Bangkok");
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "role, display_name, avatar_url, avatar_color, telegram_chat_id, telegram_username, telegram_notifications_enabled, telegram_daily_time, telegram_timezone"
      )
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) {
      console.warn(error.message);
      setRole("editor");
      setDisplayName(null);
      setAvatarUrl(null);
      setAvatarColor(deterministicAvatarColor(session.user.id));
      setTelegramChatId(null);
      setTelegramUsername(null);
      setTelegramNotificationsEnabled(false);
      setTelegramDailyTime("08:00");
      setTelegramTimezone("Asia/Bangkok");
      setCanAccessAdmin(false);
    } else {
      const r = data?.role as PlannerRole | undefined;
      setRole(r === "viewer" || r === "admin" ? r : "editor");
      const dn = data?.display_name;
      setDisplayName(
        typeof dn === "string" && dn.trim() ? dn.trim() : null
      );
      const avatarUrlRaw = data?.avatar_url;
      setAvatarUrl(
        typeof avatarUrlRaw === "string" && avatarUrlRaw.trim()
          ? avatarUrlRaw.trim()
          : null
      );
      const avatarColorRaw = data?.avatar_color;
      setAvatarColor(
        typeof avatarColorRaw === "string" && avatarColorRaw.trim()
          ? avatarColorRaw.trim()
          : deterministicAvatarColor(session.user.id)
      );
      const chatIdRaw = data?.telegram_chat_id;
      setTelegramChatId(
        typeof chatIdRaw === "string" && chatIdRaw.trim() ? chatIdRaw.trim() : null
      );
      const usernameRaw = data?.telegram_username;
      setTelegramUsername(
        typeof usernameRaw === "string" && usernameRaw.trim()
          ? usernameRaw.trim()
          : null
      );
      setTelegramNotificationsEnabled(Boolean(data?.telegram_notifications_enabled));
      const dailyTimeRaw = data?.telegram_daily_time;
      setTelegramDailyTime(
        typeof dailyTimeRaw === "string" && /^\d{2}:\d{2}$/.test(dailyTimeRaw)
          ? dailyTimeRaw
          : "08:00"
      );
      const timezoneRaw = data?.telegram_timezone;
      setTelegramTimezone(
        typeof timezoneRaw === "string" && timezoneRaw.trim()
          ? timezoneRaw.trim()
          : "Asia/Bangkok"
      );
      const { data: portalAdmin, error: adminErr } = await supabase.rpc(
        "is_admin_email"
      );
      if (adminErr) {
        console.warn("is_admin_email:", adminErr.message);
        setCanAccessAdmin(false);
      } else {
        setCanAccessAdmin(!!portalAdmin);
      }
    }
    setLoadingProfile(false);
  }, [supabase, session?.user]);

  const refreshWorkspace = useCallback(async () => {
    if (!supabase || !session?.user) {
      setWorkspaceId(null);
      setWorkspaceRole(null);
      setWorkspaces([]);
      setWorkspaceMembers([]);
      setWorkspaceLoading(false);
      setContentSyncedOnce(true);
      return;
    }
    setWorkspaceLoading(true);
    const preferredId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_WORKSPACE_KEY)
        : null;

    const { data: bootstrap, error: bootstrapError } = await supabase.rpc(
      "workspace_user_bootstrap",
      { p_workspace: preferredId || null }
    );

    if (!bootstrapError && bootstrap) {
      const payload = bootstrap as {
        selected_workspace_id?: string | null;
        workspaces?: Array<Record<string, unknown>>;
        members?: Array<Record<string, unknown>>;
      };
      const joined: WorkspaceSummary[] = (payload.workspaces ?? [])
        .map((row) => ({
          id: String(row.id || ""),
          role:
            row.role === "viewer" || row.role === "editor" || row.role === "admin"
              ? (row.role as PlannerRole)
              : "editor",
          name: String(row.name || "Workspace"),
          slug: row.slug ? String(row.slug) : null,
        }))
        .filter((row) => row.id);
      setWorkspaces(joined);

      const selected =
        joined.find((w) => w.id === payload.selected_workspace_id) ??
        joined.find((w) => w.id === preferredId) ??
        joined[0] ??
        null;
      const wsId = selected?.id ?? null;
      setWorkspaceId(wsId);
      setWorkspaceRole(selected?.role ?? null);
      if (wsId && typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, wsId);
      }

      const mappedMembers: WorkspaceMemberRow[] = (payload.members ?? [])
        .map((row) => {
          const role = row.role as PlannerRole;
          return {
            user_id: String(row.user_id || ""),
            role:
              role === "viewer" || role === "editor" || role === "admin"
                ? role
                : "editor",
            email: row.email ? String(row.email) : null,
            display_name: row.display_name ? String(row.display_name) : null,
          };
        })
        .filter((row) => row.user_id);

      setWorkspaceMembers(mappedMembers);
      setWorkspaceLoading(false);
      setContentSyncedOnce(true);
      return;
    }

    const uid = session.user.id;

    const { data: membershipRows, error: mineErr } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", uid)
      .order("joined_at", { ascending: true });

    if (mineErr || !membershipRows?.length) {
      if (mineErr) console.warn("workspace_members:", mineErr.message);
      setWorkspaceId(null);
      setWorkspaceRole(null);
      setWorkspaces([]);
      setWorkspaceMembers([]);
      setWorkspaceLoading(false);
      setContentSyncedOnce(true);
      return;
    }

    const memberships = membershipRows
      .map((r) => ({
        workspace_id: r.workspace_id as string,
        role: r.role as PlannerRole,
      }))
      .filter((r) => r.workspace_id);

    const ids = memberships.map((m) => m.workspace_id);
    const { data: wsRows, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, name, slug, archived_at")
      .in("id", ids)
      .is("archived_at", null);
    if (wsErr) {
      toast.error(`โหลดรายการ workspace ล้มเหลว: ${wsErr.message}`);
      setWorkspaceId(null);
      setWorkspaceRole(null);
      setWorkspaces([]);
      setWorkspaceMembers([]);
      setWorkspaceLoading(false);
      setContentSyncedOnce(true);
      return;
    }

    const wsMap = new Map(
      (wsRows ?? []).map((w) => [
        w.id as string,
        {
          name: (w.name as string) ?? "Workspace",
          slug: (w.slug as string | null) ?? null,
        },
      ])
    );

    const joined: WorkspaceSummary[] = memberships
      .map((m) => {
        const w = wsMap.get(m.workspace_id);
        if (!w) return null;
        return {
          id: m.workspace_id,
          role:
            m.role === "viewer" || m.role === "editor" || m.role === "admin"
              ? m.role
              : "editor",
          name: w.name,
          slug: w.slug,
        };
      })
      .filter((x): x is WorkspaceSummary => Boolean(x));

    setWorkspaces(joined);

    const selected =
      joined.find((w) => w.id === preferredId) ??
      joined[0] ??
      null;
    const wsId = selected?.id ?? null;
    const wr = selected?.role ?? null;
    if (wsId && typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, wsId);
    }
    setWorkspaceId(wsId);
    setWorkspaceRole(wr);

    if (!wsId) {
      setWorkspaceMembers([]);
      setWorkspaceLoading(false);
      setContentSyncedOnce(true);
      return;
    }

    const { data: memRows, error: memErr } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", wsId);

    if (memErr || !memRows?.length) {
      if (memErr) toast.error(`โหลดสมาชิกทีมล้มเหลว: ${memErr.message}`);
      setWorkspaceMembers([]);
      setWorkspaceLoading(false);
      setContentSyncedOnce(true);
      return;
    }

    const memberIds = memRows.map((r) => r.user_id as string);
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", memberIds);

    if (pErr) {
      toast.error(`โหลดโปรไฟล์ทีมล้มเหลว: ${pErr.message}`);
      setWorkspaceMembers([]);
      setWorkspaceLoading(false);
      setContentSyncedOnce(true);
      return;
    }

    const pmap = new Map(
      (profs ?? []).map((p) => [
        p.id as string,
        {
          email: (p.email as string | null) ?? null,
          display_name: (p.display_name as string | null) ?? null,
        },
      ])
    );

    const mapped: WorkspaceMemberRow[] = memRows.map((r) => {
      const id = r.user_id as string;
      const pr = pmap.get(id);
      const mr = r.role as PlannerRole;
      return {
        user_id: id,
        role:
          mr === "viewer" || mr === "editor" || mr === "admin"
            ? mr
            : "editor",
        email: pr?.email ?? null,
        display_name: pr?.display_name ?? null,
      };
    });

    setWorkspaceMembers(mapped);
    setWorkspaceLoading(false);
  }, [supabase, session?.user]);

  const refreshOrganizationSettings = useCallback(async () => {
    if (!supabase || !session?.user) {
      setOrganizationName("DINKR");
      setOrganizationTagline("");
      setReportFooterNote("");
      return;
    }
    const { data, error } = await supabase
      .from("app_settings")
      .select("organization_name, organization_tagline, report_footer_note")
      .eq("id", "global")
      .maybeSingle();
    if (error) {
      console.warn("app_settings:", error.message);
      setOrganizationName("DINKR");
      setOrganizationTagline("");
      setReportFooterNote("");
      return;
    }
    const row = data as {
      organization_name?: string;
      organization_tagline?: string;
      report_footer_note?: string;
    } | null;
    setOrganizationName(row?.organization_name?.trim() || "DINKR");
    setOrganizationTagline(row?.organization_tagline?.trim() ?? "");
    setReportFooterNote(row?.report_footer_note?.trim() ?? "");
  }, [supabase, session?.user]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    void refreshOrganizationSettings();
  }, [refreshOrganizationSettings]);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  const setActiveWorkspace = useCallback((nextWorkspaceId: string) => {
    if (!nextWorkspaceId) return;
    const match = workspaces.find((w) => w.id === nextWorkspaceId);
    if (!match) return;
    setWorkspaceId(match.id);
    setWorkspaceRole(match.role);
    setWorkspaceMembers([]);
    setWorkspaceLoading(true);
    setContentSyncedOnce(false);
    runAsRemoteApply(() => {
      useContentStore.getState().replaceAllItems([]);
      useTaskStore.getState().replaceAllItems([]);
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, match.id);
    }
    void refreshWorkspace();
  }, [workspaces, refreshWorkspace]);

  useEffect(() => {
    if (!authHydrated || session) return;
    clearSyncHandlers();
    runAsRemoteApply(() => {
      useContentStore.getState().replaceAllItems([]);
      useTaskStore.getState().replaceAllItems([]);
    });
    setWorkspaceId(null);
    setWorkspaceRole(null);
    setWorkspaces([]);
    setWorkspaceMembers([]);
    setWorkspaceLoading(false);
    setContentSyncedOnce(true);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
    clearPlannerClientStorage(DEMO_KEY);
  }, [authHydrated, session]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    clearSyncHandlers();
    await supabase.auth.signOut();
    runAsRemoteApply(() => {
      useContentStore.getState().replaceAllItems([]);
      useTaskStore.getState().replaceAllItems([]);
    });
    clearPlannerClientStorage(DEMO_KEY);
  }, [supabase]);

  const contentChannelRef = useRef<RealtimeChannel | null>(null);
  const taskChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    contentChannelRef.current = null;
    taskChannelRef.current = null;

    if (!supabase || !configured || !session?.user || !workspaceId) {
      clearSyncHandlers();
      setContentSyncedOnce(true);
      return;
    }

    const userId = session.user.id;
    const wsId = workspaceId;
    let cancelled = false;
    setContentSyncedOnce(false);

    const upsertItem = async (item: ContentItem) => {
      const payload = JSON.parse(JSON.stringify(item)) as Record<string, unknown>;
      const { error } = await supabase.from("content_items").upsert(
        {
          post_id: item.id,
          user_id: userId,
          workspace_id: wsId,
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "post_id" }
      );
      if (error) toastSupabasePersistError(error);
    };

    const deleteItemRow = async (id: string) => {
      const { error } = await supabase
        .from("content_items")
        .delete()
        .eq("post_id", id)
        .eq("workspace_id", wsId);
      if (error) toastSupabasePersistError(error);
    };

    const bulkUpsert = async (items: ContentItem[]) => {
      if (!items.length) return;
      const rows = items.map((item) => ({
        post_id: item.id,
        user_id: userId,
        workspace_id: wsId,
        payload: JSON.parse(JSON.stringify(item)) as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("content_items")
        .upsert(rows, { onConflict: "post_id" });
      if (error) toastSupabasePersistError(error);
    };

    const upsertTask = async (task: TaskItem) => {
      const payload = JSON.parse(
        JSON.stringify(task.payload ?? {})
      ) as Record<string, unknown>;
      const { error } = await supabase.from("tasks").upsert(
        {
          id: task.id,
          workspace_id: wsId,
          title: task.title,
          description: task.description,
          task_type_id: task.task_type_id,
          list_id: task.list_id,
          due_at: task.due_at ? new Date(task.due_at).toISOString() : null,
          due_time: task.due_time,
          position: task.position ?? 0,
          payload,
          created_by: task.created_by ?? userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) toastSupabasePersistError(error);
    };

    const deleteTaskRow = async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("workspace_id", wsId);
      if (error) toastSupabasePersistError(error);
    };

    const bulkUpsertTasks = async (tasks: TaskItem[]) => {
      if (!tasks.length) return;
      const rows = tasks.map((task) => ({
        id: task.id,
        workspace_id: wsId,
        title: task.title,
        description: task.description,
        task_type_id: task.task_type_id,
        list_id: task.list_id,
        due_at: task.due_at ? new Date(task.due_at).toISOString() : null,
        due_time: task.due_time,
        position: task.position ?? 0,
        payload: JSON.parse(
          JSON.stringify(task.payload ?? {})
        ) as Record<string, unknown>,
        created_by: task.created_by ?? userId,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("tasks")
        .upsert(rows, { onConflict: "id" });
      if (error) toastSupabasePersistError(error);
    };

    setSyncHandlers({
      upsertItem,
      deleteItem: deleteItemRow,
      bulkUpsert,
      upsertTask,
      deleteTask: deleteTaskRow,
      bulkUpsertTasks,
    });

    void (async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("payload")
        .eq("workspace_id", wsId)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (cancelled) return;

      if (error) {
        toastSupabasePersistError(error);
        setContentSyncedOnce(true);
        return;
      }

      const revived = reviveContentItems(
        (data ?? []).map((row) => row.payload as ContentItem)
      );
      runAsRemoteApply(() => {
        useContentStore.getState().replaceAllItems(revived);
      });

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select(
          "id,workspace_id,title,description,task_type_id,list_id,due_at,due_time,position,payload,created_by,created_at,updated_at"
        )
        .eq("workspace_id", wsId)
        .order("updated_at", { ascending: false });
      if (taskError) {
        toastSupabasePersistError(taskError);
        setContentSyncedOnce(true);
        return;
      }
      runAsRemoteApply(() => {
        useTaskStore.getState().replaceAllItems(
          reviveTaskItems((taskData ?? []) as TaskItem[])
        );
      });
      setContentSyncedOnce(true);

      if (cancelled) return;

      const contentChannel = supabase
        .channel(`content_items:${wsId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "content_items",
            filter: `workspace_id=eq.${wsId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const id = (payload.old as { post_id?: string })?.post_id;
              if (id) {
                runAsRemoteApply(() => {
                  useContentStore.getState().removeItemRemote(id);
                });
              }
              return;
            }
            const row = payload.new as { payload?: ContentItem };
            if (row?.payload) {
              const item = reviveContentItems([row.payload as ContentItem])[0];
              runAsRemoteApply(() => {
                useContentStore.getState().applyRemoteUpsert(item);
              });
            }
          }
        )
        .subscribe();

      contentChannelRef.current = contentChannel;

      const taskChannel = supabase
        .channel(`tasks:${wsId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `workspace_id=eq.${wsId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: string })?.id;
              if (id) {
                runAsRemoteApply(() => {
                  useTaskStore.getState().removeItemRemote(id);
                });
              }
              return;
            }
            const row = payload.new as TaskItem;
            if (row?.id) {
              const task = reviveTaskItems([row])[0];
              runAsRemoteApply(() => {
                useTaskStore.getState().applyRemoteUpsert(task);
              });
            }
          }
        )
        .subscribe();

      taskChannelRef.current = taskChannel;
    })();

    return () => {
      cancelled = true;
      clearSyncHandlers();
      const contentCh = contentChannelRef.current;
      const taskCh = taskChannelRef.current;
      contentChannelRef.current = null;
      taskChannelRef.current = null;
      if (contentCh && supabase) void supabase.removeChannel(contentCh);
      if (taskCh && supabase) void supabase.removeChannel(taskCh);
    };
  }, [configured, session?.user, supabase, workspaceId]);

  const value = useMemo<Ctx>(
    () => ({
      configured,
      supabase,
      authHydrated,
      session,
      role,
      workspaceId,
      workspaceRole,
      workspaces,
      workspaceMembers,
      workspaceLoading,
      contentSyncedOnce,
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
      reportFooterNote,
      loadingProfile,
      signOut,
      refreshProfile,
      refreshOrganizationSettings,
    }),
    [
      configured,
      supabase,
      authHydrated,
      session,
      role,
      workspaceId,
      workspaceRole,
      workspaces,
      workspaceMembers,
      workspaceLoading,
      contentSyncedOnce,
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
      reportFooterNote,
      loadingProfile,
      signOut,
      refreshProfile,
      refreshOrganizationSettings,
    ]
  );

  return (
    <SupabaseAppContext.Provider value={value}>
      {children}
    </SupabaseAppContext.Provider>
  );
}
