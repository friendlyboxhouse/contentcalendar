"use client";

import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { ContentItem } from "@/lib/types";

function postIdShort(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

interface DeadlineAlertSectionProps {
  overdue: ContentItem[];
  critical: ContentItem[];
  warning: ContentItem[];
}

export function DeadlineAlertSection({
  overdue,
  critical,
  warning,
}: DeadlineAlertSectionProps) {
  if (!overdue.length && !critical.length && !warning.length) return null;

  const now = startOfDay(new Date());

  const chip = (item: ContentItem, kind: "overdue" | "crit" | "warn") => {
    const pub = startOfDay(new Date(item.publishDate));
    const days = differenceInCalendarDays(now, pub);
    let suffix = "";
    if (kind === "overdue") suffix = `${days}d overdue`;
    else if (kind === "crit") suffix = "≤24h";
    else suffix = "this week";

    return (
      <span
        key={item.id}
        className="mb-1 mr-1 inline-block rounded-full border border-black/5 bg-white/80 px-2 py-1 text-[11px] text-gray-800"
      >
        <span className="font-mono text-[10px] text-gray-500">
          {postIdShort(item.id)}
        </span>{" "}
        <span className="font-medium">{item.topic}</span>{" "}
        <span className="text-gray-400">· {suffix}</span>
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {overdue.length > 0 && (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-red-700">
            🚨 OVERDUE
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-white">
              {overdue.length}
            </span>
          </div>
          <div className="flex flex-wrap">
            {overdue.map((i) => chip(i, "overdue"))}
          </div>
        </div>
      )}
      {critical.length > 0 && (
        <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            ⚠️ DUE WITHIN 24H
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-white">
              {critical.length}
            </span>
          </div>
          <div className="flex flex-wrap">
            {critical.map((i) => chip(i, "crit"))}
          </div>
        </div>
      )}
      {warning.length > 0 && (
        <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-800">
            📅 DUE THIS WEEK
            <span className="rounded-full bg-blue-400 px-2 py-0.5 text-white">
              {warning.length}
            </span>
          </div>
          <div className="flex flex-wrap">
            {warning.map((i) => chip(i, "warn"))}
          </div>
        </div>
      )}
    </div>
  );
}
