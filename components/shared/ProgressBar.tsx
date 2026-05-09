"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  target: number;
  passed: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  target,
  passed,
  className,
}: ProgressBarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const denom = Math.max(target * 1.5, 1);
  const pct = Math.min(100, (value / denom) * 100);
  const tickPct = Math.min(100, (target / denom) * 100);

  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          passed ? "bg-emerald-500" : "bg-red-500",
          mounted ? "opacity-100" : "opacity-0"
        )}
        style={{ width: `${pct}%` }}
      />
      <div
        className="pointer-events-none absolute top-0 bottom-0 w-px bg-foreground/70"
        style={{ left: `${tickPct}%` }}
      />
    </div>
  );
}
