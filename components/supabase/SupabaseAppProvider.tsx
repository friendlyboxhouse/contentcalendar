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
import type { ContentItem } from "@/lib/types";
import { reviveContentItems } from "@/lib/revive";
import { useContentStore } from "@/store/contentStore";
import {
  clearSyncHandlers,
  runAsRemoteApply,
  setSyncHandlers,
} from "@/lib/syncBridge";
import type { SupabasePublicEnv } from "@/lib/supabase/config";

export type PlannerRole = "viewer" | "editor" | "admin";

type Ctx = {
  configured: boolean;
  supabase: SupabaseClient | null;
  /** false จนกว่าจะ getSession ครั้งแรกเสร็จ — ใช้หลีกเลี่ยงพาไปหน้าแอปก่อนรู้ว่าล็อกอินหรือยัง */
  authHydrated: boolean;
  session: Session | null;
  role: PlannerRole;
  /** เข้าเมนูหลังบ้านได้จากตาราง admin_emails (ไม่ใช้ profiles.role) */
  canAccessAdmin: boolean;
  /** ชื่อที่ใช้ในแอป (จาก profiles.display_name) */
  displayName: string | null;
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
  canAccessAdmin: false,
  displayName: null,
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
  const [organizationName, setOrganizationName] = useState("DINKR");
  const [organizationTagline, setOrganizationTagline] = useState("");
  const [reportFooterNote, setReportFooterNote] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

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
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) {
      console.warn(error.message);
      setRole("editor");
      setDisplayName(null);
      setCanAccessAdmin(false);
    } else {
      const r = data?.role as PlannerRole | undefined;
      setRole(r === "viewer" || r === "admin" ? r : "editor");
      const dn = data?.display_name;
      setDisplayName(
        typeof dn === "string" && dn.trim() ? dn.trim() : null
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

  const signOut = useCallback(async () => {
    if (!supabase) return;
    clearSyncHandlers();
    await supabase.auth.signOut();
    runAsRemoteApply(() => {
      useContentStore.getState().replaceAllItems([]);
    });
  }, [supabase]);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = null;

    if (!supabase || !configured || !session?.user) {
      clearSyncHandlers();
      return;
    }

    const userId = session.user.id;
    let cancelled = false;

    const upsertItem = async (item: ContentItem) => {
      const payload = JSON.parse(JSON.stringify(item)) as Record<string, unknown>;
      const { error } = await supabase.from("content_items").upsert(
        {
          post_id: item.id,
          user_id: userId,
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "post_id" }
      );
      if (error) toast.error(`บันทึกคลาวด์ล้มเหลว: ${error.message}`);
    };

    const deleteItemRow = async (id: string) => {
      const { error } = await supabase
        .from("content_items")
        .delete()
        .eq("post_id", id)
        .eq("user_id", userId);
      if (error) toast.error(`ลบคลาวด์ล้มเหลว: ${error.message}`);
    };

    const bulkUpsert = async (items: ContentItem[]) => {
      await Promise.all(items.map((i) => upsertItem(i)));
    };

    setSyncHandlers({
      upsertItem,
      deleteItem: deleteItemRow,
      bulkUpsert,
    });

    void (async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("payload");

      if (cancelled) return;

      if (error) {
        toast.error(`โหลดข้อมูลคลาวด์ล้มเหลว: ${error.message}`);
        return;
      }

      const revived = reviveContentItems(
        (data ?? []).map((row) => row.payload as ContentItem)
      );
      runAsRemoteApply(() => {
        useContentStore.getState().replaceAllItems(revived);
      });

      if (cancelled) return;

      const channel = supabase
        .channel(`content_items:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "content_items",
            filter: `user_id=eq.${userId}`,
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

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      clearSyncHandlers();
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch && supabase) void supabase.removeChannel(ch);
    };
  }, [configured, session?.user, supabase]);

  const value = useMemo<Ctx>(
    () => ({
      configured,
      supabase,
      authHydrated,
      session,
      role,
      canAccessAdmin,
      displayName,
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
      canAccessAdmin,
      displayName,
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
