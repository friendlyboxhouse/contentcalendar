"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

/**
 * แสดงเมื่อยังไม่มีแอดมินในระบบ — ให้ผู้ใช้คนแรกกดขึ้นเป็น admin ได้โดยไม่ต้องรัน SQL เอง
 */
export function FirstAdminBanner() {
  const { configured, session, loadingProfile, refreshProfile, supabase } =
    useSupabaseApp();
  const [checking, setChecking] = useState(true);
  const [needsClaim, setNeedsClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const check = useCallback(async () => {
    if (!configured || !session?.user || !supabase) {
      setChecking(false);
      setNeedsClaim(false);
      return;
    }
    setChecking(true);
    const { data, error } = await supabase.rpc("has_any_admin");
    setChecking(false);
    if (error) {
      console.warn("has_any_admin:", error.message);
      setNeedsClaim(false);
      return;
    }
    setNeedsClaim(data === false);
  }, [configured, session?.user, supabase]);

  useEffect(() => {
    void check();
  }, [check, loadingProfile]);

  const onClaim = async () => {
    if (!supabase) return;
    setClaiming(true);
    const { data: ok, error } = await supabase.rpc("claim_first_admin");
    setClaiming(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!ok) {
      toast.message("มีแอดมินในระบบแล้ว — โหลดหน้าใหม่หรือให้แอดมินเพิ่มสิทธิ์ให้คุณ");
      void check();
      return;
    }
    toast.success("คุณเป็นแอดมินคนแรกแล้ว — เมนู「การเข้าถึง」จะโผล่ทางซ้าย");
    await refreshProfile();
    void check();
  };

  if (
    !configured ||
    !session?.user ||
    checking ||
    loadingProfile ||
    !needsClaim
  ) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <MaterialIcon name="shield_person" size={22} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">ยังไม่มีแอดมินในระบบ</p>
        <p className="text-muted-foreground">
          ถ้าคุณเป็นเจ้าของโปรเจกต์ กดปุ่มด้านขวาเพื่อตั้งบัญชีของคุณเป็นแอดมิน
          แล้วจัดการรายชื่ออีเมลและสิทธิ์ได้ที่เมนู「การเข้าถึง」
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1"
        disabled={claiming}
        onClick={() => void onClaim()}
      >
        <MaterialIcon name="admin_panel_settings" size={18} />
        {claiming ? "กำลังตั้งค่า…" : "ตั้งเป็นแอดมินคนแรก"}
      </Button>
    </div>
  );
}
