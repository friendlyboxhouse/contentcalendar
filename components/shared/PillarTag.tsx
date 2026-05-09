"use client";

import type { ComponentType } from "react";
import { PILLAR_CONFIG } from "@/lib/constants";
import type { ContentPillar } from "@/lib/types";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface PillarTagProps {
  pillar: ContentPillar;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function PillarTag({
  pillar,
  showIcon = true,
  size = "md",
  className,
}: PillarTagProps) {
  const config = PILLAR_CONFIG[pillar];
  const IconComponent = Icons[config.icon as keyof typeof Icons] as
    | ComponentType<{ className?: string }>
    | undefined;
  const sizeClass =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClass,
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      {showIcon && IconComponent && (
        <IconComponent className="h-3 w-3 shrink-0" />
      )}
      {config.label}
    </span>
  );
}
