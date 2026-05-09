"use client";

import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { StatCardKey } from "@/lib/types";

interface StatsCardProps {
  title: string;
  value: number;
  trend: number;
  active?: boolean;
  statKey: StatCardKey;
  onPress?: (key: StatCardKey) => void;
}

export function StatsCard({
  title,
  value,
  trend,
  active,
  statKey,
  onPress,
}: StatsCardProps) {
  const Icon =
    trend > 0.02 ? ArrowUpRight : trend < -0.02 ? ArrowDownRight : Minus;
  const trendLabel = `${Math.abs(Math.round(trend * 100))}%`;

  return (
    <button
      type="button"
      onClick={() => onPress?.(statKey)}
      className={cn(
        "flex flex-1 flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md min-w-[140px]",
        active && "border-primary ring-2 ring-primary/20"
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <span className="mt-2 text-3xl font-semibold tabular-nums">{value}</span>
      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            trend > 0.02 && "text-emerald-600",
            trend < -0.02 && "text-red-600"
          )}
        />
        เทียบเดือนก่อน {trendLabel}
      </span>
    </button>
  );
}
