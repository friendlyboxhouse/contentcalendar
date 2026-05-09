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
import { MaterialIcon } from "@/components/ui/material-icon";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminEmailsPanel() {
  const { supabase } = useSupabaseApp();
  const [admins, setAdmins] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_emails")
      .select("email")
      .order("email");
    if (error) toast.error(error.message);
    else setAdmins((data ?? []).map((r) => r.email));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const addAdmin = async () => {
    if (!supabase) return;
    const em = newEmail.toLowerCase().trim();
    if (!EMAIL_RE.test(em)) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    const { error } = await supabase.from("admin_emails").insert({ email: em });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`เพิ่มแอดมิน ${em} แล้ว`);
    setNewEmail("");
    void load();
  };

  const removeAdmin = async (email: string) => {
    if (!supabase) return;
    if (!confirm(`ลบ ${email} ออกจากแอดมินหลังบ้าน?`)) return;
    const { error } = await supabase.from("admin_emails").delete().eq("email", email);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ลบแล้ว");
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MaterialIcon name="shield_person" size={20} />
          แอดมินหลังบ้าน (admin_emails)
        </CardTitle>
        <CardDescription>
          เฉพาะอีเมลในรายการนี้ที่เข้าหน้า <code className="rounded bg-muted px-1">/admin</code>{" "}
          ได้ — บันทึกแรกต้องใส่ใน Supabase SQL Editor ด้วย postgres แล้วค่อยจัดการต่อจากหน้านี้
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <Label htmlFor="new-admin-email">เพิ่มอีเมลแอดมิน</Label>
            <Input
              id="new-admin-email"
              type="email"
              placeholder="name@company.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addAdmin();
              }}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" className="gap-1" onClick={() => void addAdmin()}>
              <MaterialIcon name="person_add" size={18} />
              เพิ่ม
            </Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="divide-y">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">กำลังโหลด…</p>
            ) : admins.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                ยังไม่มีแอดมินในตาราง — รัน SQL เพิ่มแถวแรกใน Supabase ก่อน
              </p>
            ) : (
              admins.map((email) => (
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
                    onClick={() => void removeAdmin(email)}
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
  );
}
