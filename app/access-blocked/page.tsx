import { Suspense } from "react";
import { AccessBlockedContent } from "@/components/auth/AccessBlockedContent";

export const dynamic = "force-dynamic";

export default function AccessBlockedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6 text-sm text-muted-foreground">
          กำลังโหลด…
        </div>
      }
    >
      <AccessBlockedContent />
    </Suspense>
  );
}
