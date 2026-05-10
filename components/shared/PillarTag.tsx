"use client";

import { PILLAR_CONFIG } from "@/lib/constants";
import type { ContentPillar } from "@/lib/types";
import { MaterialIcon } from "@/components/ui/material-icon";
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
  const iconSize = size === "sm" ? 14 : 16;
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
        backgroundColor: `color-mix(in srgb, ${config.color} 18%, var(--background))`,
        color: `color-mix(in oklab, ${config.color} 80%, var(--foreground))`,
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      {showIcon ? (
        <MaterialIcon
          name={config.icon}
          size={iconSize}
          className="shrink-0 opacity-90"
        />
      ) : null}
      {config.label}
    </span>
  );
}
