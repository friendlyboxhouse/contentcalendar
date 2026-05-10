import type {
  ContentItem,
  ContentStatus,
  MilestoneKind,
  MilestoneStateEntry,
} from "@/lib/types";
import { calculateDeadlines, resolveSLAKey } from "@/lib/utils";

export type CalendarMode = "planned" | "scheduled" | "workflow";

export type CalendarEventKind = MilestoneKind;

export const WORKFLOW_MILESTONE_KINDS: CalendarEventKind[] = [
  "brief",
  "briefApprove",
  "production",
  "review",
  "mgmtApprove",
  "publish",
];

export interface CalendarEvent {
  id: string;
  item: ContentItem;
  date: Date;
  recommendedDate: Date;
  dateOverridden: boolean;
  status: ContentStatus;
  done: boolean;
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

const DEFAULT_MILESTONE_STATUS: Record<CalendarEventKind, ContentStatus> = {
  brief: "in_brief",
  briefApprove: "pending_approval",
  production: "in_production",
  review: "in_review",
  mgmtApprove: "pending_approval",
  publish: "scheduled",
};

function getMilestoneStateEntry(
  item: ContentItem,
  kind: CalendarEventKind
): MilestoneStateEntry | undefined {
  return item.milestoneState?.[kind];
}

export function getRecommendedMilestoneDates(
  item: ContentItem
): Record<CalendarEventKind, Date> {
  const slaKey = item.slaPresetKey ?? resolveSLAKey(item.format);
  const deadlines = calculateDeadlines(new Date(item.publishDate), slaKey);
  return {
    brief: deadlines.briefDeadline,
    briefApprove: deadlines.briefApprovalDeadline,
    production: deadlines.productionDeadline,
    review: deadlines.reviewDeadline,
    mgmtApprove: deadlines.approvalDeadline,
    publish: new Date(item.publishDate),
  };
}

export function getMilestoneEffectiveDate(
  item: ContentItem,
  kind: CalendarEventKind
): Date {
  const recommended = getRecommendedMilestoneDates(item)[kind];
  const override = getMilestoneStateEntry(item, kind)?.dateOverride;
  return override ? new Date(override) : new Date(recommended);
}

export function getMilestoneStatus(
  item: ContentItem,
  kind: CalendarEventKind
): ContentStatus {
  return (
    getMilestoneStateEntry(item, kind)?.status ??
    item.status ??
    DEFAULT_MILESTONE_STATUS[kind]
  );
}

export function getMilestoneDone(
  item: ContentItem,
  kind: CalendarEventKind
): boolean {
  return Boolean(getMilestoneStateEntry(item, kind)?.done);
}

function createWorkflowEvents(item: ContentItem): CalendarEvent[] {
  const recommendedDates = getRecommendedMilestoneDates(item);
  return WORKFLOW_MILESTONE_KINDS.map((kind) => {
    const state = getMilestoneStateEntry(item, kind);
    const recommendedDate = new Date(recommendedDates[kind]);
    const effectiveDate = state?.dateOverride
      ? new Date(state.dateOverride)
      : new Date(recommendedDate);
    return {
      id: `${item.id}:${kind}`,
      item,
      kind,
      date: effectiveDate,
      recommendedDate,
      dateOverridden: Boolean(state?.dateOverride),
      status: getMilestoneStatus(item, kind),
      done: getMilestoneDone(item, kind),
    };
  });
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
    .map((item) => {
      const recommendedDate = new Date(item.publishDate);
      const effectiveDate = getMilestoneEffectiveDate(item, "publish");
      const override = item.milestoneState?.publish?.dateOverride;
      return {
        id: `${item.id}:publish`,
        item,
        kind: "publish" as const,
        date: effectiveDate,
        recommendedDate,
        dateOverridden: Boolean(override),
        status: getMilestoneStatus(item, "publish"),
        done: getMilestoneDone(item, "publish"),
      };
    });
}
