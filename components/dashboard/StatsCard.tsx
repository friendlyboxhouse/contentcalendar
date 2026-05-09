"use client";

import { cn } from "@/lib/utils";
import type { StatCardKey } from "@/lib/types";
import { MaterialIcon } from "@/components/ui/material-icon";

interface StatsCardProps {
  title: string;
  value: number;
  /** Optional secondary stat: e.g. "5 จากเดือนนี้" */
  hint?: string;
  active?: boolean;
  statKey: StatCardKey;
  onPress?: (key: StatCardKey) => void;
  /** Material Symbols icon name (ligature) */
  symbol?: string;
}

export function StatsCard({
  title,
  value,
  hint,
  active,
  statKey,
  onPress,
  symbol,
}: StatsCardProps) {
  return (
    <button
      type="button"
      onClick={() => onPress?.(statKey)}
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all",
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
      <span
        className={cn(
          "mt-2 text-3xl font-bold tabular-nums",
          active && "text-primary"
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
      ) : (
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
          <MaterialIcon name="arrow_forward" size={12} />
          คลิกเพื่อดูรายการ
        </span>
      )}
    </button>
  );
}
