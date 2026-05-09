"use client";

import { STATUS_CONFIG } from "@/lib/constants";
import type { ContentStatus } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/ui/material-icon";

interface StatusBadgeProps {
  status: ContentStatus;
  editable?: boolean;
  onChange?: (status: ContentStatus) => void;
  className?: string;
}

export function StatusBadge({
  status,
  editable,
  onChange,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const badge = (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium",
        editable && "cursor-pointer hover:opacity-85",
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: config.dotColor }}
      />
      {config.emoji} {config.label}
      {editable ? (
        <MaterialIcon name="expand_more" size={16} className="opacity-70" />
      ) : null}
    </span>
  );

  if (!editable || !onChange) return badge;

  const ordered = Object.entries(STATUS_CONFIG).sort(
    ([, a], [, b]) => a.order - b.order
  ) as [ContentStatus, (typeof STATUS_CONFIG)[ContentStatus]][];

  return (
    <Popover>
      <PopoverTrigger className="inline-flex border-0 bg-transparent p-0 shadow-none outline-none">
        {badge}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {ordered.map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                key === status && "bg-accent/70"
              )}
              onClick={() => {
                onChange(key);
              }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: cfg.dotColor }}
              />
              <span>
                {cfg.emoji} {cfg.label}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
