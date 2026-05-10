import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramWebhookBody = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { username?: string };
  };
};

function isWebhookAuthorized(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return false;

  const headerSecret = request.headers
    .get("x-telegram-bot-api-secret-token")
    ?.trim();
  if (headerSecret && headerSecret === expected) return true;

  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret")?.trim();
  return Boolean(querySecret && querySecret === expected);
}

function getAdminSupabase() {
  const url = getSupabaseUrl();
  const serviceRole = getSupabaseServiceRoleKey();
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase admin credentials");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as TelegramWebhookBody;
  const text = payload.message?.text?.trim() ?? "";
  const chatIdRaw = payload.message?.chat?.id;
  const chatId = chatIdRaw == null ? "" : String(chatIdRaw).trim();

  if (!text.startsWith("/start")) {
    return NextResponse.json({ ok: true, ignored: "not_start_command" });
  }

  if (!chatId) {
    return NextResponse.json({ ok: false, error: "missing_chat_id" }, { status: 400 });
  }

  const token = text.split(/\s+/)[1]?.trim();
  if (!token) {
    await sendTelegramMessage(
      chatId,
      "ไม่พบโค้ดเชื่อมต่อ กรุณากดลิงก์จากหน้า Settings อีกครั้ง"
    );
    return NextResponse.json({ ok: true, ignored: "missing_start_token" });
  }

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "config_error" },
      { status: 500 }
    );
  }

  const nowIso = new Date().toISOString();
  const { data: consumed, error: consumeError } = await supabase
    .from("telegram_link_tokens")
    .update({ used_at: nowIso })
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .select("user_id")
    .maybeSingle();

  if (consumeError || !consumed?.user_id) {
    await sendTelegramMessage(
      chatId,
      "โค้ดเชื่อมต่อหมดอายุหรือถูกใช้งานแล้ว กรุณาสร้างโค้ดใหม่จากหน้า Settings"
    );
    return NextResponse.json({ ok: true, ignored: "token_invalid_or_expired" });
  }

  const username = payload.message?.from?.username?.trim() || null;
  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({
      telegram_chat_id: chatId,
      telegram_username: username,
      updated_at: nowIso,
    })
    .eq("id", consumed.user_id);

  if (updateProfileError) {
    await sendTelegramMessage(
      chatId,
      "เชื่อมต่อไม่สำเร็จชั่วคราว กรุณาลองใหม่จากหน้า Settings"
    );
    return NextResponse.json({ ok: false, error: updateProfileError.message }, { status: 500 });
  }

  await sendTelegramMessage(
    chatId,
    "เชื่อมต่อ Telegram สำเร็จแล้ว ตอนนี้คุณสามารถเปิด Daily DM ได้จากหน้า Settings"
  );
  return NextResponse.json({ ok: true });
}
