import type { ContentItem, ContentStatus } from "@/lib/types";
import { calculateDeadlines, resolveSLAKey } from "@/lib/utils";

export type CalendarMode = "planned" | "scheduled" | "workflow";

export type CalendarEventKind =
  | "brief"
  | "briefApprove"
  | "production"
  | "review"
  | "mgmtApprove"
  | "publish";

export interface CalendarEvent {
  id: string;
  item: ContentItem;
  date: Date;
  kind: CalendarEventKind;
}

export const CALENDAR_EVENT_META: Record<
  CalendarEventKind,
  { label: string; iconName: string }
> = {
  brief: { label: "Brief Due", iconName: "edit_note" },
  briefApprove: { label: "Approve Brief", iconName: "check_circle" },
  production: { label: "Production Done", iconName: "palette" },
  review: { label: "Internal Review", iconName: "search" },
  mgmtApprove: { label: "Mgmt Approve", iconName: "hourglass" },
  publish: { label: "Publish", iconName: "rocket" },
};

const PLANNED_STATUSES = new Set<ContentStatus>([
  "idea",
  "in_brief",
  "in_production",
  "in_review",
  "revision",
  "pending_approval",
  "approved",
]);

const SCHEDULED_STATUSES = new Set<ContentStatus>([
  "scheduled",
  "published",
  "kpi_pending",
]);

function createWorkflowEvents(item: ContentItem): CalendarEvent[] {
  const slaKey = item.slaPresetKey ?? resolveSLAKey(item.format);
  const deadlines = calculateDeadlines(new Date(item.publishDate), slaKey);
  return [
    { id: `${item.id}:brief`, item, kind: "brief", date: deadlines.briefDeadline },
    {
      id: `${item.id}:briefApprove`,
      item,
      kind: "briefApprove",
      date: deadlines.briefApprovalDeadline,
    },
    {
      id: `${item.id}:production`,
      item,
      kind: "production",
      date: deadlines.productionDeadline,
    },
    { id: `${item.id}:review`, item, kind: "review", date: deadlines.reviewDeadline },
    {
      id: `${item.id}:mgmtApprove`,
      item,
      kind: "mgmtApprove",
      date: deadlines.approvalDeadline,
    },
    { id: `${item.id}:publish`, item, kind: "publish", date: new Date(item.publishDate) },
  ];
}

function statusInMode(status: ContentStatus, mode: CalendarMode): boolean {
  if (mode === "planned") return PLANNED_STATUSES.has(status);
  if (mode === "scheduled") return SCHEDULED_STATUSES.has(status);
  return true;
}

export function buildCalendarEvents(
  items: ContentItem[],
  mode: CalendarMode
): CalendarEvent[] {
  if (mode === "workflow") {
    return items.flatMap(createWorkflowEvents);
  }

  return items
    .filter((item) => statusInMode(item.status, mode))
    .map((item) => ({
      id: `${item.id}:publish`,
      item,
      kind: "publish" as const,
      date: new Date(item.publishDate),
    }));
}
