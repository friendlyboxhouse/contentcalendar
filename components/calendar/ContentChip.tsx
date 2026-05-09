"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ContentItem } from "@/lib/types";
import { PILLAR_CONFIG, FORMAT_LABELS, PLATFORM_LABELS } from "@/lib/constants";
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

  const plat = item.platform
    .map((p) => PLATFORM_LABELS[p] ?? p)
    .slice(0, 2)
    .join(", ");

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
        "mb-1.5 cursor-pointer rounded-md border border-border bg-background px-2 py-1.5 text-left shadow-sm transition hover:shadow-md",
        draggable && "touch-none",
        "border-l-[4px]"
      )}
    >
      <div className="text-[10px] font-medium text-muted-foreground">{item.id}</div>
      <div className="line-clamp-2 text-xs font-medium leading-snug">
        {item.topic || "(ไม่มีหัวข้อ)"}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {FORMAT_LABELS[item.format]} · {plat}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={item.status} editable={false} />
        </span>
        <CountdownTimer targetDate={item.publishDate} compact />
      </div>
    </div>
  );
}
