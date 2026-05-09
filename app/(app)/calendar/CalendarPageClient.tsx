"use client";

import { useMemo, useState, useEffect } from "react";
import { useContentStore } from "@/store/contentStore";
import type { ContentItem, PlannerFilters } from "@/lib/types";
import { FilterBar } from "@/components/shared/FilterBar";
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
import { Trash2, ExternalLink, BarChart3, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export function CalendarPageClient() {
  const items = useContentStore((s) => s.items);
  const updateStatus = useContentStore((s) => s.updateStatus);
  const deleteItem = useContentStore((s) => s.deleteItem);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filters, setFilters] = useState<PlannerFilters>({
    pillar: "all",
    platform: "all",
    status: "all",
    format: "all",
  });

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

  const filtered = useMemo(
    () => filterContentItems(items, filters),
    [items, filters]
  );

  const monthFiltered = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    return filtered.filter((item) => {
      const d = new Date(item.publishDate);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [filtered, month]);

  const listSorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(a.publishDate).getTime() -
          new Date(b.publishDate).getTime()
      ),
    [filtered]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-sm text-muted-foreground">
            ดูแผนตามวันโพสต์ · ลากย้ายวันได้ (มุมมองปฏิทิน)
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
              Calendar
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              className="h-8"
              onClick={() => setView("list")}
            >
              List
            </Button>
          </div>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        options={["pillar", "platform", "status", "format"]}
      />

      {view === "calendar" && !narrow ? (
        <CalendarGrid
          items={monthFiltered}
          month={month}
          onMonthChange={setMonth}
          onOpenChip={setSelected}
          draggable
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
                <TableHead>Publish</TableHead>
                <TableHead>Countdown</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listSorted.map((item) => (
                <TableRow
                  key={item.id}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${PILLAR_CONFIG[item.pillar].bgColor} 45%, transparent)`,
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
                      editable
                      onChange={(st) => {
                        updateStatus(item.id, st);
                        toast.success(`อัปเดตเป็น ${st}`);
                      }}
                    />
                  </TableCell>
                  <TableCell>{item.owner}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(item.publishDate).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell>
                    <CountdownTimer targetDate={item.publishDate} compact />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/briefs/${item.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" })
                        )}
                      >
                        <ClipboardList className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/performance/${item.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" })
                        )}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          deleteItem(item.id);
                          toast.success(`ลบ ${item.id}`, {
                            action: {
                              label: "Undo",
                              onClick: () =>
                                useContentStore.getState().undoDelete(),
                            },
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!listSorted.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              ไม่มีโพสต์ในตัวกรองนี้ —{" "}
              <Link href="/briefs/new" className="underline">
                สร้าง Brief ใหม่
              </Link>
            </p>
          )}
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
                  editable
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
                  className={cn(buttonVariants({ className: "flex-1" }))}
                >
                  Open Full Brief <ExternalLink className="ml-1 h-3 w-3" />
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
