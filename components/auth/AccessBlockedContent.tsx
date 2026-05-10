"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

export function AccessBlockedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, session } = useSupabaseApp();
  const reason = searchParams.get("reason") ?? "email_not_allowlisted";

  const message = useMemo(() => {
    switch (reason) {
      case "allowlist_empty":
        return {
          title: "ระบบภายในยังไม่พร้อมรับทีม",
          body: "แอปนี้ไม่เปิดสาธารณะ — ผู้ดูแลต้องใส่อีเมลพนักงานในรายการก่อน (ตาราง allowed_emails ว่างอยู่) แจ้งทีมเพื่อเพิ่มเมลของคุณ",
        };
      case "allowlist_check_failed":
        return {
          title: "ตรวจสอบสิทธิ์ไม่สำเร็จ",
          body: "เชื่อมต่อหรือตรวจสอบสิทธิ์กับฐานข้อมูลไม่สำเร็จชั่วคราว — ลองออกจากระบบแล้วเข้าใหม่ หรือแจ้งผู้ดูแลระบบ",
        };
      case "no_email":
        return {
          title: "บัญชีนี้ไม่มีอีเมล",
          body: "ผู้ให้บริการล็อกอินไม่ส่งอีเมลมาให้ระบบ — ใช้บัญชี Google ที่มีอีเมลชัดเจน หรือติดต่อผู้ดูแล",
        };
      default:
        return {
          title: "อีเมลนี้ไม่อยู่ในรายการของทีม",
          body: "แอปนี้ใช้เฉพาะภายในบริษัท — ทุกคนที่เข้าได้ (แม้แค่ดูข้อมูล) ต้องอยู่ในรายการอนุญาต ลองออกจากระบบแล้วเข้าด้วยบัญชี Google ที่ทีมลงทะเบียนไว้",
        };
    }
  }, [reason]);

  const email = session?.user?.email?.trim() ?? null;

  const leaveAndGoLogin = async () => {
    if (!supabase) {
      router.replace("/login");
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-xl font-semibold">
        <MaterialIcon name="calendar_month" size={28} />
        Content Planner
      </div>
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="flex items-start gap-2 text-lg">
            <MaterialIcon
              name="gpp_maybe"
              className="shrink-0 text-amber-600 dark:text-amber-400"
            />
            {message.title}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed text-foreground/90">
            {message.body}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm">
              <span className="text-xs font-sans text-muted-foreground">
                บัญชีที่ใช้ล็อกอิน{" "}
              </span>
              {email}
            </div>
          ) : null}
          <Button
            type="button"
            className="w-full gap-2"
            onClick={() => void leaveAndGoLogin()}
          >
            <MaterialIcon name="logout" size={18} />
            ออกจากระบบแล้วลองบัญชี Google อื่น
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Google จะให้เลือกบัญชีเมื่อเข้าสู่ระบบครั้งถัดไป — ใช้เมลที่ทีมเพิ่มในรายการอนุญาต
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
