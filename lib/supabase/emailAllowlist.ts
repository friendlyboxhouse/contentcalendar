import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AllowlistDenialReason =
  | "rpc_error"
  | "allowlist_empty"
  | "no_email"
  | "email_not_allowlisted";

export type EmailAllowlistResult =
  | { ok: true }
  | { ok: false; error: AllowlistDenialReason };

/**
 * Allowlist เข้ม: ต้องมีอย่างน้อย 1 แถวใน allowed_emails และอีเมลผู้ใช้ต้องอยู่ในรายการ
 * (ตารางว่าง = ไม่ให้ล็อกอิน — ต้องใส่เมลใน Supabase ก่อนเปิดใช้งานจริง)
 */
export async function evaluateEmailAllowlist(
  supabase: SupabaseClient,
  user: User
): Promise<EmailAllowlistResult> {
  const { data: hasAllowlist, error: rpcError } = await supabase.rpc(
    "allowlist_has_any"
  );

  if (rpcError) {
    console.warn("[allowlist] allowlist_has_any RPC failed:", rpcError.message);
    return { ok: false, error: "rpc_error" };
  }

  if (!hasAllowlist) {
    return { ok: false, error: "allowlist_empty" };
  }

  const em = user.email?.toLowerCase().trim();
  if (!em) {
    return { ok: false, error: "no_email" };
  }

  const { data, error } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", em)
    .maybeSingle();

  if (error) {
    console.warn("[allowlist] allowed_emails select failed:", error.message);
    return { ok: false, error: "rpc_error" };
  }

  if (!data) {
    return { ok: false, error: "email_not_allowlisted" };
  }

  return { ok: true };
}

export async function isUserEmailAllowlisted(
  supabase: SupabaseClient,
  user: User
): Promise<boolean> {
  const r = await evaluateEmailAllowlist(supabase, user);
  return r.ok;
}
