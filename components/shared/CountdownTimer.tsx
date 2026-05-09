"use client";

import { getCountdown, COUNTDOWN_COLORS } from "@/lib/utils";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function CountdownTimer({
  targetDate,
  label,
  compact = false,
  className,
}: CountdownTimerProps) {
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
      >
        {isOverdue ? (
          <MaterialIcon name="warning" size={14} className="shrink-0 opacity-90" />
        ) : null}
        {isOverdue
          ? `${days} วันเกินกำหนด`
          : days === 0
            ? `${hours} ชม.`
            : `${days} วัน`}
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
          ? `เกิน ${days} วัน`
          : days === 0
            ? `เหลือ ${hours} ชม.`
            : `เหลือ ${days} วัน`}
      </span>
    </div>
  );
}
