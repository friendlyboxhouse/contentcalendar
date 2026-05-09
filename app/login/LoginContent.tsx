"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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

export function LoginContent() {
  const searchParams = useSearchParams();
  const { configured, supabase } = useSupabaseApp();
  const rawError = searchParams.get("error");

  const errorMessage = useMemo(() => {
    if (rawError === "email_not_allowlisted") {
      return "บัญชีอีเมลนี้ไม่อยู่ในรายการที่ได้รับอนุญาต — ติดต่อผู้ดูแลระบบ";
    }
    if (!rawError || rawError === "missing_code") {
      return rawError === "missing_code"
        ? "ไม่ได้รับ authorization code จากผู้ให้บริการ"
        : null;
    }
    try {
      return decodeURIComponent(rawError);
    } catch {
      return rawError;
    }
  }, [rawError]);

  const signInGoogle = async () => {
    if (!supabase) {
      toast.error("ยังไม่ได้ตั้งค่า Supabase");
      return;
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const next = searchParams.get("next") ?? "/";
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) toast.error(oauthError.message);
  };

  if (!configured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MaterialIcon name="cloud_off" />
              ยังไม่ได้เชื่อม Supabase
            </CardTitle>
            <CardDescription>
              ใน Hostinger ใส่{" "}
              <code className="rounded bg-muted px-1">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              +{" "}
              <code className="rounded bg-muted px-1">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              หรือคู่{" "}
              <code className="rounded bg-muted px-1">SUPABASE_URL</code> +{" "}
              <code className="rounded bg-muted px-1">SUPABASE_ANON_KEY</code>{" "}
              แล้วให้แอป build/deploy ใหม่
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-xl font-semibold">
        <MaterialIcon name="calendar_month" size={28} />
        Content Planner — DINKR
      </div>
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">เข้าสู่ระบบ</CardTitle>
          <CardDescription>
            ใช้บัญชี Google เพื่อซิงค์ Brief ไปยังฐานข้อมูลและรับอัปเดตแบบเรียลไทม์
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <Button
            type="button"
            className="w-full gap-2"
            onClick={() => void signInGoogle()}
          >
            <MaterialIcon name="login" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
