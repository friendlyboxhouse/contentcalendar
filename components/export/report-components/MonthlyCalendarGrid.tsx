"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { PILLAR_CONFIG, STATUS_CONFIG, PLATFORM_LABELS } from "@/lib/constants";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function postIdShort(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

function MicroChip({ item }: { item: ContentItem }) {
  const pc = PILLAR_CONFIG[item.pillar];
  const sc = STATUS_CONFIG[item.status];
  const title = `${item.topic} · ${sc.label} · ${postIdShort(item.id)}`;
  return (
    <div
      title={title}
      className="content-chip-print mb-0.5 flex h-9 max-w-full items-center gap-1 overflow-hidden rounded border border-gray-100 px-1 pr-1"
      style={{ borderLeftWidth: 3, borderLeftColor: pc.color }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: sc.dotColor }}
        aria-hidden
      />
      <span className="truncate text-[10px] font-medium leading-tight text-gray-800">
        {item.topic}
      </span>
    </div>
  );
}

interface MonthlyCalendarGridProps {
  items: ContentItem[];
  year: number;
  month: number;
}

export function MonthlyCalendarGrid({
  items,
  year,
  month,
}: MonthlyCalendarGridProps) {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const platformCounts: Record<string, number> = {};
  items.forEach((it) => {
    it.platform.forEach((p) => {
      platformCounts[p] = (platformCounts[p] ?? 0) + 1;
    });
  });

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const inMonth = isSameMonth(day, monthStart);
              const dayItems = items.filter((it) =>
                isSameDay(new Date(it.publishDate), day)
              );
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[92px] rounded-lg border border-gray-100 p-1",
                    !inMonth && "bg-gray-50 opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 text-center text-[12px] font-semibold tabular-nums text-gray-900",
                      !inMonth && "text-gray-400"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.map((it) => (
                      <MicroChip key={it.id} item={it} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          Platforms
        </span>
        {Object.entries(platformCounts).map(([pl, n]) => (
          <span
            key={pl}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
          >
            <span className="font-medium">
              {PLATFORM_LABELS[pl] ?? pl}
            </span>
            <span className="tabular-nums text-gray-500">{n}</span>
          </span>
        ))}
        {Object.keys(platformCounts).length === 0 && (
          <span className="text-[12px] text-gray-400">No posts this month</span>
        )}
      </div>
    </div>
  );
}
