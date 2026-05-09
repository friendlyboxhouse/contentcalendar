import { DashboardClient } from "@/components/dashboard/DashboardClient";

/** กันโหมด static/cache ทำให้หน้าแรกไม่ผ่าน middleware/auth flow */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <DashboardClient />;
}
