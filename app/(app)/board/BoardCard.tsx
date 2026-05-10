"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ContentItem, TaskItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { buildUserInitials } from "@/lib/initials";
import { memberLabelFromUserId } from "@/lib/ownerMapping";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

type BoardCardProps =
  | { kind: "task"; task: TaskItem }
  | { kind: "content"; item: ContentItem };

export function BoardCard(props: BoardCardProps) {
  const { workspaceMembers } = useSupabaseApp();
  const memberById = new Map(workspaceMembers.map((m) => [m.user_id, m]));
  const id =
    props.kind === "task" ? `task:${props.task.id}` : `content:${props.item.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
    });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  const assignees =
    props.kind === "task"
      ? props.task.payload?.assignees ?? []
      : props.item.assignees ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border bg-card px-3 py-2 shadow-sm transition",
        "hover:bg-accent/30"
      )}
    >
      <p className="line-clamp-2 text-sm font-medium">
        {props.kind === "task" ? props.task.title : props.item.topic}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {props.kind === "task" ? (
          <>
            <span>Task</span>
            {props.task.due_at ? (
              <span>{new Date(props.task.due_at).toLocaleDateString("th-TH")}</span>
            ) : null}
          </>
        ) : (
          <>
            <span>{props.item.topic || props.item.id}</span>
            <StatusBadge status={props.item.status} />
          </>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {assignees.slice(0, 4).map((entry) => {
          const member = memberById.get(entry.userId);
          return (
            <Avatar
              key={`${entry.userId}:${entry.roleId}`}
              fallback={buildUserInitials(
                member?.display_name ?? null,
                member?.email ?? null
              )}
              className="h-6 w-6 text-[10px]"
              title={memberLabelFromUserId(entry.userId, workspaceMembers)}
            />
          );
        })}
      </div>
    </div>
  );
}
