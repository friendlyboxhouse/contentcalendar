import { redirect } from "next/navigation";

/** URL เดิม — พาไปหลังบ้านส่วนอีเมล */
export default function LegacyAdminAccessRedirect() {
  redirect("/admin/emails");
}
