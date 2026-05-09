import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * ถ้าไม่มีแถวใน allowed_emails → อนุญาตทุกคนที่ล็อกอินผ่าน Supabase ได้
 * ถ้ามีแถวอย่างน้อยหนึ่งแถว → อนุญาตเฉพาะอีเมลที่อยู่ในตาราง (เปรียบเทียบแบบ lowercase)
 */
export async function isUserEmailAllowlisted(
  supabase: SupabaseClient,
  user: User
): Promise<boolean> {
  const { data: hasAllowlist, error: rpcError } = await supabase.rpc(
    "allowlist_has_any"
  );

  if (rpcError) {
    console.warn("[allowlist] allowlist_has_any RPC failed:", rpcError.message);
    return true;
  }

  if (!hasAllowlist) return true;

  const em = user.email?.toLowerCase().trim();
  if (!em) return false;

  const { data, error } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", em)
    .maybeSingle();

  if (error) {
    console.warn("[allowlist] allowed_emails select failed:", error.message);
    return false;
  }

  return !!data;
}
