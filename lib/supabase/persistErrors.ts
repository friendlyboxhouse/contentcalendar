import type { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";

/** แจ้งผู้ใช้เมื่อบันทึกคลาวด์ / payload ใหญ่เกิน / สิทธิ์ถูกปฏิเสธ — ไม่ให้ silent fail */
export function toastSupabasePersistError(error: PostgrestError | Error | unknown) {
  const pg = error as Partial<PostgrestError>;
  const code = pg.code ?? "";
  const msg = pg.message ?? (error instanceof Error ? error.message : String(error));
  const combined = `${code} ${msg}`.toLowerCase();

  if (
    combined.includes("413") ||
    combined.includes("payload too large") ||
    combined.includes("too large")
  ) {
    toast.error(
      "ข้อมูลใหญ่เกินที่เซิร์ฟเวอร์รับได้ — ลดขนาดบรีฟหรือแบ่งบันทึกส่วนที่จำเป็น"
    );
    return;
  }
  if (
    code === "42501" ||
    combined.includes("403") ||
    combined.includes("permission denied") ||
    combined.includes("row-level security")
  ) {
    toast.error(
      `ไม่มีสิทธิ์บันทึกข้อมูลนี้ — ลองรีเฟรชหรือติดต่อผู้ดูแลทีม (${msg})`
    );
    return;
  }

  toast.error(`บันทึกล้มเหลว: ${msg}`);
}
