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
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminAllowlistPanel() {
  const { supabase } = useSupabaseApp();
  const [allowed, setAllowed] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("allowed_emails")
      .select("email")
      .order("email");
    if (error) toast.error(error.message);
    else setAllowed((data ?? []).map((r) => r.email));
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
          <MaterialIcon name="mark_email_read" size={20} />
          รายชื่ออีเมลที่เข้าใช้ได้ (allowlist)
        </CardTitle>
        <CardDescription>
          เมื่อมีอย่างน้อย<strong>หนึ่งแถว</strong>ในรายการนี้ ระบบจะ<strong>
            อนุญาตเฉพาะอีเมลในรายการ
          </strong>
          (เปรียบเทียบแบบ lowercase) — ถ้า<strong>ตารางว่าง</strong>ผู้ใช้จะ
          <strong>ล็อกอินไม่ได้</strong> จนกว่าจะเพิ่มเมล
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
              <PageSpinner embedded label="กำลังโหลดรายการ…" />
            ) : allowed.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                ยังไม่มีรายการ — <strong>ไม่มีใครล็อกอินได้</strong>จนกว่าจะเพิ่มอีเมล
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
  );
}
