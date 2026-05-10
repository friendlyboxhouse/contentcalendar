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

/**
 * Tailwind-class pairs per status — supports dark mode automatically.
 * Both bg and text are mapped so inline style overrides aren't needed.
 */
const STATUS_BADGE_CLASSES: Record<ContentStatus, string> = {
  idea: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
  in_brief:
    "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_production:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  in_review:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  revision:
    "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  pending_approval:
    "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved:
    "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  scheduled:
    "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  published:
    "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  kpi_pending:
    "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export function StatusBadge({
  status,
  editable,
  onChange,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const badgeClass = STATUS_BADGE_CLASSES[status] ?? "";

  const badge = (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        badgeClass,
        editable && "cursor-pointer hover:opacity-90",
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: config.dotColor }}
      />
      <MaterialIcon name={config.iconName} size={13} className="shrink-0" />
      {config.label}
      {editable ? (
        <MaterialIcon name="expand_more" size={14} className="opacity-60" />
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
                "flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                key === status && "bg-accent/70 font-medium"
              )}
              onClick={() => onChange(key)}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: cfg.dotColor }}
              />
              <MaterialIcon
                name={cfg.iconName}
                size={14}
                className="shrink-0 text-muted-foreground"
              />
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
