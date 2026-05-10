"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

export default function JoinWorkspacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { supabase, refreshWorkspace, setActiveWorkspace } = useSupabaseApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("พร้อมเข้าร่วม Workspace");

  const token = searchParams.get("token")?.trim() || "";

  useEffect(() => {
    if (!token) {
      setMessage("ไม่พบ token สำหรับเข้าร่วม workspace");
    }
  }, [token]);

  const accept = async () => {
    if (!supabase || !token) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_workspace_invite", {
      p_token: token,
    });
    setBusy(false);
    if (error || !data) {
      setMessage(error?.message || "ลิงก์เชิญไม่ถูกต้องหรือหมดอายุ");
      return;
    }
    await refreshWorkspace();
    setActiveWorkspace(String(data));
    setMessage("เข้าร่วมสำเร็จ กำลังพาไปหน้า Settings...");
    router.push("/settings");
  };

  return (
    <div className="mx-auto max-w-xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Join workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button type="button" disabled={busy || !token} onClick={() => void accept()}>
            {busy ? "กำลังเข้าร่วม..." : "เข้าร่วมทีม"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
