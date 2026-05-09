"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    organizationName,
    organizationTagline,
    loadingProfile,
    refreshProfile,
    refreshOrganizationSettings,
    signOut,
  } = useSupabaseApp();

  const { isWorkspaceAdmin } = usePlannerPermissions();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [nameDraft, setNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setNameDraft(displayName ?? "");
  }, [displayName]);

  useEffect(() => {
    setOrgNameDraft(organizationName);
    setTaglineDraft(organizationTagline);
  }, [organizationName, organizationTagline]);

  useEffect(() => {
    setMergeSourceWorkspace("");
  }, [workspaceId]);

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
          โปรไฟล์ การตั้งค่าโปรเจกต์ สิทธิ์ และรูปลักษณ์ของแอป
        </p>
      </div>

      <Tabs defaultValue="profile" className="gap-6">
        <TabsList variant="line" className="w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="profile">โปรไฟล์</TabsTrigger>
          <TabsTrigger value="project">โปรเจกต์</TabsTrigger>
          <TabsTrigger value="access">การเข้าถึง</TabsTrigger>
          <TabsTrigger value="workspace">ทีม Workspace</TabsTrigger>
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
                              {w.name} ({w.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
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
                          <span>
                            {m.display_name?.trim() ||
                              m.email?.trim() ||
                              m.user_id.slice(0, 8) + "…"}
                            {m.email ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {m.email}
                              </span>
                            ) : null}
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
                                <SelectTrigger className="h-8 w-28">
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
    </div>
  );
}
