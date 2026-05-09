import { Suspense } from "react";
import { LoginContent } from "./LoginContent";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6 text-sm text-muted-foreground">
          กำลังโหลด…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
