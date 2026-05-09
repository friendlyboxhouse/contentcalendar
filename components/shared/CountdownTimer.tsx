"use client";

import { useEffect, useState } from "react";
import { getCountdown, COUNTDOWN_COLORS } from "@/lib/utils";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: Date | string | number;
  label?: string;
  compact?: boolean;
  className?: string;
  /** ms — re-render interval. Default 60_000 (1 min). */
  refreshMs?: number;
}

export function CountdownTimer({
  targetDate,
  label,
  compact = false,
  className,
  refreshMs = 60_000,
}: CountdownTimerProps) {
  // Tick triggers re-render so countdown stays current.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (refreshMs <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  const { days, hours, isOverdue, urgency } = getCountdown(targetDate);
  const colors = COUNTDOWN_COLORS[urgency];

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          colors.text,
          className
        )}
        title={label}
      >
        {isOverdue ? (
          <MaterialIcon name="warning" size={14} className="shrink-0 opacity-90" />
        ) : null}
        {isOverdue
          ? days === 0
            ? `เกิน ${hours} ชม.`
            : `${days} วันเกินกำหนด`
          : days === 0
            ? `เหลือ ${hours} ชม.`
            : `เหลือ ${days} วัน`}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
        colors.text,
        colors.bg,
        className
      )}
    >
      {urgency === "overdue" ? (
        <MaterialIcon name="warning" size={16} className="shrink-0" />
      ) : (
        <MaterialIcon name="schedule" size={16} className="shrink-0 opacity-80" />
      )}
      <span>
        {label && `${label}: `}
        {isOverdue
          ? days === 0
            ? `เกิน ${hours} ชม.`
            : `เกิน ${days} วัน`
          : days === 0
            ? `เหลือ ${hours} ชม.`
            : `เหลือ ${days} วัน`}
      </span>
    </div>
  );
}
