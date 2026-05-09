"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  type PlannerRole,
  useSupabaseApp,
} from "@/components/supabase/SupabaseAppProvider";
import { cn } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";

type ProfileRow = {
  id: string;
  email: string | null;
  role: PlannerRole;
  updated_at: string;
};

type BriefRole = "viewer" | "editor";

function briefRoleFromDb(role: PlannerRole): BriefRole {
  return role === "viewer" ? "viewer" : "editor";
}

export function AdminProfilesRolesPanel() {
  const { supabase } = useSupabaseApp();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, updated_at")
      .order("email", { ascending: true });
    if (error) toast.error(error.message);
    else setProfiles((data ?? []) as ProfileRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRole = async (userId: string, role: BriefRole) => {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MaterialIcon name="group" size={20} />
          สิทธิ์ผู้ใช้ (profiles)
        </CardTitle>
        <CardDescription>
          viewer = ดูอย่างเดียว · editor = แก้ไขได้ — การเข้าเมนูหลังบ้านควบคุมจากตาราง{" "}
          <span className="font-mono text-xs">admin_emails</span> ไม่ใช่ค่าในตารางนี้
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
                  <td colSpan={3} className="p-2">
                    <PageSpinner embedded label="กำลังโหลดโปรไฟล์…" />
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
                        value={briefRoleFromDb(row.role)}
                        onValueChange={(v) =>
                          void saveRole(row.id, v as BriefRole)
                        }
                      >
                        <SelectTrigger className={cn("h-9 w-[140px]")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">viewer</SelectItem>
                          <SelectItem value="editor">editor</SelectItem>
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
  );
}
