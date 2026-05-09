"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
} from "date-fns";
import { th } from "date-fns/locale";
import type { ContentItem } from "@/lib/types";
import { CalendarDayCell } from "@/components/calendar/CalendarDayCell";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import Link from "next/link";
import { calculateDeadlines, resolveSLAKey } from "@/lib/utils";
import { useContentStore } from "@/store/contentStore";

export function CalendarGrid({
  items,
  month,
  onMonthChange,
  onOpenChip,
  draggable,
}: {
  items: ContentItem[];
  month: Date;
  onMonthChange: (d: Date) => void;
  onOpenChip: (item: ContentItem) => void;
  draggable: boolean;
}) {
  const updateItem = useContentStore((s) => s.updateItem);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || typeof over.id !== "string") return;
    const m = /^day-(\d{4}-\d{2}-\d{2})$/.exec(over.id);
    if (!m) return;
    const itemId = String(active.id);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const [yy, mm, dd] = m[1].split("-").map(Number);
    const nextPublish = new Date(yy, mm - 1, dd, 12, 0, 0);
    const slaKey = item.slaPresetKey ?? resolveSLAKey(item.format);
    const dl = calculateDeadlines(nextPublish, slaKey);
    updateItem(itemId, {
      publishDate: nextPublish,
      briefDeadline: dl.briefDeadline,
      productionDeadline: dl.productionDeadline,
      approvalDeadline: dl.approvalDeadline,
    });
  };

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const innerGrid = (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(subMonths(month, 1))}
            aria-label="เดือนก่อน"
          >
            <MaterialIcon name="chevron_left" size={20} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(month, 1))}
            aria-label="เดือนถัดไป"
          >
            <MaterialIcon name="chevron_right" size={20} />
          </Button>
          <span className="text-base font-semibold capitalize">
            {format(month, "MMMM yyyy", { locale: th })}
          </span>
        </div>
        <Link href="/briefs/new">
          <Button size="sm" type="button" className="gap-1">
            <MaterialIcon name="post_add" size={18} />
            สร้างบรีฟใหม่
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-7 border-l border-t bg-background">
        {weekdayLabels.map((w) => (
          <div
            key={w}
            className="border-r border-b bg-muted/50 px-2 py-2 text-center text-xs font-semibold text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {items.length === 0 ? (
          <div className="col-span-7 border-r border-b bg-background">
            <EmptyState
              compact
              icon="event_busy"
              title="ไม่มีโพสต์ในเดือนนี้"
              description="ลองเปลี่ยนเดือน ปรับตัวกรอง หรือสร้างบรีฟใหม่"
              className="rounded-none border-0 bg-transparent py-10 shadow-none"
            >
              <Link href="/briefs/new">
                <Button size="sm" type="button">
                  สร้างบรีฟใหม่
                </Button>
              </Link>
            </EmptyState>
          </div>
        ) : (
          days.map((day) => {
            const dayItems = items.filter((item) =>
              isSameDay(new Date(item.publishDate), day)
            );
            return (
              <CalendarDayCell
                key={format(day, "yyyy-MM-dd")}
                day={day}
                currentMonth={month}
                items={dayItems}
                onOpenChip={onOpenChip}
                draggable={draggable}
              />
            );
          })
        )}
      </div>
    </>
  );

  if (!draggable) {
    return <div>{innerGrid}</div>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {innerGrid}
    </DndContext>
  );
}
