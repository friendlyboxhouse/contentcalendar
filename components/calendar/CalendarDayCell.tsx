"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ContentItem, ContentStatus } from "@/lib/types";
import { ContentChip } from "@/components/calendar/ContentChip";
import { MilestoneChip } from "@/components/calendar/MilestoneChip";
import type { CalendarEvent, CalendarEventKind } from "@/lib/calendarEvents";
import { isSameMonth } from "date-fns";

export function CalendarDayCell({
  day,
  currentMonth,
  events,
  onOpenChip,
  draggable,
  workflowMode = false,
  milestoneDraggable = false,
  milestoneEditable = false,
  onMilestoneStatusChange,
  onMilestoneDoneToggle,
}: {
  day: Date;
  currentMonth: Date;
  events: CalendarEvent[];
  onOpenChip: (item: ContentItem) => void;
  draggable: boolean;
  workflowMode?: boolean;
  milestoneDraggable?: boolean;
  milestoneEditable?: boolean;
  onMilestoneStatusChange?: (
    itemId: string,
    kind: CalendarEventKind,
    status: ContentStatus
  ) => void;
  onMilestoneDoneToggle?: (
    itemId: string,
    kind: CalendarEventKind,
    checked: boolean
  ) => void;
}) {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const dateKey = `${y}-${m}-${d}`;
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}` });

  const inMonth = isSameMonth(day, currentMonth);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[112px] border-r border-b p-1 max-md:min-h-[100px]",
        !inMonth && "bg-muted/30 opacity-60",
        isOver && "bg-primary/5 ring-1 ring-primary/30 ring-inset"
      )}
    >
      <div
        className={cn(
          "mb-1 flex justify-end text-xs font-medium tabular-nums",
          inMonth ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {day.getDate()}
      </div>
      <div className="flex flex-col gap-0">
        {events.map((event) =>
          event.kind === "publish" && !workflowMode ? (
            <ContentChip
              key={event.id}
              item={event.item}
              draggable={draggable}
              onOpen={onOpenChip}
            />
          ) : (
            <MilestoneChip
              key={event.id}
              event={event}
              draggable={milestoneDraggable}
              editable={milestoneEditable}
              onStatusChange={(status) =>
                onMilestoneStatusChange?.(event.item.id, event.kind, status)
              }
              onDoneToggle={(checked) =>
                onMilestoneDoneToggle?.(event.item.id, event.kind, checked)
              }
              onOpen={(selectedEvent) => onOpenChip(selectedEvent.item)}
            />
          )
        )}
      </div>
    </div>
  );
}
