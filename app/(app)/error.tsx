"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ErrorState
          title="เกิดข้อผิดพลาด"
          message={
            process.env.NODE_ENV === "development"
              ? error.message
              : "มีบางอย่างผิดพลาด กรุณาลองใหม่อีกครั้ง หากยังมีปัญหาให้ติดต่อผู้ดูแลระบบ"
          }
          onRetry={reset}
          retryLabel="ลองใหม่"
        >
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="gap-1.5"
          >
            <MaterialIcon name="home" size={16} />
            กลับหน้าหลัก
          </Button>
        </ErrorState>
        {error.digest && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            รหัสข้อผิดพลาด: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
