"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/lib/types";
import { ContentChip } from "@/components/calendar/ContentChip";
import { isSameMonth } from "date-fns";

export function CalendarDayCell({
  day,
  currentMonth,
  items,
  onOpenChip,
  draggable,
}: {
  day: Date;
  currentMonth: Date;
  items: ContentItem[];
  onOpenChip: (item: ContentItem) => void;
  draggable: boolean;
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
        {items.map((item) => (
          <ContentChip
            key={item.id}
            item={item}
            draggable={draggable}
            onOpen={onOpenChip}
          />
        ))}
      </div>
    </div>
  );
}
