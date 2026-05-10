"use client";

import { useMemo, useState, useEffect } from "react";
import { useContentStore } from "@/store/contentStore";
import type { ContentItem, PlannerFilters } from "@/lib/types";
import { FilterBar } from "@/components/shared/FilterBar";
import { ActiveFilterChips } from "@/components/shared/ActiveFilterChips";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { filterContentItems } from "@/lib/filterContent";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PillarTag } from "@/components/shared/PillarTag";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import { FORMAT_LABELS, PLATFORM_LABELS, PILLAR_CONFIG } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/material-icon";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { useContentStoreHydrated } from "@/hooks/useContentStoreHydrated";
import { usePlannerPermissions } from "@/hooks/usePlannerPermissions";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import {
  buildCalendarEvents,
  CALENDAR_EVENT_META,
  type CalendarMode,
} from "@/lib/calendarEvents";

export function CalendarPageClient() {
  const hydrated = useContentStoreHydrated();
  const { workspaceLoading, contentSyncedOnce } = useSupabaseApp();
  const items = useContentStore((s) => s.items);
  const updateStatus = useContentStore((s) => s.updateStatus);
  const deleteItem = useContentStore((s) => s.deleteItem);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("scheduled");
  const [filters, setFilters] = useState<PlannerFilters>({
    pillar: "all",
    platform: "all",
    status: "all",
    format: "all",
  });

  const { canDragCalendar, canChangeStatus, canDelete } = usePlannerPermissions();

  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const fn = () => {
      setNarrow(mq.matches);
      if (mq.matches) setView("list");
    };
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("cp-calendar-mode");
    if (
      saved === "planned" ||
      saved === "scheduled" ||
      saved === "workflow"
    ) {
      setCalendarMode(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cp-calendar-mode", calendarMode);
  }, [calendarMode]);

  const filtered = useMemo(
    () => filterContentItems(items, filters),
    [items, filters]
  );

  const events = useMemo(
    () => buildCalendarEvents(filtered, calendarMode),
    [filtered, calendarMode]
  );

  const monthFiltered = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    return events.filter((event) => {
      const d = new Date(event.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [events, month]);

  const listRows = useMemo(() => {
    if (calendarMode === "workflow") {
      return [...events]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((event) => ({
          key: event.id,
          item: event.item,
          date: event.date,
          kind: event.kind,
        }));
    }
    return [...events]
      .map((event) => event.item)
      .sort(
        (a, b) =>
          new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
      )
      .map((item) => ({
        key: item.id,
        item,
        date: item.publishDate,
        kind: "publish" as const,
      }));
  }, [events, calendarMode]);

  if (!hydrated || workspaceLoading || !contentSyncedOnce) {
    return (
      <div className="min-h-[min(60vh,420px)] py-8">
        <PageSpinner label="กำลังซิงค์ปฏิทิน…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ปฏิทินคอนเทนต์</h1>
          <p className="text-sm text-muted-foreground">
            ดูแผนตามวันโพสต์
            {canDragCalendar ? " · ลากย้ายวันได้ (มุมมองปฏิทิน)" : " · โหมดดูอย่างเดียวไม่สามารถลากหรือแก้ในตารางได้"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-md:hidden">
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={view === "calendar" ? "default" : "ghost"}
              className="h-8"
              onClick={() => setView("calendar")}
            >
              ปฏิทิน
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              className="h-8"
              onClick={() => setView("list")}
            >
              รายการ
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          options={["pillar", "platform", "status", "format"]}
        />
        <ActiveFilterChips filters={filters} onChange={setFilters} />
        <div className="inline-flex w-full max-w-xl flex-wrap rounded-lg border bg-muted p-1">
          <Button
            type="button"
            size="sm"
            variant={calendarMode === "planned" ? "default" : "ghost"}
            className="h-8 gap-1.5"
            onClick={() => setCalendarMode("planned")}
          >
            <MaterialIcon name="lightbulb" size={16} />
            วางแผน
          </Button>
          <Button
            type="button"
            size="sm"
            variant={calendarMode === "scheduled" ? "default" : "ghost"}
            className="h-8 gap-1.5"
            onClick={() => setCalendarMode("scheduled")}
          >
            <MaterialIcon name="schedule" size={16} />
            กำหนดลง
          </Button>
          <Button
            type="button"
            size="sm"
            variant={calendarMode === "workflow" ? "default" : "ghost"}
            className="h-8 gap-1.5"
            onClick={() => setCalendarMode("workflow")}
          >
            <MaterialIcon name="timeline" size={16} />
            Deadline Timeline
          </Button>
        </div>
      </div>

      {view === "calendar" && !narrow ? (
        <CalendarGrid
          events={monthFiltered}
          month={month}
          onMonthChange={setMonth}
          onOpenChip={setSelected}
          draggable={canDragCalendar && calendarMode !== "workflow"}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                {calendarMode === "workflow" ? (
                  <TableHead>Milestone</TableHead>
                ) : null}
                <TableHead>{calendarMode === "workflow" ? "Date" : "Publish"}</TableHead>
                <TableHead>Countdown</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listRows.map((row) => {
                const item = row.item;
                return (
                  <TableRow
                    key={row.key}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${PILLAR_CONFIG[item.pillar].color} 12%, var(--background))`,
                    }}
                  >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.id}
                  </TableCell>
                  <TableCell>
                    <PillarTag pillar={item.pillar} size="sm" />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {item.topic}
                  </TableCell>
                  <TableCell className="text-xs">
                    {FORMAT_LABELS[item.format]}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.platform.map((p) => PLATFORM_LABELS[p]).join(", ")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={item.status}
                      editable={canChangeStatus}
                      onChange={(st) => {
                        updateStatus(item.id, st);
                        toast.success(`อัปเดตเป็น ${st}`);
                      }}
                    />
                  </TableCell>
                  <TableCell>{item.owner}</TableCell>
                  {calendarMode === "workflow" ? (
                    <TableCell className="text-xs font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <MaterialIcon
                          name={CALENDAR_EVENT_META[row.kind].iconName}
                          size={14}
                          className="text-muted-foreground"
                        />
                        {CALENDAR_EVENT_META[row.kind].label}
                      </span>
                    </TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(row.date).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell>
                    <CountdownTimer targetDate={row.date} compact />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/briefs/${item.id}`}
                        aria-label="เปิดบรีฟ"
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "max-md:min-h-11 max-md:min-w-11"
                        )}
                      >
                        <MaterialIcon name="assignment" size={20} />
                      </Link>
                      <Link
                        href={`/performance/${item.id}`}
                        aria-label="ดูผลงาน"
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "max-md:min-h-11 max-md:min-w-11"
                        )}
                      >
                        <MaterialIcon name="bar_chart" size={20} />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`ลบ ${item.id}`}
                        disabled={!canDelete}
                        className="max-md:min-h-11 max-md:min-w-11"
                        onClick={() => {
                          deleteItem(item.id);
                          toast.success(`ลบ ${item.id}`, {
                            action: {
                              label: "เลิกทำ",
                              onClick: () =>
                                useContentStore.getState().undoDelete(),
                            },
                          });
                        }}
                      >
                        <MaterialIcon
                          name="delete"
                          size={20}
                          className="text-destructive"
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!listRows.length ? (
            <EmptyState
              compact
              icon="filter_alt_off"
              title="ไม่มีรายการตามตัวกรอง"
              description="ปรับตัวกรองด้านบนหรือสร้างบรีฟใหม่เพื่อวางแผนโพสต์"
              className="rounded-none border-0 border-t bg-transparent py-10 shadow-none"
            >
              <Link href="/briefs/new">
                <Button size="sm">สร้างบรีฟใหม่</Button>
              </Link>
            </EmptyState>
          ) : null}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-[480px]">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.id}
                  <span className="text-xs font-normal text-muted-foreground">
                    {FORMAT_LABELS[selected.format]} ·{" "}
                    {selected.platform.map((p) => PLATFORM_LABELS[p]).join(", ")}
                  </span>
                </SheetTitle>
              </SheetHeader>
              <PillarTag pillar={selected.pillar} />
              <div>
                <p className="text-sm font-semibold">{selected.topic}</p>
                <p className="text-xs text-muted-foreground">{selected.hook}</p>
              </div>
              <p className="text-xs">
                Owner: <strong>{selected.owner}</strong>
              </p>
              <p className="text-xs">
                Publish:{" "}
                {new Date(selected.publishDate).toLocaleString("th-TH")}
                {selected.publishTime ? ` · ${selected.publishTime}` : ""}
              </p>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Status
                </p>
                <StatusBadge
                  status={selected.status}
                  editable={canChangeStatus}
                  onChange={(st) => {
                    updateStatus(selected.id, st);
                    toast.success(`อัปเดตสถานะ`);
                    setSelected({ ...selected, status: st });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <CountdownTimer
                  label="Brief Due"
                  targetDate={new Date(selected.briefDeadline)}
                />
                <CountdownTimer
                  label="Production Due"
                  targetDate={new Date(selected.productionDeadline)}
                />
                <CountdownTimer
                  label="Approval Due"
                  targetDate={new Date(selected.approvalDeadline)}
                />
                <CountdownTimer
                  label="Publish"
                  targetDate={new Date(selected.publishDate)}
                />
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <Link
                  href={`/briefs/${selected.id}`}
                  className={cn(
                    buttonVariants({ className: "flex-1 gap-1.5" })
                  )}
                >
                  เปิดบรีฟเต็ม
                  <MaterialIcon name="open_in_new" size={16} />
                </Link>
                <Link
                  href={`/performance/${selected.id}`}
                  className={cn(
                    buttonVariants({ variant: "secondary", className: "flex-1" })
                  )}
                >
                  Performance
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
