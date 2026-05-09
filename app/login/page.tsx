import { Suspense } from "react";
import { LoginContent } from "./LoginContent";
import { resolveAuthRedirectOrigin } from "@/lib/authRedirectOrigin";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";

export default async function LoginPage() {
  const authRedirectOrigin = await resolveAuthRedirectOrigin();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/40 py-16">
          <PageSpinner label="กำลังโหลดหน้าเข้าสู่ระบบ…" />
        </div>
      }
    >
      <LoginContent authRedirectOrigin={authRedirectOrigin} />
    </Suspense>
  );
}
