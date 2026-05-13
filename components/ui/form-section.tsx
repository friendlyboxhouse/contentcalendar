"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { MaterialIcon } from "@/components/ui/material-icon";

type Tone = "default" | "accent" | "warning";

type FormSectionProps = {
  icon: string;
  title: string;
  description?: string;
  badge?: string;
  tone?: Tone;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  requiredHint?: string;
  children: React.ReactNode;
  className?: string;
};

const toneIcon: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const toneBorder: Record<Tone, string> = {
  default: "border-border/70",
  accent: "border-emerald-500/20",
  warning: "border-amber-500/20",
};

export function FormSection({
  icon,
  title,
  description,
  badge,
  tone = "default",
  defaultOpen = false,
  open,
  onOpenChange,
  requiredHint,
  children,
  className,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const controlled = open !== undefined;
  const resolvedOpen = controlled ? open : isOpen;

  const handleChange = (next: boolean) => {
    if (!controlled) setIsOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Collapsible
      open={resolvedOpen}
      onOpenChange={handleChange}
      className={cn("rounded-2xl border bg-card shadow-sm", toneBorder[tone], className)}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            toneIcon[tone]
          )}
        >
          <MaterialIcon name={icon} size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium leading-tight">{title}</span>
            {badge && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                {badge}
              </span>
            )}
          </div>
          {description && !resolvedOpen && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          )}
          {requiredHint && !resolvedOpen && (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">{requiredHint}</p>
          )}
        </div>

        <MaterialIcon
          name="expand_more"
          size={20}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            resolvedOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}
