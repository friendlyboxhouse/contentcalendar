"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useContentStore } from "@/store/contentStore";
import { useTaskStore } from "@/store/taskStore";
import type { ContentStatus, TaskItem } from "@/lib/types";
import { BoardColumn } from "./BoardColumn";
import { BoardCard } from "./BoardCard";
import { TaskQuickCreateDialog } from "./TaskQuickCreateDialog";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { toast } from "sonner";

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

export function BoardPageClient() {
  const { workspaceId } = useSupabaseApp();
  const { activeItems: lists } = useTaskLists();
  const { items: tasks } = useTasks();
  const contentItems = useContentStore((s) => s.items);
  const updateStatus = useContentStore((s) => s.updateStatus);
  const addTask = useTaskStore((s) => s.addItem);
  const updateTask = useTaskStore((s) => s.updateItem);
  const [createOpen, setCreateOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byList = useMemo(() => {
    const result = new Map<
      string,
      { tasks: TaskItem[]; content: typeof contentItems }
    >();
    for (const list of lists) {
      result.set(list.id, { tasks: [], content: [] });
    }
    for (const task of tasks) {
      const listId = task.list_id ?? lists[0]?.id;
      if (!listId) continue;
      result.get(listId)?.tasks.push(task);
    }
    for (const item of contentItems) {
      const slug = STATUS_TO_LIST_SLUG[item.status] ?? "todo";
      const list = lists.find((row) => row.slug === slug);
      if (list) result.get(list.id)?.content.push(item);
    }
    return result;
  }, [lists, tasks, contentItems]);

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    if (!overId.startsWith("list:")) return;
    const targetListId = overId.replace("list:", "");
    const targetList = lists.find((row) => row.id === targetListId);
    if (!targetList) return;

    if (activeId.startsWith("task:")) {
      const taskId = activeId.replace("task:", "");
      const task = tasks.find((entry) => entry.id === taskId);
      if (!task) return;
      if (task.list_id === targetList.id) return;
      updateTask(task.id, {
        list_id: targetList.id,
        position: Date.now(),
      });
      toast.success("ย้ายงานแล้ว");
      return;
    }

    if (activeId.startsWith("content:")) {
      const contentId = activeId.replace("content:", "");
      const item = contentItems.find((entry) => entry.id === contentId);
      if (!item) return;
      const nextStatus = LIST_SLUG_TO_STATUS[targetList.slug];
      if (!nextStatus || nextStatus === item.status) return;
      updateStatus(item.id, nextStatus);
      toast.success("ย้ายคอนเทนต์แล้ว");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Board"
        description="มุมมองแบบ Trello สำหรับงานทีมและคอนเทนต์ใน workspace เดียวกัน"
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            เพิ่มงาน
          </Button>
        }
      />

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {lists.map((list) => {
            const grouped = byList.get(list.id) ?? { tasks: [], content: [] };
            return (
              <BoardColumn
                key={list.id}
                listId={list.id}
                label={list.label}
                count={grouped.tasks.length + grouped.content.length}
              >
                {grouped.tasks.map((task) => (
                  <BoardCard key={`task-${task.id}`} kind="task" task={task} />
                ))}
                {grouped.content.map((item) => (
                  <BoardCard key={`content-${item.id}`} kind="content" item={item} />
                ))}
              </BoardColumn>
            );
          })}
        </div>
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
