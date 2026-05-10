"use client";

import type { CalendarEvent } from "@/lib/calendarEvents";
import { CALENDAR_EVENT_META } from "@/lib/calendarEvents";
import { MaterialIcon } from "@/components/ui/material-icon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PILLAR_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MilestoneChip({
  event,
  onOpen,
}: {
  event: CalendarEvent;
  onOpen: (event: CalendarEvent) => void;
}) {
  const pillarColor = PILLAR_CONFIG[event.item.pillar].color;
  const meta = CALENDAR_EVENT_META[event.kind];

  return (
    <button
      type="button"
      className={cn(
        "mb-1.5 flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-left shadow-sm transition-colors hover:bg-accent/40"
      )}
      style={{ borderLeft: `3px solid ${pillarColor}` }}
      onClick={() => onOpen(event)}
      title={`${meta.label}: ${event.item.topic}`}
    >
      <MaterialIcon
        name={meta.iconName}
        size={13}
        className="shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-snug">
        {event.item.topic || "(ไม่มีหัวข้อ)"}
      </span>
      <StatusBadge
        status={event.item.status}
        editable={false}
        className="min-h-5 gap-1 px-1.5 py-0 text-[10px]"
      />
    </button>
  );
}
