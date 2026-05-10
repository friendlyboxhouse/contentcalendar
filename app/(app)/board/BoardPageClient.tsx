"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useContentStore } from "@/store/contentStore";
import { useTaskStore } from "@/store/taskStore";
import type { ContentStatus, TaskItem } from "@/lib/types";
import { BoardColumn } from "./BoardColumn";
import { BoardCard } from "./BoardCard";
import { MilestoneBoardCard } from "./MilestoneBoardCard";
import { TaskQuickCreateDialog } from "./TaskQuickCreateDialog";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildCalendarEvents,
  getMilestoneStatus,
  type CalendarEventKind,
} from "@/lib/calendarEvents";

// ─── Simple mode: 4 slugs from task_lists ───────────────────────────────────

const STATUS_TO_LIST_SLUG: Record<ContentStatus, string> = {
  idea: "todo",
  in_brief: "todo",
  in_production: "in_progress",
  in_review: "review",
  revision: "review",
  pending_approval: "review",
  approved: "review",
  scheduled: "in_progress",
  published: "done",
  kpi_pending: "done",
};

const LIST_SLUG_TO_STATUS: Record<string, ContentStatus> = {
  todo: "in_brief",
  in_progress: "in_production",
  review: "in_review",
  done: "published",
};

// ─── All Status mode: ordered content statuses ───────────────────────────────

const ALL_CONTENT_STATUSES: { status: ContentStatus; label: string }[] = [
  { status: "idea", label: "Idea" },
  { status: "in_brief", label: "In Brief" },
  { status: "in_production", label: "In Production" },
  { status: "in_review", label: "In Review" },
  { status: "revision", label: "Revision" },
  { status: "pending_approval", label: "Pending Approval" },
  { status: "approved", label: "Approved" },
  { status: "scheduled", label: "Scheduled" },
  { status: "published", label: "Published" },
  { status: "kpi_pending", label: "KPI Pending" },
];

type BoardMode = "simple" | "all_status";

const BOARD_MODE_KEY = "cp-board-mode";

