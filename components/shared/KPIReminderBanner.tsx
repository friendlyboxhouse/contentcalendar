"use client";

import type { ContentItem } from "@/lib/types";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useRouter } from "next/navigation";
import { useContentStore } from "@/store/contentStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

interface KPIReminderBannerProps {
  items: ContentItem[];
}

export function KPIReminderBanner({ items }: KPIReminderBannerProps) {
  const router = useRouter();
  const snoozeKPIReminder = useContentStore((s) => s.snoozeKPIReminder);
  const [collapsed, setCollapsed] = useState(false);

  if (!items.length) return null;

  const snooze = (id: string) => {
    snoozeKPIReminder(id);
    toast.success(`เลื่อนเตือน ${id} ออกไป 3 วัน`);
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-amber-900 dark:text-amber-100"
          aria-expanded={!collapsed}
        >
          <MaterialIcon name="schedule" size={20} className="text-amber-700 dark:text-amber-200" />
          <span>{items.length} โพสต์รอเช็ค KPI</span>
          <MaterialIcon
            name={collapsed ? "expand_more" : "expand_less"}
            size={18}
            className="opacity-70"
          />
        </button>
      </div>
      {!collapsed && (
        <div className="w-full overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          <div className="flex gap-2">
            {items.map((item) => {
              const days = item.publishedAt
                ? Math.floor(
                    (Date.now() - new Date(item.publishedAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0;
              return (
                <div
                  key={item.id}
                  className="inline-flex shrink-0 items-stretch overflow-hidden rounded-full border border-amber-300 bg-white shadow-sm dark:border-amber-800 dark:bg-amber-950"
                >
                  <button
                    type="button"
                    className="min-h-9 px-3 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:text-amber-50 dark:hover:bg-amber-900"
                    onClick={() =>
                      router.push(`/performance/${encodeURIComponent(item.id)}`)
                    }
                    title="เปิดหน้ากรอก KPI"
                  >
                    {item.id} · {days} วันหลังโพสต์
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="rounded-none border-l border-amber-200 px-2 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900"
                    onClick={() => snooze(item.id)}
                    aria-label={`เลื่อนเตือน ${item.id}`}
                    title="เลื่อนเตือน 3 วัน"
                  >
                    <MaterialIcon name="snooze" size={14} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
