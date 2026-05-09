"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  type PlannerRole,
  useSupabaseApp,
} from "@/components/supabase/SupabaseAppProvider";
import { cn } from "@/lib/utils";

type ProfileRow = {
  id: string;
  email: string | null;
  role: PlannerRole;
  updated_at: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccessAdminClient() {
  const { supabase } = useSupabaseApp();
  const [allowed, setAllowed] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [av, pf] = await Promise.all([
      supabase.from("allowed_emails").select("email").order("email"),
      supabase
        .from("profiles")
        .select("id, email, role, updated_at")
        .order("email", { ascending: true }),
    ]);
    if (av.error) toast.error(av.error.message);
    else setAllowed((av.data ?? []).map((r) => r.email));

    if (pf.error) toast.error(pf.error.message);
    else setProfiles((pf.data ?? []) as ProfileRow[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const addAllowed = async () => {
    if (!supabase) return;
    const em = newEmail.toLowerCase().trim();
    if (!EMAIL_RE.test(em)) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    const { error } = await supabase.from("allowed_emails").insert({ email: em });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`เพิ่ม ${em} แล้ว`);
    setNewEmail("");
    void load();
  };

  const removeAllowed = async (email: string) => {
    if (!supabase) return;
    if (!confirm(`ลบ ${email} ออกจากรายการอนุญาต?`)) return;
    const { error } = await supabase.from("allowed_emails").delete().eq("email", email);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ลบแล้ว");
    void load();
  };

  const saveRole = async (userId: string, role: PlannerRole) => {
    if (!supabase) return;
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("อัปเดตบทบาทแล้ว");
    void load();
  };

  if (!supabase) {
    return (
      <p className="text-sm text-muted-foreground">
        เปิดใช้ Supabase และล็อกอินก่อน
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MaterialIcon name="mark_email_read" size={20} />
            รายชื่ออีเมลที่เข้าใช้ได้ (allowlist)
          </CardTitle>
          <CardDescription>
            ถ้า<strong>ไม่มีแถวในตารางนี้</strong> ระบบจะ<strong>ไม่จำกัดเมล</strong>
            (ใครล็อกอินผ่าน Google ได้ตามปกติ) — พอมีอย่างน้อยหนึ่งแถว
            จะ<strong>อนุญาตเฉพาะเมลในรายการนี้</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex min-w-[200px] flex-1 flex-col gap-2">
              <Label htmlFor="new-allow-email">เพิ่มอีเมล</Label>
              <Input
                id="new-allow-email"
                type="email"
                placeholder="name@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addAllowed();
                }}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" className="gap-1" onClick={() => void addAllowed()}>
                <MaterialIcon name="person_add" size={18} />
                เพิ่ม
              </Button>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="divide-y">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">กำลังโหลด…</p>
              ) : allowed.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  ยังไม่มีรายการ — ขณะนี้<strong>ไม่บังคับ allowlist</strong>
                </p>
              ) : (
                allowed.map((email) => (
                  <div
                    key={email}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <span className="font-mono text-sm">{email}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive"
                      onClick={() => void removeAllowed(email)}
                    >
                      <MaterialIcon name="delete" size={16} />
                      ลบ
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MaterialIcon name="group" size={20} />
            ผู้ใช้ที่เคยล็อกอิน (profiles)
          </CardTitle>
          <CardDescription>
            ปรับบทบาทในแอป: viewer = ดูอย่างเดียว, editor = แก้ไขได้, admin =
            จัดการหน้านี้และลิสต์เมล
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">อีเมล</th>
                  <th className="p-3 font-medium">บทบาท</th>
                  <th className="hidden p-3 font-medium sm:table-cell">อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-muted-foreground">
                      กำลังโหลด…
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-muted-foreground">
                      ยังไม่มีข้อมูลผู้ใช้
                    </td>
                  </tr>
                ) : (
                  profiles.map((row) => (
                    <tr key={row.id}>
                      <td className="p-3 font-mono text-xs">
                        {row.email ?? row.id.slice(0, 8) + "…"}
                      </td>
                      <td className="p-3">
                        <Select
                          value={row.role}
                          onValueChange={(v) =>
                            void saveRole(row.id, v as PlannerRole)
                          }
                        >
                          <SelectTrigger className={cn("h-9 w-[140px]")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">viewer</SelectItem>
                            <SelectItem value="editor">editor</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="hidden p-3 text-muted-foreground sm:table-cell">
                        {new Date(row.updated_at).toLocaleString("th-TH")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
