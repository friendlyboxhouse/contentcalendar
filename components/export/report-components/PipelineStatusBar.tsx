"use client";

import { aggregateStats } from "@/lib/reportUtils";
import { CONTENT_STATUSES_ORDERED, STATUS_CONFIG } from "@/lib/constants";
import type { ContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Stats = ReturnType<typeof aggregateStats>;

interface PipelineStatusBarProps {
  stats: Stats;
}

export function PipelineStatusBar({ stats }: PipelineStatusBarProps) {
  const rows = CONTENT_STATUSES_ORDERED.map((s) => ({
    status: s as ContentStatus,
    count: stats.byStatus[s as ContentStatus] ?? 0,
  }));

  return (
    <div>
      <div className="flex w-full overflow-hidden rounded-lg border border-gray-100">
        {rows.map(({ status, count }, idx) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <div
              key={status}
              className={cn(
                "flex min-w-[40px] flex-1 flex-col items-center justify-center px-1 py-2 text-center",
                idx > 0 && "border-l border-white/50"
              )}
              style={{
                flexGrow: Math.max(count, 0.15),
                backgroundColor: cfg.bgColor,
              }}
            >
              <span className="text-[11px] leading-tight">
                {cfg.emoji} <span className="hidden sm:inline">{cfg.label}</span>
              </span>
              <span
                className="mt-0.5 text-[20px] font-bold tabular-nums"
                style={{ color: cfg.color }}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[13px] text-gray-500">
        Total: {stats.total} posts across all stages
      </p>
    </div>
  );
}
