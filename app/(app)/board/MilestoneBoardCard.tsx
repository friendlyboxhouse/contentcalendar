"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MaterialIcon } from "@/components/ui/material-icon";
import { CALENDAR_EVENT_META, type CalendarEvent } from "@/lib/calendarEvents";

interface MilestoneBoardCardProps {
  event: CalendarEvent;
}

export function MilestoneBoardCard({ event }: MilestoneBoardCardProps) {
  const id = `milestone:${event.item.id}:${event.kind}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  const meta = CALENDAR_EVENT_META[event.kind];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border bg-card px-3 py-2 shadow-sm transition",
        "hover:bg-accent/30",
        event.done && "opacity-60"
      )}
    >
      <p className="line-clamp-2 text-sm font-medium leading-snug">
        {event.item.topic || event.item.id}
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MaterialIcon
          name={meta.iconName}
          size={12}
          className="shrink-0 text-muted-foreground"
        />
        <span className="shrink-0 font-medium text-foreground/70">
          {meta.label}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={event.status} />
        <span className="text-xs text-muted-foreground">
          {new Date(event.date).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
          })}
        </span>
        {event.done ? (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            Done
          </span>
        ) : null}
      </div>
    </div>
  );
}
