"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ContentItem } from "@/lib/types";
import { PILLAR_CONFIG, FORMAT_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import { cn } from "@/lib/utils";

export function ContentChip({
  item,
  draggable,
  onOpen,
}: {
  item: ContentItem;
  draggable?: boolean;
  onOpen: (item: ContentItem) => void;
}) {
  const pillarColor = PILLAR_CONFIG[item.pillar].color;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      disabled: !draggable,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
    borderLeftColor: pillarColor,
  };

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(item);
      }}
      style={style}
      className={cn(
        "mb-1.5 cursor-pointer rounded-lg border border-border bg-card px-2 py-2 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-px",
        draggable && "touch-none",
        "border-l-[3px]"
      )}
    >
      {/* Topic — min text-xs */}
      <div className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
        {item.topic || "(ไม่มีหัวข้อ)"}
      </div>
      {/* Format */}
      <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
        {FORMAT_LABELS[item.format]}
      </div>
      {/* Status + countdown row */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={item.status} editable={false} />
        </span>
        <CountdownTimer targetDate={item.publishDate} compact />
      </div>
    </div>
  );
}
