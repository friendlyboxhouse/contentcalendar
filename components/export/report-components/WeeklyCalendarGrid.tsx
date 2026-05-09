"use client";

import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import {
  PILLAR_CONFIG,
  STATUS_CONFIG,
  FORMAT_LABELS,
  PLATFORM_LABELS,
} from "@/lib/constants";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { calcEngagementRate } from "@/lib/utils";

function postIdShort(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function ContentChipPrint({ item }: { item: ContentItem }) {
  const pc = PILLAR_CONFIG[item.pillar];
  const sc = STATUS_CONFIG[item.status];
  const fm = item.performance?.finalMetrics ?? item.performance?.snapshot24h;
  const er = fm
    ? calcEngagementRate(
        fm.likes,
        fm.comments,
        fm.shares,
        fm.saves,
        fm.reach
      )
    : null;
  const plats = item.platform
    .map((p) => PLATFORM_LABELS[p] ?? p)
    .join(", ");

  return (
    <div
      className="content-chip-print mb-1.5 rounded-md border border-gray-100 px-2.5 py-2 last:mb-0"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: pc.color,
        backgroundColor: pc.bgColor,
      }}
    >
      <div className="flex items-center justify-between gap-1 text-[10px] tabular-nums text-gray-400">
        <span>{postIdShort(item.id)}</span>
        <span className="truncate text-right">{plats}</span>
      </div>
      <div className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-gray-900">
        {item.topic}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 text-[10px] text-gray-600">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: pc.color }}
          />
          {FORMAT_LABELS[item.format]}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: sc.bgColor,
            color: sc.color,
          }}
        >
          {sc.emoji} {sc.label}
        </span>
      </div>
      {fm && er !== null && (
        <div className="mt-1 flex gap-3 text-[10px]">
          <span className="font-medium text-green-600">ER: {er.toFixed(1)}%</span>
          <span className="font-medium text-blue-600">Saves: {fm.saves}</span>
        </div>
      )}
    </div>
  );
}

interface WeeklyCalendarGridProps {
  items: ContentItem[];
  weekStart: Date;
}

export function WeeklyCalendarGrid({
  items,
  weekStart,
}: WeeklyCalendarGridProps) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayItems = items.filter((it) =>
          isSameDay(new Date(it.publishDate), day)
        );
        const isToday = isSameDay(day, today);

        return (
          <div
            key={day.toISOString()}
            className="flex min-h-[120px] flex-col rounded-lg border border-dashed border-gray-200 bg-white"
          >
            <div className="border-b border-gray-100 px-2 py-2 text-center">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 flex h-8 w-8 items-center justify-center text-[22px] font-bold leading-none text-gray-900",
                  isToday && "rounded-full bg-gray-900 text-white"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-1.5">
              {dayItems.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-[11px] text-gray-300">
                  —
                </div>
              ) : (
                dayItems.map((it) => <ContentChipPrint key={it.id} item={it} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
