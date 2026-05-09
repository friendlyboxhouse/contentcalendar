"use client";

import type { ContentItem } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface KPIReminderBannerProps {
  items: ContentItem[];
}

export function KPIReminderBanner({ items }: KPIReminderBannerProps) {
  const router = useRouter();

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4" />
        ⏰ {items.length} โพสต์รอเช็ค KPI
      </div>
      <div className="w-full overflow-x-auto pb-1">
        <div className="flex gap-2">
          {items.map((item) => {
            const days = item.publishedAt
              ? Math.floor(
                  (Date.now() - item.publishedAt.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;
            return (
              <button
                key={item.id}
                type="button"
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50 dark:hover:bg-amber-900"
                onClick={() => router.push(`/performance/${encodeURIComponent(item.id)}`)}
              >
                {item.id} · {days} วันหลังโพสต์
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
