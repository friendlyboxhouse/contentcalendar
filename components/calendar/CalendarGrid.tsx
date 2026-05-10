"use client";

import { useMemo } from "react";
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
} from "date-fns";
import { th } from "date-fns/locale";
import type { ContentItem, MilestoneKind } from "@/lib/types";
import { CalendarDayCell } from "@/components/calendar/CalendarDayCell";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import Link from "next/link";
import { calculateDeadlines, resolveSLAKey } from "@/lib/utils";
import { useContentStore } from "@/store/contentStore";
import { toast } from "sonner";
import type {
  CalendarEvent,
  CalendarEventKind,
} from "@/lib/calendarEvents";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarGrid({
  events,
  month,
  onMonthChange,
  onOpenChip,
  draggable,
  workflowMode = false,
  canEditMilestones = false,
}: {
  events: CalendarEvent[];
  month: Date;
  onMonthChange: (d: Date) => void;
  onOpenChip: (item: ContentItem) => void;
  draggable: boolean;
  workflowMode?: boolean;
  canEditMilestones?: boolean;
}) {
  const updateItem = useContentStore((s) => s.updateItem);
  const shiftMilestonesFrom = useContentStore((s) => s.shiftMilestonesFrom);
  const updateMilestoneStatus = useContentStore((s) => s.updateMilestoneStatus);
  const toggleMilestoneDone = useContentStore((s) => s.toggleMilestoneDone);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

  // Build O(n) map from day-key → items, instead of O(n*m) filter per cell.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = dayKey(new Date(event.date));
      const arr = map.get(key) ?? [];
      arr.push(event);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent;
    if (!over || typeof over.id !== "string") return;
    const m = /^day-(\d{4}-\d{2}-\d{2})$/.exec(over.id);
    if (!m) return;
    const activeId = String(active.id);
    const [yy, mm, dd] = m[1].split("-").map(Number);
    const nextPublish = new Date(yy, mm - 1, dd, 12, 0, 0);
    const milestoneEvent = events.find((entry) => entry.id === activeId);

    if (workflowMode && milestoneEvent && canEditMilestones) {
      const prev = new Date(milestoneEvent.date);
      const sameDay =
        nextPublish.getFullYear() === prev.getFullYear() &&
        nextPublish.getMonth() === prev.getMonth() &&
        nextPublish.getDate() === prev.getDate();
      if (sameDay) return;

      const dayDelta = Math.round(
        (nextPublish.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Ask BEFORE writing — cancel is then a true no-op
      const answer = window.prompt(
        "ต้องการย้าย milestone นี้อย่างไร?\n1 = ย้ายพร้อมขยับ milestone ถัดไปทั้งหมด\n2 = ย้ายเฉพาะ milestone นี้\n0 = ยกเลิก",
        "2"
      );

      if (!answer || answer === "0") {
        toast.message("ยกเลิกการย้ายวัน");
        return;
      }

      // Single atomic write — source always moves; cascade depends on answer
      shiftMilestonesFrom(
        milestoneEvent.item.id,
        milestoneEvent.kind as MilestoneKind,
        nextPublish,
        dayDelta,
        answer === "1" ? "following" : "single"
      );

      if (answer === "1") {
        toast.success("ย้ายวันและขยับ milestone ถัดไปแล้ว");
      } else {
        toast.success("ย้ายเฉพาะ milestone นี้แล้ว");
      }
      return;
    }

    const itemId = activeId;
    const publishEvent = events.find(
      (entry) => entry.kind === "publish" && entry.item.id === itemId
    );
    const item = publishEvent?.item;
    if (!item) return;
    // No-op: same day
    const sameDay =
      nextPublish.getFullYear() === new Date(item.publishDate).getFullYear() &&
      nextPublish.getMonth() === new Date(item.publishDate).getMonth() &&
      nextPublish.getDate() === new Date(item.publishDate).getDate();
    if (sameDay) return;
    const slaKey = item.slaPresetKey ?? resolveSLAKey(item.format);
    const dl = calculateDeadlines(nextPublish, slaKey);
    updateItem(itemId, {
      publishDate: nextPublish,
      briefDeadline: dl.briefDeadline,
      productionDeadline: dl.productionDeadline,
      approvalDeadline: dl.approvalDeadline,
    });
    toast.success(
      `ย้าย ${item.id} ไป ${nextPublish.toLocaleDateString("th-TH")}`,
      { duration: 2500 }
    );
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onMonthChange(new Date())}
          >
            วันนี้
          </Button>
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
        {events.length === 0 ? (
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
            const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
            return (
              <CalendarDayCell
                key={format(day, "yyyy-MM-dd")}
                day={day}
                currentMonth={month}
                events={dayEvents}
                onOpenChip={onOpenChip}
                draggable={draggable}
                workflowMode={workflowMode}
                milestoneDraggable={workflowMode && canEditMilestones}
                milestoneEditable={canEditMilestones}
                onMilestoneStatusChange={(
                  itemId: string,
                  kind: CalendarEventKind,
                  status
                ) => {
                  updateMilestoneStatus(itemId, kind as MilestoneKind, status);
                  toast.success(`อัปเดต milestone เป็น ${status}`);
                }}
                onMilestoneDoneToggle={(
                  itemId: string,
                  kind: CalendarEventKind,
                  checked
                ) => {
                  toggleMilestoneDone(itemId, kind as MilestoneKind, checked);
                  toast.success(
                    checked ? "ทำเครื่องหมาย milestone ว่าเสร็จแล้ว" : "ยกเลิกสถานะเสร็จแล้ว"
                  );
                }}
              />
            );
          })
        )}
      </div>
    </>
  );

  if (!draggable && !(workflowMode && canEditMilestones)) {
    return <div>{innerGrid}</div>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {innerGrid}
    </DndContext>
  );
}
