import type {
  TaskItem,
  TaskAssignee,
  ContentItem,
  MetricsSnapshot,
  PerformanceData,
} from "@/lib/types";

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function reviveMetrics(raw: MetricsSnapshot): MetricsSnapshot {
  return {
    ...raw,
    recordedAt: toDate(raw.recordedAt),
  };
}

function revivePerformance(raw: PerformanceData): PerformanceData {
  return {
    ...raw,
    snapshot24h: raw.snapshot24h ? reviveMetrics(raw.snapshot24h) : undefined,
    finalMetrics: raw.finalMetrics ? reviveMetrics(raw.finalMetrics) : undefined,
  };
}

function reviveAssignees(raw?: TaskAssignee[]): TaskAssignee[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((entry) => ({
      ...entry,
      addedAt: toDate(entry.addedAt),
    }))
    .filter((entry) => entry.userId && entry.roleId);
}

export function reviveContentItem(raw: ContentItem): ContentItem {
  return {
    ...raw,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    approvedAt: raw.approvedAt ? toDate(raw.approvedAt) : undefined,
    briefDeadline: toDate(raw.briefDeadline),
    productionDeadline: toDate(raw.productionDeadline),
    approvalDeadline: toDate(raw.approvalDeadline),
    publishDate: toDate(raw.publishDate),
    kpiReminderSentAt: raw.kpiReminderSentAt
      ? toDate(raw.kpiReminderSentAt)
      : undefined,
    kpiReminderSnoozedAt: raw.kpiReminderSnoozedAt
      ? toDate(raw.kpiReminderSnoozedAt)
      : undefined,
    publishedAt: raw.publishedAt ? toDate(raw.publishedAt) : undefined,
    performance: raw.performance ? revivePerformance(raw.performance) : undefined,
    approvalTrack: raw.approvalTrack?.map((r) => ({
      ...r,
      approvedAt: r.approvedAt ? toDate(r.approvedAt) : undefined,
    })),
    revisionHistory: raw.revisionHistory?.map((r) => ({
      ...r,
      date: toDate(r.date),
    })),
    milestoneState: raw.milestoneState
      ? Object.fromEntries(
          Object.entries(raw.milestoneState).map(([kind, entry]) => [
            kind,
            entry
              ? {
                  ...entry,
                  dateOverride: entry.dateOverride
                    ? toDate(entry.dateOverride)
                    : undefined,
                }
              : entry,
          ])
        )
      : undefined,
    assignees: reviveAssignees(raw.assignees),
  };
}

export function reviveContentItems(items: ContentItem[]): ContentItem[] {
  return items.map(reviveContentItem);
}

export function reviveTaskItem(raw: TaskItem): TaskItem {
  return {
    ...raw,
    due_at: raw.due_at ? toDate(raw.due_at) : null,
    created_at: toDate(raw.created_at),
    updated_at: toDate(raw.updated_at),
    payload: {
      ...(raw.payload ?? {}),
      assignees: reviveAssignees(raw.payload?.assignees as TaskAssignee[]),
    },
  };
}

export function reviveTaskItems(items: TaskItem[]): TaskItem[] {
  return items.map(reviveTaskItem);
}
