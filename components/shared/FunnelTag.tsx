"use client";

import { FUNNEL_CONFIG } from "@/lib/constants";
import type { FunnelStage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FunnelTag({
  stage,
  className,
}: {
  stage: FunnelStage;
  className?: string;
}) {
  const c = FUNNEL_CONFIG[stage];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white",
        className
      )}
      style={{ backgroundColor: c.color }}
    >
      {c.label}
    </span>
  );
}