export function BoardPageClient() {
  const { workspaceId } = useSupabaseApp();
  const { activeItems: lists } = useTaskLists();
  const { items: tasks } = useTasks();
  const contentItems = useContentStore((s) => s.items);
  const updateMilestoneStatus = useContentStore((s) => s.updateMilestoneStatus);
  const addTask = useTaskStore((s) => s.addItem);
  const updateTask = useTaskStore((s) => s.updateItem);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [boardMode, setBoardMode] = useState<BoardMode>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(BOARD_MODE_KEY);
      if (stored === "all_status") return "all_status";
    }
    return "simple";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOARD_MODE_KEY, boardMode);
    }
  }, [boardMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Workflow milestone events for content items
  const milestoneEvents = useMemo(
    () => buildCalendarEvents(contentItems, "workflow"),
    [contentItems]
  );

  // Search filter
  const searchLower = search.toLowerCase();
  const filteredTasks = useMemo(
    () =>
      search
        ? tasks.filter((t) => t.title.toLowerCase().includes(searchLower))
        : tasks,
    [tasks, search, searchLower]
  );
  const filteredMilestones = useMemo(
    () =>
      search
        ? milestoneEvents.filter(
            (e) =>
              e.item.topic.toLowerCase().includes(searchLower) ||
              e.item.id.toLowerCase().includes(searchLower)
          )
        : milestoneEvents,
    [milestoneEvents, search, searchLower]
  );

  // ─── Build columns for Simple mode ─────────────────────────────────────────
  const simpleColumns = useMemo(() => {
    const result = new Map<
      string,
      { list: (typeof lists)[0]; tasks: TaskItem[]; milestones: typeof milestoneEvents }
    >();
    for (const list of lists) {
      result.set(list.id, { list, tasks: [], milestones: [] });
    }
    for (const task of filteredTasks) {
      const listId = task.list_id ?? lists[0]?.id;
      if (!listId) continue;
      result.get(listId)?.tasks.push(task);
    }
    for (const ev of filteredMilestones) {
      const milestoneStatus = getMilestoneStatus(ev.item, ev.kind);
      const slug = STATUS_TO_LIST_SLUG[milestoneStatus] ?? "todo";
      const list = lists.find((r) => r.slug === slug);
      if (list) result.get(list.id)?.milestones.push(ev);
    }
    return result;
  }, [lists, filteredTasks, filteredMilestones]);

  // ─── Build columns for All Status mode ─────────────────────────────────────
  const allStatusColumns = useMemo(() => {
    const result = new Map<
      ContentStatus,
      { tasks: TaskItem[]; milestones: typeof milestoneEvents }
    >();
    for (const { status } of ALL_CONTENT_STATUSES) {
      result.set(status, { tasks: [], milestones: [] });
    }
    // Tasks: use status mapped from their list slug, else first status
    for (const task of filteredTasks) {
      const list = lists.find((l) => l.id === task.list_id);
      const status: ContentStatus =
        (list ? LIST_SLUG_TO_STATUS[list.slug] : undefined) ?? "idea";
      result.get(status)?.tasks.push(task);
    }
    for (const ev of filteredMilestones) {
      const milestoneStatus = getMilestoneStatus(ev.item, ev.kind);
      result.get(milestoneStatus)?.milestones.push(ev);
    }
    return result;
  }, [lists, filteredTasks, filteredMilestones]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = String(event.over?.id ?? "");
      if (!overId) return;

      // ─── Simple mode drag ──────────────────────────────────────────────────
      if (boardMode === "simple") {
        if (!overId.startsWith("list:")) return;
        const targetListId = overId.replace("list:", "");
        const targetList = lists.find((r) => r.id === targetListId);
        if (!targetList) return;

        if (activeId.startsWith("task:")) {
          const taskId = activeId.replace("task:", "");
          const task = tasks.find((t) => t.id === taskId);
          if (!task || task.list_id === targetList.id) return;
          updateTask(task.id, { list_id: targetList.id, position: Date.now() });
          toast.success("ย้ายงานแล้ว");
          return;
        }

        if (activeId.startsWith("milestone:")) {
          const [, contentId, kind] = activeId.split(":");
          const nextStatus = LIST_SLUG_TO_STATUS[targetList.slug];
          if (!nextStatus) return;
          updateMilestoneStatus(contentId, kind as CalendarEventKind, nextStatus);
          toast.success("อัปเดตสถานะ milestone แล้ว");
          return;
        }
      }

      // ─── All Status mode drag ──────────────────────────────────────────────
      if (boardMode === "all_status") {
        if (!overId.startsWith("status:")) return;
        const targetStatus = overId.replace("status:", "") as ContentStatus;

        if (activeId.startsWith("task:")) {
          const taskId = activeId.replace("task:", "");
          const task = tasks.find((t) => t.id === taskId);
          if (!task) return;
          const targetList = lists.find(
            (l) => LIST_SLUG_TO_STATUS[l.slug] === targetStatus
          );
          if (!targetList || task.list_id === targetList.id) return;
          updateTask(task.id, { list_id: targetList.id, position: Date.now() });
          toast.success("ย้ายงานแล้ว");
          return;
        }

        if (activeId.startsWith("milestone:")) {
          const [, contentId, kind] = activeId.split(":");
          const curStatus = getMilestoneStatus(
            contentItems.find((i) => i.id === contentId)!,
            kind as CalendarEventKind
          );
          if (curStatus === targetStatus) return;
          updateMilestoneStatus(contentId, kind as CalendarEventKind, targetStatus);
          toast.success("อัปเดตสถานะ milestone แล้ว");
          return;
        }
      }
    },
    [boardMode, lists, tasks, contentItems, updateTask, updateMilestoneStatus]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Board"
        description="มุมมองแบบ Trello สำหรับงานทีมและ Deadline Timeline ของคอนเทนต์"
        actions={
          <div className="flex items-center gap-2">
            {/* Search */}
            <Input
              className="h-8 w-40 text-sm"
              placeholder="ค้นหา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* Mode toggle */}
            <div className="flex rounded-lg border text-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setBoardMode("simple")}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  boardMode === "simple"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                Simple
              </button>
              <button
                type="button"
                onClick={() => setBoardMode("all_status")}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  boardMode === "all_status"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                All Status
              </button>
            </div>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              เพิ่มงาน
            </Button>
          </div>
        }
      />

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {boardMode === "simple" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {lists.map((list) => {
              const grouped = simpleColumns.get(list.id) ?? {
                tasks: [],
                milestones: [],
              };
              return (
                <BoardColumn
                  key={list.id}
                  listId={list.id}
                  label={list.label}
                  count={grouped.tasks.length + grouped.milestones.length}
                >
                  {grouped.tasks.map((task) => (
                    <BoardCard key={`task-${task.id}`} kind="task" task={task} />
                  ))}
                  {grouped.milestones.map((ev) => (
                    <MilestoneBoardCard key={ev.id} event={ev} />
                  ))}
                </BoardColumn>
              );
            })}
          </div>
        ) : (
          // All Status — horizontal scroll
          <div className="flex gap-3 overflow-x-auto pb-4">
            {ALL_CONTENT_STATUSES.map(({ status, label }) => {
              const grouped = allStatusColumns.get(status) ?? {
                tasks: [],
                milestones: [],
              };
              return (
                <BoardColumn
                  key={status}
                  listId={status}
                  label={label}
                  count={grouped.tasks.length + grouped.milestones.length}
                  idPrefix="status"
                  className="min-w-[240px] shrink-0"
                >
                  {grouped.tasks.map((task) => (
                    <BoardCard key={`task-${task.id}`} kind="task" task={task} />
                  ))}
                  {grouped.milestones.map((ev) => (
                    <MilestoneBoardCard key={ev.id} event={ev} />
                  ))}
                </BoardColumn>
              );
            })}
          </div>
        )}
      </DndContext>

      {workspaceId ? (
        <TaskQuickCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaceId={workspaceId}
          onCreate={(item) => addTask(item)}
        />
      ) : null}
    </div>
  );
}
