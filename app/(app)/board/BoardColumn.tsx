"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export function BoardColumn({
  listId,
  label,
  count,
  children,
  idPrefix = "list",
  className,
}: {
  listId: string;
  label: string;
  count: number;
  children: React.ReactNode;
  idPrefix?: string;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${idPrefix}:${listId}` });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-h-[280px] rounded-xl border bg-muted/20 p-3",
        isOver && "ring-2 ring-primary/40",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
