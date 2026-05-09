"use client";

import { cn } from "@/lib/utils";
import type { StatCardKey } from "@/lib/types";
import { MaterialIcon } from "@/components/ui/material-icon";

interface StatsCardProps {
  title: string;
  value: number;
  trend: number;
  active?: boolean;
  statKey: StatCardKey;
  onPress?: (key: StatCardKey) => void;
  /** Material Symbols icon name (ligature) */
  symbol?: string;
}

export function StatsCard({
  title,
  value,
  trend,
  active,
  statKey,
  onPress,
  symbol,
}: StatsCardProps) {
  const trendUp = trend > 0.02;
  const trendDown = trend < -0.02;
  const trendIconName = trendUp
    ? "trending_up"
    : trendDown
      ? "trending_down"
      : "horizontal_rule";
  const trendLabel = `${Math.abs(Math.round(trend * 100))}%`;

  return (
    <button
      type="button"
      onClick={() => onPress?.(statKey)}
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all",
        "hover:border-primary/50 hover:shadow-md hover:-translate-y-px",
        active && "border-primary ring-2 ring-primary/20 shadow-md"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {symbol ? (
          <MaterialIcon
            name={symbol}
            size={16}
            className={active ? "text-primary" : ""}
          />
        ) : null}
        {title}
      </span>
      <span className={cn("mt-2 text-3xl font-bold tabular-nums", active && "text-primary")}>
        {value}
      </span>
      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MaterialIcon
          name={trendIconName}
          size={14}
          className={cn(
            trendUp && "text-emerald-600",
            trendDown && "text-red-500",
            !trendUp && !trendDown && "opacity-50"
          )}
        />
        เทียบเดือนก่อน {trendLabel}
      </span>
    </button>
  );
}
