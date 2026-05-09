"use client";

import { useEffect } from "react";
import { useContentStore } from "@/store/contentStore";
import { KPI_REMINDER_DAYS } from "@/lib/constants";

export function useKPIReminder() {
  const items = useContentStore((s) => s.items);
  const updateStatus = useContentStore((s) => s.updateStatus);
  const updateItem = useContentStore((s) => s.updateItem);

  useEffect(() => {
    const now = new Date();

    items.forEach((item) => {
      if (!item.publishedAt) return;
      if (item.status !== "published" && item.status !== "kpi_pending") return;

      const daysSince = Math.floor(
        (now.getTime() - item.publishedAt.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (
        daysSince >= KPI_REMINDER_DAYS[0] &&
        !item.performance?.finalMetrics &&
        item.status === "published"
      ) {
        updateStatus(item.id, "kpi_pending");
        updateItem(item.id, { kpiReminderSentAt: now });
      }
    });
  }, [items, updateItem, updateStatus]);

  const reminderItems = items.filter(
    (item) =>
      item.status === "kpi_pending" && !item.performance?.finalMetrics
  );

  return { reminderItems, count: reminderItems.length };
}
