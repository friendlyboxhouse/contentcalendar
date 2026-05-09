"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Layers,
  Send,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  layers: Layers,
  clock: Clock,
  send: Send,
  check: CheckCircle,
  chart: BarChart3,
};

export interface ExecStatCard {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  highlight?: boolean;
  icon?: string;
}

interface ExecSummaryStripProps {
  stats: ExecStatCard[];
  columns?: 4 | 5 | 6;
}

export function ExecSummaryStrip({
  stats,
  columns = 4,
}: ExecSummaryStripProps) {
  const grid =
    columns === 4
      ? "grid-cols-4"
      : columns === 5
        ? "grid-cols-5"
        : "grid-cols-6";

  return (
    <div className={cn("grid gap-3", grid)}>
      {stats.map((s, i) => {
        const Icon = s.icon ? ICONS[s.icon] : undefined;
        const trendUp = s.trend !== undefined && s.trend >= 0;
        return (
          <div
            key={i}
            className={cn(
              "stat-card rounded-lg border p-5",
              s.highlight
                ? "border-gray-900 bg-gray-900 text-white [&_.muted]:text-gray-300"
                : "border-gray-200 bg-white text-gray-900"
            )}
          >
            <div className="flex items-center gap-2">
              {Icon && (
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    s.highlight ? "text-gray-300" : "text-gray-400"
                  )}
                />
              )}
              <span
                className={cn(
                  "muted text-[11px] font-medium uppercase tracking-[0.08em]",
                  s.highlight ? "text-gray-300" : "text-gray-500"
                )}
              >
                {s.label}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-1">
              <span className="text-[36px] font-bold tabular-nums leading-none">
                {s.value}
              </span>
              {s.unit && (
                <span
                  className={cn(
                    "muted pb-1 text-[14px]",
                    s.highlight ? "text-gray-300" : "text-gray-400"
                  )}
                >
                  {s.unit}
                </span>
              )}
            </div>
            {s.trend !== undefined && s.trendLabel && (
              <div className="mt-2 flex items-center gap-1 text-[11px]">
                {trendUp ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span
                  className={cn(
                    "font-semibold",
                    trendUp ? "text-green-600" : "text-red-500"
                  )}
                >
                  {trendUp ? "↑" : "↓"} {Math.abs(s.trend)}
                </span>
                <span className="muted text-gray-400">{s.trendLabel}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
