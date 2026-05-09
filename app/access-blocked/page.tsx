import { Suspense } from "react";
import { AccessBlockedContent } from "@/components/auth/AccessBlockedContent";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";

export const dynamic = "force-dynamic";

export default function AccessBlockedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/40 py-16">
          <PageSpinner label="กำลังโหลด…" />
        </div>
      }
    >
      <AccessBlockedContent />
    </Suspense>
  );
}
