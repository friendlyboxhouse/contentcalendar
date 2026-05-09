import { Suspense } from "react";
import { LoginContent } from "./LoginContent";
import { resolveAuthRedirectOrigin } from "@/lib/authRedirectOrigin";

export default async function LoginPage() {
  const authRedirectOrigin = await resolveAuthRedirectOrigin();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6 text-sm text-muted-foreground">
          กำลังโหลด…
        </div>
      }
    >
      <LoginContent authRedirectOrigin={authRedirectOrigin} />
    </Suspense>
  );
}
