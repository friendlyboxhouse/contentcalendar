"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CalendarEvent } from "@/lib/calendarEvents";
import { CALENDAR_EVENT_META } from "@/lib/calendarEvents";
import { MaterialIcon } from "@/components/ui/material-icon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PILLAR_CONFIG } from "@/lib/constants";
import type { ContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export function MilestoneChip({
  event,
  onOpen,
  editable = false,
  draggable = false,
  onStatusChange,
  onDoneToggle,
}: {
  event: CalendarEvent;
  onOpen: (event: CalendarEvent) => void;
  editable?: boolean;
  draggable?: boolean;
  onStatusChange?: (status: ContentStatus) => void;
  onDoneToggle?: (checked: boolean) => void;
}) {
  const pillarColor = PILLAR_CONFIG[event.item.pillar].color;
  const meta = CALENDAR_EVENT_META[event.kind];
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: event.id,
      disabled: !draggable,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      type="button"
      className={cn(
        "mb-1.5 flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-left shadow-sm transition-colors hover:bg-accent/40",
        draggable && "touch-none"
      )}
      style={{ ...style, borderLeft: `3px solid ${pillarColor}` }}
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
      <span
        className="inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={event.done}
          disabled={!editable}
          onCheckedChange={(checked) => onDoneToggle?.(checked === true)}
          aria-label={`mark ${meta.label} done`}
        />
        <StatusBadge
          status={event.status}
          editable={editable}
          onChange={onStatusChange}
          className="min-h-5 gap-1 px-1.5 py-0 text-[10px]"
        />
      </span>
    </button>
  );
}
