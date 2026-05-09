"use client";

import type { ContentFormat } from "@/lib/types";
import { FORMAT_LABELS } from "@/lib/constants";
import { CONTENT_FORMATS_ALL } from "@/lib/reportConstants";
import { cn } from "@/lib/utils";

const BLUES = ["#1E40AF", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];

interface FormatComparisonBarProps {
  data: Record<
    ContentFormat,
    {
      avgEngagementRate: number;
      count: number;
    }
  >;
}

export function FormatComparisonBar({ data }: FormatComparisonBarProps) {
  const rows = CONTENT_FORMATS_ALL.map((f) => ({
    format: f,
    ...data[f],
  }))
    .filter((r) => r.count > 0 || r.avgEngagementRate > 0)
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  const maxEr = Math.max(...rows.map((r) => r.avgEngagementRate), 0.01);

  return (
    <div className="space-y-4">
      {rows.map((row, rank) => {
        const w = (row.avgEngagementRate / maxEr) * 100;
        const fill = BLUES[Math.min(rank, BLUES.length - 1)];
        const er = row.avgEngagementRate;
        const erColor =
          er > 8 ? "text-green-700" : er >= 4 ? "text-amber-700" : "text-red-600";

        return (
          <div key={row.format} className="flex items-center gap-3">
            <div className="w-[100px] shrink-0">
              <div className="text-[13px] font-semibold text-gray-900">
                {FORMAT_LABELS[row.format]}
              </div>
              <div className="text-[11px] text-gray-400">{row.count} posts</div>
            </div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full min-w-[32px] rounded-full transition-[width] duration-500 ease-out print:transition-none"
                style={{
                  width: `${Math.max(w, 5)}%`,
                  backgroundColor: fill,
                }}
              />
            </div>
            <div
              className={cn(
                "w-16 shrink-0 text-right text-[13px] font-bold tabular-nums",
                erColor
              )}
            >
              {er.toFixed(1)}%
            </div>
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="text-[13px] text-gray-500">No format performance data.</p>
      )}
      <p className="text-[10px] italic text-gray-400">
        Industry benchmark: ~5–8% ER for social content
      </p>
    </div>
  );
}
