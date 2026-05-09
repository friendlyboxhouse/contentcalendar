"use client";

import { format, endOfWeek, getISOWeek } from "date-fns";
import { MaterialIcon } from "@/components/ui/material-icon";

interface ReportHeaderProps {
  brandName: string;
  reportType: "Weekly Action Plan" | "Monthly Executive Report";
  dateRange: string;
  generatedAt: Date;
  weekAnchor?: Date;
  /** Overrides second line under date range */
  subtitle?: string;
  accentColor?: string;
}

export function ReportHeader({
  brandName,
  reportType,
  dateRange,
  generatedAt,
  weekAnchor,
  subtitle,
  accentColor = "#111827",
}: ReportHeaderProps) {
  const sub =
    subtitle ??
    (reportType === "Weekly Action Plan" && weekAnchor
      ? `Week ${getISOWeek(weekAnchor)} of ${format(weekAnchor, "yyyy")}`
      : format(generatedAt, "MMMM yyyy"));

  return (
    <header
      className="mb-6 flex h-[72px] items-center justify-between border-b-2 pb-4"
      style={{ borderColor: accentColor }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-[18px] font-semibold leading-tight"
          style={{ color: accentColor }}
        >
          {brandName}
        </div>
        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          {reportType}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 text-center">
        <div className="text-[22px] font-bold leading-tight text-gray-900">
          {dateRange}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-400">{sub}</div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
        <span className="text-[11px] text-gray-400">Generated</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-gray-600">
            {format(generatedAt, "d MMM yyyy")}
          </span>
          <MaterialIcon
            name="calendar_month"
            size={18}
            className="shrink-0 text-gray-400"
          />
        </div>
      </div>
    </header>
  );
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const start = weekStart;
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM")}–${format(end, "d MMM yyyy")}`;
}
